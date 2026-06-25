import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, LinkButton } from "@/components/ui";
import { Icon } from "@/components/icons";
import { DiaryHistoryList } from "@/components/DiaryHistoryList";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  diary_date: string;
  title: string | null;
  original_text: string;
  level: string | null;
  correction_style: string | null;
  image_path: string | null;
  audio_path: string | null;
}

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("diary_entries")
    .select("id, diary_date, title, original_text, level, correction_style, image_path, audio_path")
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
        <DiaryHistoryList initialEntries={entries} />
      )}
    </div>
  );
}
