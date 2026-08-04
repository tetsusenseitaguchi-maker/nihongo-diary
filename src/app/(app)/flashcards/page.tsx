import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTimezoneFromCookie, validateTZ } from "@/lib/tz-server";
import { getDueSummary } from "@/lib/srs-server";
import { FlashcardSession } from "@/components/FlashcardSession";

/**
 * /flashcards — 単語の間隔反復。
 *
 * 今日の分をサーバーで用意してから渡す。到着してから fetch すると、開いた瞬間に
 * 空のカードが一枚映って差し替わる。枚数はどのみち上限で決まっていて後から
 * 増えないので、待つ理由がない。
 *
 * force-dynamic は getTimezoneFromCookie() が cookies() を読むため。/upgrade と
 * /welcome-plans が同じ理由で付けている。
 */
export const dynamic = "force-dynamic";

export default async function FlashcardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let tz = await getTimezoneFromCookie();
  if (tz === "UTC") {
    const { data: prof } = await supabase
      .from("profiles")
      .select("timezone")
      .eq("id", user.id)
      .single();
    const dbTz = prof?.timezone as string | null | undefined;
    if (dbTz) tz = validateTZ(dbTz);
  }

  const summary = await getDueSummary(supabase, user.id, tz);

  return <FlashcardSession initial={summary} />;
}
