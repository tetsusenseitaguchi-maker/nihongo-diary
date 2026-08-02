/**
 * What the 🔊 on the natural version should actually say.
 *
 * Pure functions only. No DB, no React, so this is callable from a client
 * component, a server component or a plain Node script — the same shape as
 * lib/dictation.ts, and for the same reason: the decision below is verified
 * against production data by a script that imports THIS function rather than
 * a second copy of the rule.
 *
 * ── The problem it solves ────────────────────────────────────────────────
 * The day's flow plays one sentence four times across two days: the natural
 * version on the correction result, the shadowing step, and dictation today
 * and again tomorrow. /api/tts keys its cache on the SSML, and a cache hit
 * costs no credit, so all four resolve to a single synthesis — but only if all
 * four send the SAME string.
 *
 * Three of them do: shadowing and both dictations send pickSentence(). The
 * correction result sent the whole natural version, which on any diary of more
 * than one sentence is a different key. Measured against the 300 most recent
 * production entries, 273 of them were multi-sentence, and on every one of
 * those a Free learner who pressed play on the correction result spent the
 * day's single allowance on a clip nothing downstream reuses — the shadowing
 * step then answered 429 and the day was over before they had read anything
 * aloud.
 *
 * ── The rule ─────────────────────────────────────────────────────────────
 * Free hears the one sentence the rest of the day is built on. That is not a
 * consolation prize: it is what the onboarding already promises in so many
 * words ("Free covers one new sentence a day", audioIntro.limit).
 *
 * Paid plans hear the whole thing, which is the part that is worth paying for
 * and the part one sentence cannot stand in for. They are unmetered, so the
 * second key costs them nothing.
 *
 * ── Why the paid path can still come back with one sentence ──────────────
 * /api/tts rejects anything over MAX_INPUT_CHARS or MAX_SSML_BYTES with a 413,
 * and 22 of those same 300 entries are over the line. Offering "play the whole
 * text" there would render a button that does nothing at all. Falling back to
 * the sentence keeps it working, and `whole` goes false with it so the label
 * follows — the caller must never label this by plan alone.
 */
import { pickSentence } from "@/lib/dictation";
import { rubyToSsml } from "@/lib/ruby-ssml";
import { MAX_INPUT_CHARS, MAX_SSML_BYTES } from "@/lib/audio-limits";
import type { Plan } from "@/lib/plans";

/**
 * Would /api/tts turn this text away on size?
 *
 * The same two guards the route applies, in the same order, against the same
 * constants — see audio-limits.ts for why they are shared rather than copied.
 *
 * TextEncoder rather than Buffer.byteLength: this runs in the browser as well
 * as on the server, and both count UTF-8 bytes identically.
 */
export function exceedsTtsLimits(text: string): boolean {
  const raw = text.trim();
  if (raw.length > MAX_INPUT_CHARS) return true;
  return new TextEncoder().encode(rubyToSsml(raw)).length > MAX_SSML_BYTES;
}

export type NaturalAudioChoice = {
  /** The exact string to hand <PlayButton/>, and therefore /api/tts. */
  text: string;
  /**
   * Is `text` the whole natural version rather than one sentence out of it?
   *
   * Derived by comparing the two, NOT from the plan. A one-sentence diary is
   * its own whole text, so a Free learner reading one gets `true` and the
   * honest label with it; a paid learner whose diary is too long for the API
   * gets `false`. Label and upgrade hint both follow this, never the plan.
   */
  whole: boolean;
};

/**
 * The string the correction result's 🔊 should send, and whether it is the lot.
 *
 * `natural` is the ruby-annotated natural version, exactly as stored in
 * diary_entries.natural_japanese (correction-payload.ts:338 writes it
 * verbatim), so the sentence picked here is character-for-character the one
 * the dictation page will pick tomorrow.
 *
 * Falls back to the whole text when nothing in it is gradable — there is no
 * dictation for those diaries either, so there is nothing left to agree with,
 * and one synthesis still covers the day.
 */
export function naturalAudioChoice(natural: string, plan: Plan): NaturalAudioChoice {
  const full = natural.trim();
  const sentence = (pickSentence(natural) ?? natural).trim();
  const text = plan === "free" || exceedsTtsLimits(full) ? sentence : full;
  return { text, whole: text === full };
}
