import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { CorrectionResult } from "@/components/CorrectionResult";
import { diaryEntries } from "@/lib/mock-data";
import { formatLong } from "@/lib/dates";
import { getServerT } from "@/lib/i18n-server";

export function generateStaticParams() {
  return diaryEntries.map((e) => ({ id: e.id }));
}

export default async function DiaryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = diaryEntries.find((e) => e.id === id);
  if (!entry) notFound();

  const t = await getServerT();

  return (
    <div className="space-y-6">
      <Link
        href="/history"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-moss-600 hover:text-pine"
      >
        <Icon.arrow className="h-4 w-4 rotate-180" /> {t("diary.backToHistory")}
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-pine">
          {entry.title}
        </h1>
        <Badge tone="moss">{entry.level}</Badge>
      </div>
      <p className="-mt-3 text-sm text-muted">{formatLong(entry.date)}</p>

      <CorrectionResult correction={entry.correction} />
    </div>
  );
}
