import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTimezoneFromCookie, validateTZ } from "@/lib/tz-server";
import { todayInTZ } from "@/lib/date-tz";
import { pickSentence, markAnswer } from "@/lib/dictation";

export const runtime = "nodejs";

// POST { entryId: string, typed: string } → { ok: true, percent }
//
// Records what the learner heard, so that doing the same sentence again
// tomorrow has something to be better than.
//
// ── Why the score is recomputed here ────────────────────────────────────────
// The client marks the answer too, instantly and locally, and that is what the
// screen shows. This route does NOT take that number. It takes the characters
// the learner typed, reads the sentence out of their diary, and marks it again
// with the same pure function (lib/dictation.ts, imported and not modified).
//
// The two always agree — same function, same inputs — so nothing is gained by
// trusting the client, and something is lost: a stored percent that came off
// the wire is a percent anybody can choose. record_dictation_attempt is granted
// to service_role only, and this is the sole caller, which is what makes the
// stored history mean anything.
//
// ── What it never touches ───────────────────────────────────────────────────
// No audio, no /api/tts, no counter. Dictation is not metered — its cost is the
// playback, and a sentence that has been heard once replays from cache for
// nothing. The only allowance in this flow is the one new clip a day.

/** The diary itself caps at 500 characters, so an answer beyond that is not a
 *  slip of the keyboard. It also bounds the edit-distance matrix. */
const MAX_TYPED_CHARS = 500;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let entryId: unknown;
  let typed: unknown;
  try {
    ({ entryId, typed } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof entryId !== "string" || !entryId) {
    return NextResponse.json({ error: "Missing entryId" }, { status: 400 });
  }
  if (typeof typed !== "string") {
    return NextResponse.json({ error: "Missing typed" }, { status: 400 });
  }

  const answer = typed.trim();
  if (!answer) return NextResponse.json({ error: "Empty answer" }, { status: 400 });
  if (answer.length > MAX_TYPED_CHARS) {
    return NextResponse.json({ error: "Answer too long" }, { status: 413 });
  }

  // .eq("user_id") as well as the id, the same pair the exercise page uses: a
  // public diary being readable does not make its owner's practice history
  // writable. `timezone` comes along in the second query because the row this
  // writes is keyed by the learner's day, not the database's.
  const [{ data: entry }, { data: profile }] = await Promise.all([
    supabase
      .from("diary_entries")
      .select("natural_japanese")
      .eq("id", entryId)
      .eq("user_id", user.id)
      .single(),
    supabase.from("profiles").select("timezone").eq("id", user.id).single(),
  ]);

  const natural = (entry?.natural_japanese as string | null) ?? "";
  if (!natural) {
    return NextResponse.json({ error: "No sentence to mark" }, { status: 404 });
  }

  // The same call the exercise page makes on the same stored string, so the
  // sentence marked here is the sentence that was set. pickSentence is
  // deterministic — it always takes the middle usable sentence.
  const sentence = pickSentence(natural);
  if (!sentence) {
    return NextResponse.json({ error: "Sentence is not gradable" }, { status: 422 });
  }

  const mark = markAnswer(answer, sentence);

  // Cookie first (TimezoneSyncer sets it), then the profile column, both
  // validated. Only `timezone` is read here and no plan decision hangs on it,
  // so an unreadable profile degrades to the cookie and nothing else.
  let tz = await getTimezoneFromCookie();
  const dbTz = profile?.timezone as string | null | undefined;
  if (tz === "UTC" && dbTz) tz = validateTZ(dbTz);

  // Service role: record_dictation_attempt is granted to service_role alone
  // (supabase/add-dictation-attempts.sql ⑦), and dictation_attempts has no
  // insert or update policy, so this is the only way a row gets written.
  const admin = createAdminClient();
  const { error } = await admin.rpc("record_dictation_attempt", {
    p_user_id: user.id,
    p_diary_entry_id: entryId,
    p_date: todayInTZ(tz),
    p_percent: mark.percent,
    p_correct: mark.correct,
    p_total: mark.total,
    p_distance: mark.distance,
    // sentenceKana of the answer key. Stored so that tomorrow's comparison can
    // check it is still the same sentence — re-correcting a diary rewrites
    // natural_japanese, and pickSentence would then be marking something else.
    p_sentence_kana: mark.answerKana,
  });

  if (error) {
    // The exercise has already happened and the learner has already seen their
    // score. Losing the row costs them tomorrow's comparison, which is worth a
    // log and nothing more — this response is not rendered anywhere.
    console.error("[dictation] record_dictation_attempt failed:", error.message);
    return NextResponse.json({ error: "Could not record attempt" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, percent: mark.percent });
}
