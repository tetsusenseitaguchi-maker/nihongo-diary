"use client";

import { useState } from "react";
import { Card, LinkButton } from "@/components/ui";
import { Icon } from "@/components/icons";
import { DiaryHistoryList } from "@/components/DiaryHistoryList";
import { VocabularyList } from "@/components/VocabularyList";
import { WeeklyReport } from "@/components/WeeklyReport";
import { GrammarReviewList } from "@/components/GrammarReviewList";
import { useT } from "@/contexts/locale";

interface Entry {
  id: string;
  diary_date: string;
  title: string | null;
  tags: string[];
  original_text: string;
  corrected_japanese: string | null;
  seeking_peer_correction: boolean;
  level: string | null;
  correction_style: string | null;
  image_path: string | null;
  audio_path: string | null;
}

type Tab = "diary" | "vocab" | "report" | "review";

export function HistoryWithTabs({
  entries,
  initialTab,
}: {
  entries: Entry[];
  initialTab: Tab;
}) {
  const t = useT();
  const [tab, setTab] = useState<Tab>(initialTab);

  const headerTitle =
    tab === "vocab"
      ? t("vocab.title")
      : tab === "report"
        ? t("report.title")
        : tab === "review"
          ? t("review.historyTitle")
          : t("history.title");

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-pine">{headerTitle}</h1>
          {tab === "diary" && (
            <p className="mt-1 text-ink/70">
              <span className="font-medium">{t("history.subtitle")}</span>
              {entries.length > 0 && (
                <> · {t("history.entryCount", { n: entries.length })}</>
              )}
            </p>
          )}
        </div>
        {tab === "diary" && (
          <LinkButton href="/write">
            <Icon.pen className="h-4 w-4" /> {t("history.writeDiary")}
          </LinkButton>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl border border-line bg-paper p-1">
        {(["diary", "vocab", "report", "review"] as Tab[]).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`flex-1 rounded-lg px-2 py-2 text-sm font-semibold transition-colors ${
              tab === tabKey
                ? "bg-pine text-cream shadow-sm"
                : "text-ink/60 hover:text-pine"
            }`}
          >
            {tabKey === "diary"
              ? t("history.tabDiary")
              : tabKey === "vocab"
                ? t("history.tabVocab")
                : tabKey === "report"
                  ? t("history.tabReport")
                  : t("history.tabReview")}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "diary" ? (
        entries.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="text-3xl">🌱</span>
            <p className="font-serif text-lg font-bold text-pine">
              {t("history.emptyTitle")}
            </p>
            <p className="max-w-sm text-sm text-ink/70">{t("history.emptyBody")}</p>
            <LinkButton href="/write" className="mt-2">
              <Icon.pen className="h-4 w-4" /> {t("history.writeDiary")}
            </LinkButton>
          </Card>
        ) : (
          <DiaryHistoryList initialEntries={entries} />
        )
      ) : tab === "vocab" ? (
        <VocabularyList />
      ) : tab === "report" ? (
        <WeeklyReport />
      ) : (
        <GrammarReviewList />
      )}
    </div>
  );
}
