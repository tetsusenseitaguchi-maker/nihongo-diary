"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { DeleteDiaryButton } from "@/components/DeleteDiaryButton";
import { formatLong } from "@/lib/dates";
import type { ReactNode } from "react";

function AttachmentDot({ icon }: { icon: ReactNode }) {
  return (
    <span className="grid h-4 w-4 place-items-center rounded-full bg-mint text-pine">
      {icon}
    </span>
  );
}

interface Entry {
  id: string;
  diary_date: string;
  original_text: string;
  level: string | null;
  correction_style: string | null;
  image_path: string | null;
  audio_path: string | null;
}

export function DiaryHistoryList({ initialEntries }: { initialEntries: Entry[] }) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);

  if (entries.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">日記がありません。</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <Card key={entry.id} className="flex items-center gap-5 p-5 transition-shadow hover:shadow-lift">
          {/* Clickable area → diary detail */}
          <Link href={`/diary/${entry.id}`} className="group flex min-w-0 flex-1 items-center gap-5">
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
                {entry.image_path && <AttachmentDot icon={<Icon.camera className="h-2.5 w-2.5" />} />}
                {entry.audio_path && <AttachmentDot icon={<Icon.mic className="h-2.5 w-2.5" />} />}
              </div>
            </div>
            <Icon.arrow className="h-5 w-5 shrink-0 text-moss-600 transition-transform group-hover:translate-x-1" />
          </Link>

          {/* Delete button — outside the Link so clicks don't navigate */}
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <DeleteDiaryButton
              diaryId={entry.id}
              onDeleted={() => setEntries((prev) => prev.filter((e) => e.id !== entry.id))}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}
