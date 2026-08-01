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
  natural_japanese: string | null;
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

  const headerSubtitle =
    tab === "vocab"
      ? t("history.subtitleVocab")
      : tab === "report"
        ? t("history.subtitleReport")
        : t("history.subtitleReview");

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-pine">{headerTitle}</h1>
          {/* The subtitle line renders on every tab, not just diary. It used to
              appear only on diary, so switching away shrank the header by 28px
              and jerked the tab bar — and everything under it — upwards, right
              where the user had just clicked. Keeping the line present holds the
              header at a constant height. Diary composes its own text so it can
              carry the entry count; the other tabs use a fixed line each.
              The Write button stays diary-only: at 64px the title-plus-subtitle
              column is already taller than the 44px button, so whether the
              button renders no longer changes the header's height. */}
          <p className="mt-1 text-ink/70">
            {tab === "diary" ? (
              <>
                <span className="font-medium">{t("history.subtitle")}</span>
                {entries.length > 0 && (
                  <> · {t("history.entryCount", { n: entries.length })}</>
                )}
              </>
            ) : (
              headerSubtitle
            )}
          </p>
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
            // No transition-colors here. It animated background-color AND color
            // over 150ms, so mid-switch the outgoing tab sat at half-pine on
            // half-cream text while the incoming one did the same — both labels
            // washed out at once, which is the flash people see in the bar
            // itself. Switching the pill instantly is the whole fix; hover keeps
            // its own colour change, just without the tween.
            className={`flex-1 rounded-lg px-2 py-2 text-sm font-semibold ${
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

      {/* Tab content.
          Three of the four tabs fetch on mount and render a ~90px loading block
          while they wait, so the area under the tab bar used to shrink to almost
          nothing and the footer rode up right beneath the tabs. min-h-[60vh]
          reserves the space: measured at an 813px viewport, the content area
          holds at 488px instead of 152px, and the footer stays 552px below the
          tab bar instead of 216px.

          It does NOT preserve scroll position, and no static min-height can.
          Switching away from a 24-entry diary still takes the document from
          3074px to roughly one viewport, so a reader scrolled to 1200px is still
          clamped to 0. Holding the position needs the outgoing tab's height
          captured and reserved until the new one has loaded — a bigger change,
          deliberately not made here. */}
      <div className="min-h-[60vh]">
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
    </div>
  );
}
