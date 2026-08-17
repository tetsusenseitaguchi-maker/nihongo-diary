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
import { nowInTZ, previousDay, todayInTZ, startOfWeek } from "@/lib/date-tz";
import { isNativeRequest } from "@/lib/native";
import { hasDictation } from "@/lib/dictation";
import { getDueSummary } from "@/lib/srs-server";
import { AudioIntroModal } from "@/components/AudioIntroModal";
import { WebPushBanner } from "@/components/WebPushBanner";
import { WeeklyGoalCard } from "@/components/WeeklyGoalCard";
import { DailyRecapOverlay } from "@/components/DailyRecapOverlay";

export const dynamic = "force-dynamic";

/**
 * Days written before the third hero card appears at all.
 *
 * Three, because the numbers it shows are only encouraging once there is
 * something in them. Measured on production: the median writer has written on
 * ONE day and 114 characters in total, and half of everyone who signed up has
 * never written at all. A band reading "1 day / 114 characters" is not a
 * record of progress, it is a receipt for how little has happened — aimed at
 * exactly the learner most likely to leave.
 *
 * Below the threshold nothing is drawn. No placeholder, no "0 days", no
 * "2 more to unlock": a target printed next to an empty number is the same
 * scolding by another route, and the flashcards card above already refuses to
 * render "0 today" for the same reason.
 */
const CUMULATIVE_MIN_DAYS = 3;

/**
 * Whose clock the weekly goal's week belongs to.
 *
 * ⚠️ Pinned, and it is the only thing in this codebase that is. Everything else
 * dates by the learner: diary_date is written with todayInTZ(getClientTZ()),
 * streak.ts takes todayStr from its caller, layout.tsx reads the user_tz
 * cookie, api/report/weekly uses profiles.timezone, and both push functions use
 * `now() at time zone tzn.name`. This one constant is a deliberate exception —
 * one week boundary for everyone rather than 923 of them.
 *
 * What it costs, measured: a diary written Sunday 23:00 in Los Angeles gets
 * diary_date 2026-08-16 while the Tokyo week already starts 2026-08-17, so it
 * lands in the previous week. Across all 2,149 entries that mismatch hits 6
 * (0.3%) — small today, and it grows with every learner west of Japan
 * (New York 119, Calcutta 66, Los Angeles 65, Tokyo 62).
 *
 * To revisit: change this line to the learner's timezone, which the page has
 * already resolved as `tz` below. Nothing else needs to move.
 */
const WEEK_TZ = "Asia/Tokyo";

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

  const [{ data: profile }, { data }, srs, weeklyGoal] = await Promise.all([
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
    // Fourth in the same Promise.all, so it costs a query but no round trip.
    // Its own table on purpose — never a column on profiles, whose select is
    // the one that takes the whole page down when a column goes missing.
    supabase
      .from("weekly_goals")
      .select("target_days")
      .eq("user_id", user.id)
      .maybeSingle(),
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

  /**
   * Everything the learner has ever written, in characters.
   *
   * Computed here rather than in computeStats on purpose. That function is
   * called by four pages and two of them — profile/page.tsx and
   * profile/[username]/page.tsx — hand it rows built from a `diary_date`-only
   * select, cast through `as DiaryRow`. original_text is undefined in those
   * callers, so a character count living inside computeStats would be NaN on
   * two pages to serve one. This page is the only caller that actually selects
   * the column, and the only one that shows the number.
   *
   * ⚠️ original_text, NEVER original_text_ruby. The ruby column is the same
   * prose wrapped in <ruby>漢字<rt>かんじ</rt></ruby> markup, and counting it
   * would report 774,642 characters where the learners actually wrote 159,151
   * — a 387% overstatement, measured across all 2,140 entries. original_text is
   * the raw textarea value and carries no markup at all: zero entries contain
   * a `<ruby>`, and zero contain any HTML tag.
   *
   * Code points, not `.length`: UTF-16 counts an emoji as two, and a learner
   * who ends a sentence with 🌸 has not written an extra character. Grapheme
   * clusters would be more exact still and are not worth an Intl.Segmenter here
   * — the text being counted is Japanese prose.
   *
   * Whitespace and zero-width characters are dropped. A line break is not a
   * character the learner wrote, and leaving them in would let blank lines pad
   * the figure — which matters for a number whose whole job is to be a total
   * that only ever grows. 1.66% of the corpus, so the honest number is barely
   * smaller; the point is that it cannot be gamed.
   *
   * No new query and no new bytes: `data` above already carries original_text
   * for every entry, and the heaviest account in production is 54 entries and
   * 16 KB.
   */
  const totalChars = entries.reduce(
    (n, e) => n + [...(e.original_text ?? "")].filter((c) => !/[\s​-‍﻿]/u.test(c)).length,
    0,
  );
  const showCumulative = stats.totalDays >= CUMULATIVE_MIN_DAYS;

  /**
   * Days written so far in the current week.
   *
   * diary_date, not created_at — the same basis as the streak, the cumulative
   * card, the calendar and the notifications. Counting by "the day you pressed
   * save" would close the backfill loophole (a 「昨日」 entry can add a day to a
   * week it was not written in) but would make this the FOURTH definition of a
   * day in the app, next to three streaks that already disagree. The loophole is
   * worth 13 entries out of 2,149 (0.6%), and it is a promise the learner made
   * to themselves; a fourth definition is what has actually cost this codebase.
   *
   * No new query: `entries` is already here, and only diary_date is read — not
   * a character of the text.
   *
   * A row is null-guarded rather than trusted: weekly_goals may not exist in
   * every environment, and a failed read must cost the card, not the page.
   */
  const weekStart = startOfWeek(todayInTZ(WEEK_TZ));
  const daysThisWeek = new Set(
    entries.filter((e) => e.diary_date >= weekStart).map((e) => e.diary_date),
  ).size;
  const weeklyTarget = (weeklyGoal?.data?.target_days as number | null | undefined) ?? null;


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

      {/* 「今日のあなた」. Every figure is one the cards below are about to show
          — passed down, never recomputed, so the overlay cannot disagree with
          the page it is covering. Costs no query and no fetch. It defers to the
          tour and shows at most once a day; see the component for both. */}
      <DailyRecapOverlay
        weeklyTarget={weeklyTarget}
        daysThisWeek={daysThisWeek}
        currentStreak={stats.currentStreak}
        totalChars={totalChars}
      />

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
          {/* ── What has piled up ────────────────────────────────────────
              The third card, full width under the two counts it belongs with:
              Total Diaries counts entries, This Month counts entries in a
              window, and this one counts the two things that only ever go up.

              Two figures in one card rather than two cards, because they are
              one idea — days and characters are the same pile measured twice —
              and because a fourth card would push the streak onto a third row.

              Absent below the threshold (see CUMULATIVE_MIN_DAYS), and when it
              is absent the grid is exactly the three-card layout it was before:
              two halves, then the streak across the bottom. Nothing reflows. */}
          {showCumulative && (
            <Card accent="apricot" className="col-span-2 p-4">
              <div className="grid grid-cols-2 divide-x divide-line">
                <div className="pr-4">
                  <p className="text-xs font-semibold text-muted">{t("dashboard.cumulative.daysLabel")}</p>
                  <p className="mt-2 font-serif text-3xl font-bold text-pine">{stats.totalDays}</p>
                </div>
                <div className="pl-4">
                  <p className="text-xs font-semibold text-muted">{t("dashboard.cumulative.charsLabel")}</p>
                  {/* Explicit locale: this renders on the server, whose own
                      locale is not the learner's and is not worth inheriting. */}
                  <p className="mt-2 font-serif text-3xl font-bold text-pine">{totalChars.toLocaleString("en-US")}</p>
                </div>
              </div>
              {/* Cumulative, never an average — the count of diaries behind the
                  two totals, so the numbers read as a pile rather than a rate. */}
              <p className="mt-2 text-xs text-muted">{t("dashboard.cumulative.daysSub", { n: stats.total })}</p>
            </Card>
          )}

          {/* ── The week, and the streak under it ────────────────────────
              This replaces the full-width streak StatCard rather than joining
              it: the grid keeps its three rows, and the streak keeps its place
              on the page at a smaller size.

              The swap is the point of the feature. A streak breaks the first
              day you miss; a week does not — miss Tuesday and Thursday still
              gets you there. Measured across 883 active user-weeks, 57.4% are a
              single day and only 28.3% reach three, so a number that assumes
              daily writing is, for most learners, a number that is broken.

              stats.currentStreak is read and drawn smaller. Nothing in
              lib/streak.ts or layout.tsx's inline copy is touched. */}
          <WeeklyGoalCard
            userId={user.id}
            initialTarget={weeklyTarget}
            daysThisWeek={daysThisWeek}
            currentStreak={stats.currentStreak}
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
            {/* min-w-0: this card holds `truncate` text, whose min-content is
                the whole line — a grid item defaults to min-width:auto, so
                that width became the track's floor and both cards in the row
                rendered wider than the screen (427px against 343px at 375px
                wide). The inner min-w-0 on the flex row cannot prevent it:
                min-width:0 permits shrinking inside a container that already
                has a width, and does nothing about the intrinsic width the
                item hands upward. The card itself has to be allowed to
                shrink; then truncate does its job. */}
            <Card className="min-w-0 p-5">
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
                        {/* ここは ruby を含む truncate。省略位置が熟語の直前に来ると、
                            base（漢字）が切られて rt（ふりがな）だけが省略記号の上に
                            残る。日本語学習アプリなので、読みだけが浮いた状態は
                            学習者に誤読を与える。文言を長くする / 表示件数を増やす
                            ときは 320px で必ず目視すること。

                            現在表示している4件はどの幅でもその位置に来ないため、
                            実際には発生していない（320px で省略されるのは4件目だが、
                            ルビが先頭の 今日 だけなので安全）。 */}
                        <span className="block truncate font-jp text-sm font-medium text-ink"><Furigana text={tmpl.starter} /></span>
                        <span className="block truncate text-xs text-muted">{tmpl.description}</span>
                      </span>
                      <Icon.arrow className="h-4 w-4 shrink-0 text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Feed card — min-w-0 for the same reason, though nothing in it
                is nowrap today. It shares the single track with the card
                above, so whichever of the two refuses to shrink sets the
                width of both. */}
            <Card accent="none" className="flex min-w-0 flex-col border-moss/20 bg-sage/30 p-5">
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
