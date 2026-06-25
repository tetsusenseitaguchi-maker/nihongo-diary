import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, LinkButton } from "@/components/ui";
import { Icon, renderIcon } from "@/components/icons";
import { MiniCalendar } from "@/components/MiniCalendar";
import { Furigana } from "@/components/Furigana";
import { templates } from "@/lib/mock-data";
import { computeStats, type DiaryRow } from "@/lib/diary";
import { monthLabel, formatShort } from "@/lib/dates";
import { getServerT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, username, avatar_url")
      .eq("id", user.id)
      .single(),
    supabase
      .from("diary_entries")
      .select("id, diary_date, original_text, corrected_japanese, english_explanation, level, correction_style")
      .eq("user_id", user.id)
      .order("diary_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const t = await getServerT();

  const entries = (data ?? []) as DiaryRow[];
  const stats = computeStats(entries);

  const displayName = profile?.display_name || profile?.username || "Learner";
  const avatarUrl = profile?.avatar_url || "";

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const recent = entries.slice(0, 4);

  return (
    <div className="space-y-5">
      {/* Hero + stats */}
      <div className="grid gap-5 lg:grid-cols-12">
        <Card className="relative overflow-hidden p-0 lg:col-span-7">
          <div className="flex h-full flex-col justify-between gap-6 bg-sage/60 p-7 sm:flex-row sm:items-center">
            <div className="max-w-xs">
              <p className="font-jp text-sm font-semibold text-moss-600">おかえり、{displayName}さん 🌸</p>
              <h1 className="mt-1 font-serif text-3xl font-bold leading-[1.15] text-pine">
                {t("dashboard.tagline")}
              </h1>
              <p className="mt-3 text-sm text-ink/70">
                <Furigana text="小(ちい)さな一歩(いっぽ)を、毎日(まいにち)。" />
              </p>
              <LinkButton href="/write" className="mt-5">
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
            value={`${stats.currentStreak} 日`}
            sub={t("dashboard.stats.longestLabel", { n: stats.longestStreak })}
            iconTint="apricot"
            className="col-span-2"
          />
        </div>
      </div>

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
                      <p className="line-clamp-3 text-sm leading-relaxed text-ink/75">{stats.today.english_explanation}</p>
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
            <Card className="flex flex-col border-moss/20 bg-sage/30 p-5">
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

          <Card className="gloss-green relative overflow-hidden p-0">
            <div className="relative h-44">
              <Image src="/obie.png" alt="Obie" fill className="object-cover" sizes="(min-width: 1024px) 400px, 100vw" priority />
              <div className="absolute right-3 top-3 max-w-[60%] rounded-2xl rounded-tr-sm bg-paper/95 px-3 py-2 shadow-card">
                <p className="font-jp text-xs font-semibold leading-snug text-ink">
                  <Furigana text="小(ちい)さな一歩(いっぽ)を、毎日(まいにち)。" />
                  <span className="mt-0.5 block text-[11px] font-normal text-muted">{t("dashboard.smallStep")}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="font-serif text-base font-bold text-cream">{t("dashboard.obieTip")}</h2>
              <span className="text-xs font-semibold text-cream/70">🐾</span>
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
    <Card className={`p-4 ${className}`}>
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
