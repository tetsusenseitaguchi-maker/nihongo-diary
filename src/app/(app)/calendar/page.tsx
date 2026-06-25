import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, LinkButton } from "@/components/ui";
import { Icon } from "@/components/icons";
import { ObiePhoto } from "@/components/ObiePhoto";
import { MiniCalendar } from "@/components/MiniCalendar";
import { computeStats, type DiaryRow } from "@/lib/diary";
import { monthLabel, formatShort } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("diary_entries")
    .select("id, diary_date, original_text, corrected_japanese, english_explanation, level, correction_style")
    .eq("user_id", user.id)
    .order("diary_date", { ascending: false });

  const entries = (data ?? []) as DiaryRow[];
  const stats = computeStats(entries);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  const thisMonthEntries = entries.filter((e) => {
    const d = new Date(e.diary_date + "T00:00:00");
    return d.getFullYear() === year && d.getMonth() === month;
  });

  // day-of-month -> diary detail link (most recent entry for that day)
  const dayLinks: Record<number, string> = {};
  for (const e of thisMonthEntries) {
    const day = new Date(e.diary_date + "T00:00:00").getDate();
    if (!dayLinks[day]) dayLinks[day] = `/diary/${e.id}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-pine">カレンダー</h1>
        <p className="mt-1 text-ink/70"><span className="font-medium">Calendar</span> · 続けた日がひと目でわかります</p>
      </div>

      {/* Stat strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4 p-5">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-apricot/15 text-apricot">
            <Icon.flame className="h-6 w-6" />
          </span>
          <div>
            <p className="font-serif text-2xl font-bold text-pine">{stats.currentStreak} 日</p>
            <p className="text-sm text-muted">連続記録</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-mint text-pine">
            <Icon.check className="h-6 w-6" />
          </span>
          <div>
            <p className="font-serif text-2xl font-bold text-pine">{stats.longestStreak} 日</p>
            <p className="text-sm text-muted">最長記録</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-sand text-ink/70">
            <Icon.book className="h-6 w-6" />
          </span>
          <div>
            <p className="font-serif text-2xl font-bold text-pine">{stats.thisMonthCount}</p>
            <p className="text-sm text-muted">今月の日記</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Month grid — min-w-0 wrapper prevents grid item from overflowing on mobile */}
        <div className="min-w-0 overflow-hidden">
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-lg font-bold text-pine">{monthLabel(year, month)}</h2>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-moss" /> 書いた日</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded ring-2 ring-moss ring-inset" /> 今日</span>
              </div>
            </div>
            <MiniCalendar year={year} month={month} activeDays={stats.activeDaysThisMonth} today={today} dayLinks={dayLinks} />
            <p className="mt-3 text-xs text-muted">書いた日（緑）をタップすると、その日の日記がひらきます。</p>
          </Card>
        </div>

        {/* Entries this month — min-w-0 prevents the entries list from overflowing on mobile */}
        <div className="min-w-0 overflow-hidden">
          <Card className="p-6">
          <h2 className="mb-4 font-serif text-lg font-bold text-pine">今月の日記</h2>
          {thisMonthEntries.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="text-2xl">🌱</span>
              <p className="text-sm text-ink/70">今月はまだ日記がありません。</p>
              <LinkButton href="/write" size="sm">
                <Icon.pen className="h-4 w-4" /> 日記を書く
              </LinkButton>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {thisMonthEntries.map((entry) => (
                <li key={entry.id}>
                  <Link href={`/diary/${entry.id}`} className="group flex items-center gap-3 py-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-mint text-xs font-bold text-pine">
                      {formatShort(entry.diary_date)}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-jp text-sm text-ink group-hover:text-pine">{entry.original_text}</span>
                    {entry.level && <Badge tone="sand">{entry.level}</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 flex items-start gap-3 rounded-2xl bg-sand/40 p-4">
            <ObiePhoto size={40} />
            <p className="text-sm leading-relaxed text-ink/80">
              {stats.currentStreak > 0
                ? `今 ${stats.currentStreak} 日連続。最長記録は ${stats.longestStreak} 日です。この調子！`
                : "今日からまた一歩。短くても大丈夫です🌸"}
            </p>
          </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
