import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, LinkButton } from "@/components/ui";
import { Icon, renderIcon } from "@/components/icons";
import { MiniCalendar } from "@/components/MiniCalendar";
import { Furigana, NoRuby } from "@/components/Furigana";
import { templates } from "@/lib/mock-data";
import { computeStats, type DiaryRow } from "@/lib/diary";
import { daysToNextMilestone } from "@/lib/streak";
import { monthLabel, formatShort } from "@/lib/dates";
import { getServerT } from "@/lib/i18n-server";
import { getTimezoneFromCookie } from "@/lib/tz-server";
import { nowInTZ, previousDay } from "@/lib/date-tz";
import { isNativeRequest } from "@/lib/native";
import { hasDictation } from "@/lib/dictation";
import { getDueSummary } from "@/lib/srs-server";
import { AudioIntroModal } from "@/components/AudioIntroModal";
import { WebPushBanner } from "@/components/WebPushBanner";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // getDueSummary needs the learner's clock, and it is read before the queries
  // below so it can join them in the same Promise.all rather than adding a
  // round trip after them.
  const tz = await getTimezoneFromCookie();

  const [{ data: profile }, { data }, srs] = await Promise.all([
    supabase
      .from("profiles")
      // ⚠️ Do not add plan/timezone here for the flashcards card. One absent
      // column errors the whole query, profile comes back null, and the hero
      // loses its name — the shape of the incident tts/route.ts:187 documents.
      // getDueSummary runs its own small profiles read, so a failure there
      // costs a card rather than the page.
      .select("display_name, username, avatar_url")
      .eq("id", user.id)
      .single(),
    supabase
      .from("diary_entries")
      // natural_japanese is appended, never in place of anything: one absent
      // column errors the whole query, and that is how every user once became
      // Free. It feeds hasDictation() for the audio announcement's "try it".
      .select(
        "id, diary_date, original_text, corrected_japanese, english_explanation, level, correction_style, natural_japanese",
      )
      .eq("user_id", user.id)
      .order("diary_date", { ascending: false })
      .order("created_at", { ascending: false }),
    // Third in the same Promise.all, so its own parallel reads overlap the two
    // above and the page waits no longer than it did. Never throws: a missing
    // table or a failed read comes back as zero cards and the block below
    // simply does not render.
    getDueSummary(supabase, user.id, tz),
  ]);

  const t = await getServerT();

  // Read off `data` rather than `entries`: DiaryRow does not carry
  // natural_japanese, and widening that type would reach every other consumer
  // of computeStats for the sake of one id. The most recent entry with a
  // sentence worth dictating; null when the learner has none, in which case the
  // announcement points at /write instead of at an exercise it cannot set.
  const dictationDiaryId =
    ((data ?? []) as { id: string; natural_japanese: string | null }[]).find((row) =>
      hasDictation(row.natural_japanese),
    )?.id ?? null;
  const isNative = await isNativeRequest();

  const entries = (data ?? []) as DiaryRow[];
  const { year, month, day: today, dateStr: todayStr } = nowInTZ(tz);
  const stats = computeStats(entries, todayStr);
  // Same rungs as the badge on the correction result and as the sidebar.
  const nextMilestone = daysToNextMilestone(stats.currentStreak);

  const displayName = profile?.display_name || profile?.username || "Learner";
  const avatarUrl = profile?.avatar_url || "";
  const recent = entries.slice(0, 4);

  // ── Yesterday's sentence, offered again today ────────────────────────────
  // The other half of the two-day loop. The push notification does the same job
  // on iOS, but push only exists inside the Capacitor shell (PushRegistrar
  // returns early in a browser), so for everyone on the web THIS is the way
  // back in — which is why it is built first and placed where it cannot be
  // missed.
  //
  // `data` rather than `entries`, for the same reason the announcement above
  // reads it: DiaryRow does not carry natural_japanese.
  //
  // Newest first is already the order of the query (diary_date desc,
  // created_at desc), so find() takes the last thing they wrote yesterday.
  // Deliberately ONE, even when a paid learner wrote several: a column of
  // review cards turns the dashboard into a homework list, and the day this is
  // shaping is one sentence long.
  const yesterdayStr = previousDay(todayStr);
  const yesterdayDiary =
    ((data ?? []) as { id: string; diary_date: string; natural_japanese: string | null }[]).find(
      (row) => row.diary_date === yesterdayStr && hasDictation(row.natural_japanese),
    ) ?? null;

  // Only asked when there is something to ask about. Every attempt at this one
  // diary is a handful of rows at most — one per day it was practised — so this
  // reads them all rather than asking twice.
  let reviewDiaryId: string | null = null;
  let reviewIsSecondTime = false;
  if (yesterdayDiary) {
    const { data: attempts } = await supabase
      .from("dictation_attempts")
      .select("usage_date")
      .eq("user_id", user.id)
      .eq("diary_entry_id", yesterdayDiary.id);

    const dates = (attempts ?? []).map((a) => a.usage_date as string);
    // Done today already — the loop is closed and the card has nothing to add.
    if (!dates.includes(todayStr)) {
      reviewDiaryId = yesterdayDiary.id;
      // Whether they actually did it yesterday decides the wording, not whether
      // the card appears. Someone who wrote but never dictated is exactly who
      // this should reach; telling them to do it "again" would just be wrong.
      reviewIsSecondTime = dates.length > 0;
    }
  }

  return (
    <div className="space-y-5">
      {/* One-time, and it holds its own screen back until the tour has been
          seen — see the comment in AudioIntroModal. */}
      <AudioIntroModal dictationDiaryId={dictationDiaryId} isNative={isNative} />

      {/* Renders nothing unless this browser can subscribe, has not already,
          has not closed it, and belongs to someone who has written or finished
          the tour — so it costs no space on a first visit, when the tour is
          already asking for attention. hasWritten is entries.length off the
          query above; no select is widened for it. */}
      <WebPushBanner hasWritten={entries.length > 0} />

      {/* Hero + stats */}
      <div className="grid gap-5 lg:grid-cols-12">
        <Card accent="none" className="relative overflow-hidden p-0 lg:col-span-7">
          <div className="flex h-full flex-col justify-between gap-6 bg-sage/60 p-7 sm:flex-row sm:items-center">
            <div className="max-w-xs">
              <p className="font-jp text-sm font-semibold text-moss-600">おかえり、{displayName}さん 🌸</p>
              <h1 className="mt-1 font-serif text-3xl font-bold leading-[1.15] text-pine">
                {t("dashboard.tagline")}
              </h1>
              <p className="mt-3 text-sm text-ink/70">
                <Furigana text="小(ちい)さな一歩(いっぽ)を、毎日(まいにち)。" />
              </p>
              {/* The streak, in the hero — the same number the stat card below
                  has always carried, moved to where the eye lands first and to
                  where it is still visible on a phone (the sidebar that used to
                  be its home is hidden below lg, which is every iOS learner).
                  stats is already computed, so this costs no query.

                  Nothing is drawn at zero: a 0 next to a flame is a scolding,
                  and the learner who most needs the CTA below is exactly the
                  one it would be scolding. */}
              {stats.currentStreak > 0 && (
                <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-[17px] font-bold text-pine">
                    🔥{" "}
                    {stats.currentStreak === 1
                      ? t("streak.dayOne")
                      : t("streak.days", { n: stats.currentStreak })}
                  </span>
                  {nextMilestone && (
                    <span className="text-xs text-ink/65">
                      {t("streak.toNext", { n: nextMilestone.remaining, m: nextMilestone.next })}
                    </span>
                  )}
                </p>
              )}
              {/* data-tour: the tour spotlights this CTA. Three separate
                  a[href="/write"] elements live on this page, so the anchor
                  says which one is meant. */}
              <LinkButton href="/write" className="mt-5" data-tour="write-cta">
                <Icon.pen className="h-4 w-4" /> {t("dashboard.writeCTA")}
              </LinkButton>
            </div>
            <Link
              href="/profile-setup"
              className="group relative h-36 w-36 shrink-0 self-center overflow-hidden rounded-2xl bg-paper/70 ring-1 ring-line sm:h-44 sm:w-44"
              aria-label={t("dashboard.changePhoto")}
            >
              {avatarUrl ? (
                <Image src={avatarUrl} alt={displayName} fill className="object-cover" sizes="(min-width: 640px) 176px, 144px" />
              ) : (
                <Image src="/obie.png" alt="Obie" fill className="object-cover opacity-90" sizes="(min-width: 640px) 176px, 144px" />
              )}
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-pine/70 py-1.5 text-[11px] font-semibold text-cream opacity-0 transition-opacity group-hover:opacity-100">
                <Icon.camera className="h-3.5 w-3.5" /> {t("dashboard.changePhoto")}
              </span>
            </Link>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4 lg:col-span-5">
          <StatCard
            icon="book"
            label={t("dashboard.stats.total")}
            value={stats.total}
            sub={<Furigana text="これまで合計(ごうけい)" />}
          />
          <StatCard
            icon="calendar"
            label={t("dashboard.stats.thisMonth")}
            value={stats.thisMonthCount}
            sub={`${stats.monthDelta >= 0 ? "+" : ""}${stats.monthDelta}`}
            subAccent
          />
          <StatCard
            icon="flame"
            label={t("dashboard.stats.streak")}
            value={t("streak.dayCount", { n: stats.currentStreak })}
            sub={t("dashboard.stats.longestLabel", { n: stats.longestStreak })}
            iconTint="apricot"
            className="col-span-2"
          />
        </div>
      </div>

      {/* ── Yesterday's sentence ──────────────────────────────────────────
          Directly under the hero and across the full width, because it is the
          one thing on this page that expires: tomorrow the sentence is a day
          older and the spacing this is built on has gone. Absent on most
          visits, so it costs the usual layout nothing. */}
      {reviewDiaryId && (
        <Card accent="none" className="border-moss/20 bg-mint/30 p-5">
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-paper text-pine">
              <Icon.speaker className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-lg font-bold text-pine">
                {t("dashboard.review.title")}
              </h2>
              <p className="mt-0.5 text-sm text-ink/70">
                {reviewIsSecondTime
                  ? t("dashboard.review.bodyAgain")
                  : t("dashboard.review.bodyFirst")}
              </p>
              {/* Only when today is still blank. The loop is dictation first,
                  then today's diary, and naming the next step is most of what
                  makes it a loop rather than two features. A quiet link, not a
                  second button — the hero already has the loud one. */}
              {!stats.today && (
                <Link
                  href="/write"
                  className="mt-1 inline-block text-xs font-semibold text-moss-600 hover:text-pine"
                >
                  {t("dashboard.review.thenWrite")}
                </Link>
              )}
            </div>
            <LinkButton href={`/dictation/${reviewDiaryId}`} size="sm" className="shrink-0">
              <Icon.arrow className="h-4 w-4" /> {t("dashboard.review.cta")}
            </LinkButton>
          </div>
        </Card>
      )}

      {/* ── Today's flashcards ────────────────────────────────────────────
          Under the sentence above, not over it: that one expires tonight and
          this one does not — an unreviewed card keeps its past due_on and
          comes back tomorrow at the front of the queue.

          Drawn only when there is something to do. A card reading "0 today"
          would be the same scolding the streak refuses to print next to a
          flame, aimed at the learner who has just finished. srs.count is
          already capped by the daily limit, so the number here is the length
          of the session that /flashcards will actually run — both come from
          getDueSummary, which is why they cannot disagree. */}
      {srs.count > 0 && (
        <Card accent="none" className="border-moss/20 bg-mint/30 p-5">
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-paper text-pine">
              <Icon.book className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-lg font-bold text-pine">
                {t("dashboard.flashcards.title")}
              </h2>
              <p className="mt-0.5 text-sm text-ink/70">
                {t("dashboard.flashcards.body", { n: srs.count })}
              </p>
            </div>
            <LinkButton href="/flashcards" size="sm" className="shrink-0">
              <Icon.arrow className="h-4 w-4" /> {t("dashboard.review.cta")}
            </LinkButton>
          </div>
        </Card>
      )}

      {/* Main + rail */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="min-w-0 space-y-5 lg:col-span-7">
          <div className="grid gap-5 md:grid-cols-2">
            {/* Today's diary */}
            <Card className="flex flex-col p-5">
              <h2 className="font-serif text-lg font-bold text-pine">{t("dashboard.todayDiary")}</h2>
              {stats.today ? (
                <>
                  <div className="mt-3 flex gap-2 text-xs">
                    {stats.today.level && (
                      <span className="rounded-full bg-mint px-2.5 py-1 font-semibold text-pine">{stats.today.level}</span>
                    )}
                    {stats.today.correction_style && (
                      <span className="rounded-full bg-sand px-2.5 py-1 font-semibold text-ink/70">{stats.today.correction_style}</span>
                    )}
                  </div>
                  <div className="genkou-soft mt-3 flex-1 rounded-xl border border-line p-3">
                    <p className="font-jp text-sm leading-relaxed text-ink line-clamp-4">{stats.today.original_text}</p>
                  </div>
                  <Link href={`/diary/${stats.today.id}`} className="mt-3 text-right text-sm font-semibold text-moss-600 hover:text-pine">
                    {t("dashboard.seeCorrection")}
                  </Link>
                </>
              ) : (
                <div className="mt-3 flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line py-8 text-center">
                  <span className="text-2xl">🌸</span>
                  <p className="text-sm text-ink/70">
                    <Furigana text="今日(きょう)の日記(にっき)はまだです。" />
                    <br />
                    <span className="text-muted">{t("dashboard.noEntry")}</span>
                  </p>
                  <LinkButton href="/write" size="sm">
                    <Icon.pen className="h-4 w-4" /> {t("dashboard.writeCTA")}
                  </LinkButton>
                </div>
              )}
            </Card>

            {/* AI feedback */}
            <Card className="flex flex-col bg-mint/30 p-5">
              <h2 className="flex items-center gap-1.5 font-serif text-lg font-bold text-pine">
                <Icon.sparkle className="h-4 w-4 text-moss" /> {t("dashboard.aiFeedback")}
              </h2>
              {stats.today?.corrected_japanese ? (
                <>
                  <div className="mt-3 rounded-xl bg-paper p-3">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-moss-600">
                      {t("dashboard.correctedLabel")} · <Furigana text="直(なお)した日本語(にほんご)" />
                    </p>
                    <p className="font-jp text-sm leading-relaxed text-ink"><Furigana text={stats.today.corrected_japanese} /></p>
                  </div>
                  {stats.today.english_explanation && (
                    <div className="mt-3">
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-moss-600">{t("dashboard.explanationLabel")}</p>
                      {/* Read straight off the diary row, so it never becomes a
                          Correction and the PlainText brand never sees it. Same
                          column as correction.explanation, and stored rows can
                          carry <ruby> the prompts no longer allow. */}
                      <p className="line-clamp-3 text-sm leading-relaxed text-ink/75"><NoRuby text={stats.today.english_explanation} /></p>
                    </div>
                  )}
                  <Link href={`/diary/${stats.today.id}`} className="mt-auto pt-3 text-right text-sm font-semibold text-moss-600 hover:text-pine">
                    {t("dashboard.seeDetails")}
                  </Link>
                </>
              ) : (
                <p className="mt-3 flex flex-1 items-center justify-center text-center text-sm text-ink/60">
                  {t("dashboard.emptyFeedback")}
                </p>
              )}
            </Card>
          </div>

          {/* Templates + Feed */}
          <div className="grid gap-5 md:grid-cols-2">
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-serif text-lg font-bold text-pine">{t("dashboard.templates")}</h2>
                <Link href="/support" className="text-xs font-semibold text-moss-600 hover:text-pine">{t("common.seeAll")}</Link>
              </div>
              <ul className="space-y-1">
                {templates.slice(0, 4).map((tmpl) => (
                  <li key={tmpl.id}>
                    <Link href="/write" className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-mint/50">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-mint text-pine">#</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-jp text-sm font-medium text-ink"><Furigana text={tmpl.starter} /></span>
                        <span className="block truncate text-xs text-muted">{tmpl.description}</span>
                      </span>
                      <Icon.arrow className="h-4 w-4 shrink-0 text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Feed card */}
            <Card accent="none" className="flex flex-col border-moss/20 bg-sage/30 p-5">
              <div className="mb-3">
                <span className="text-2xl">🌱</span>
                <h2 className="mt-2 font-serif text-lg font-bold text-pine">{t("dashboard.feedSection")}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">
                  <span className="font-jp"><Furigana text="他(ほか)の学習者(がくしゃ)の日記(にっき)を読(よ)んで、つながろう。" /></span>
                  <span className="mt-1 block text-muted">{t("dashboard.feedDesc")}</span>
                </p>
              </div>
              <div className="mt-auto">
                <Link
                  href="/feed"
                  className="flex items-center justify-center gap-2 rounded-full border border-moss/40 bg-paper px-4 py-2.5 text-sm font-semibold text-pine transition-colors hover:border-moss hover:bg-mint/50"
                >
                  {t("dashboard.feedButton")} <Icon.arrow className="h-4 w-4" />
                </Link>
              </div>
            </Card>
          </div>
        </div>

        {/* Right rail */}
        <div className="min-w-0 space-y-5 lg:col-span-5">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-pine">{t("dashboard.calendar")}</h2>
              <span className="text-sm font-medium text-muted">{monthLabel(year, month)}</span>
            </div>
            <MiniCalendar year={year} month={month} activeDays={stats.activeDaysThisMonth} today={today} />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
              <span className="flex items-center gap-1.5 text-sm font-medium text-ink/80">
                <Icon.flame className="h-4 w-4 text-apricot" /> {stats.currentStreak} <Furigana text="日(にち)" />
              </span>
              <Link href="/calendar" className="text-sm font-semibold text-moss-600 hover:text-pine">{t("dashboard.seeCalendar")}</Link>
            </div>
          </Card>

          {/* Recent diaries */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-pine">{t("dashboard.recentDiaries")}</h2>
              <Link href="/history" className="text-xs font-semibold text-moss-600 hover:text-pine">{t("common.seeAll")}</Link>
            </div>
            {recent.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">
                <Furigana text="まだ日記(にっき)がありません。" /><br />{t("dashboard.noRecent")}
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {recent.map((e) => (
                  <li key={e.id}>
                    <Link href={`/diary/${e.id}`} className="group flex items-center gap-3 py-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint text-[11px] font-bold text-pine">
                        {formatShort(e.diary_date)}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-jp text-sm text-ink group-hover:text-pine">{e.original_text}</span>
                      {e.level && <span className="shrink-0 rounded-full bg-sand px-2 py-0.5 text-xs font-semibold text-ink/70">{e.level}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  subAccent,
  iconTint = "moss",
  className = "",
}: {
  icon: string;
  label: string;
  value: string | number;
  sub: React.ReactNode;
  subAccent?: boolean;
  iconTint?: "moss" | "apricot";
  className?: string;
}) {
  return (
    <Card accent={iconTint === "apricot" ? "apricot" : "pine"} className={`p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-muted">{label}</p>
        <span
          className={`grid h-8 w-8 place-items-center rounded-full ${
            iconTint === "apricot" ? "bg-apricot/15 text-apricot" : "bg-mint text-moss-600"
          }`}
        >
          {renderIcon(icon, "h-4 w-4")}
        </span>
      </div>
      <p className="mt-2 font-serif text-3xl font-bold text-pine">{value}</p>
      <p className={`mt-0.5 text-xs ${subAccent ? "font-semibold text-moss-600" : "text-muted"}`}>{sub}</p>
    </Card>
  );
}
