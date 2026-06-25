"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { DeleteDiaryButton } from "@/components/DeleteDiaryButton";
import { TagChips } from "@/components/TagChips";
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
  title: string | null;
  tags: string[];
  original_text: string;
  level: string | null;
  correction_style: string | null;
  image_path: string | null;
  audio_path: string | null;
}

export function DiaryHistoryList({ initialEntries }: { initialEntries: Entry[] }) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [filterTag, setFilterTag] = useState<string | null>(null);

  const allTags = Array.from(new Set(entries.flatMap((e) => e.tags ?? [])));
  const displayed = filterTag
    ? entries.filter((e) => (e.tags ?? []).includes(filterTag))
    : entries;

  if (entries.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No diaries yet.</p>;
  }

  return (
    <div className="space-y-3">
      {/* Tag filter bar */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-1">
          <button
            onClick={() => setFilterTag(null)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              !filterTag
                ? "bg-pine text-cream"
                : "border border-line bg-paper text-ink/70 hover:border-moss hover:text-pine"
            }`}
          >
            すべて
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setFilterTag(filterTag === t ? null : t)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                filterTag === t
                  ? "bg-pine text-cream"
                  : "border border-line bg-paper text-ink/70 hover:border-moss hover:text-pine"
              }`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}
      {displayed.length === 0 && (
        <p className="py-6 text-center text-sm text-muted">
          #{filterTag} のタグが付いた日記はありません。
        </p>
      )}
      {displayed.map((entry) => (
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
              {entry.title && (
                <p className="mb-0.5 truncate text-[13px] font-bold text-pine group-hover:text-moss-600">
                  {entry.title}
                </p>
              )}
              <p className={`mb-1 truncate font-jp text-[15px] group-hover:text-pine ${entry.title ? "text-ink/60" : "text-ink"}`}>
                {entry.original_text}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted">{formatLong(entry.diary_date)}</span>
                {entry.level && <Badge tone="sand">{entry.level}</Badge>}
                {entry.correction_style && <Badge tone="moss">{entry.correction_style}</Badge>}
                {entry.image_path && <AttachmentDot icon={<Icon.camera className="h-2.5 w-2.5" />} />}
                {entry.audio_path && <AttachmentDot icon={<Icon.mic className="h-2.5 w-2.5" />} />}
              </div>
              {(entry.tags ?? []).length > 0 && (
                <div className="mt-1">
                  <TagChips tags={entry.tags ?? []} />
                </div>
              )}
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
