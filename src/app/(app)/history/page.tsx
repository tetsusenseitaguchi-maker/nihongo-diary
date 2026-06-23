import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, LinkButton } from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatLong } from "@/lib/dates";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  diary_date: string;
  original_text: string;
  level: string | null;
  correction_style: string | null;
}

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("diary_entries")
    .select("id, diary_date, original_text, level, correction_style")
    .eq("user_id", user.id)
    .order("diary_date", { ascending: false })
    .order("created_at", { ascending: false });

  const entries = (data ?? []) as Row[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-pine">
            過去の日記
          </h1>
          <p className="mt-1 text-ink/70">
            <span className="font-medium">History</span> ·{" "}
            {entries.length > 0
              ? `これまで ${entries.length} 件の日記`
              : "まだ日記はありません"}
          </p>
        </div>
        <LinkButton href="/write">
          <Icon.pen className="h-4 w-4" /> 日記を書く
        </LinkButton>
      </div>

      {entries.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="text-3xl">🌱</span>
          <p className="font-serif text-lg font-bold text-pine">
            最初の一歩を書いてみましょう
          </p>
          <p className="max-w-sm text-sm text-ink/70">
            一文だけでも大丈夫。書いた日記はここに残って、あとから見返せます。
          </p>
          <LinkButton href="/write" className="mt-2">
            <Icon.pen className="h-4 w-4" /> 日記を書く
          </LinkButton>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Link key={entry.id} href={`/diary/${entry.id}`}>
              <Card className="group flex items-center gap-5 p-5 transition-shadow hover:shadow-lift">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-mint">
                  <span className="font-jp text-xl font-bold text-pine">
                    {new Date(entry.diary_date + "T00:00:00").getDate()}
                  </span>
                  <span className="text-[10px] font-semibold uppercase text-muted">
                    {new Date(entry.diary_date + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 truncate font-jp text-[15px] text-ink group-hover:text-pine">
                    {entry.original_text}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted">{formatLong(entry.diary_date)}</span>
                    {entry.level && <Badge tone="sand">{entry.level}</Badge>}
                    {entry.correction_style && <Badge tone="moss">{entry.correction_style}</Badge>}
                  </div>
                </div>
                <Icon.arrow className="h-5 w-5 shrink-0 text-moss-600 transition-transform group-hover:translate-x-1" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
