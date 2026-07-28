"use client";

import { useId, useState } from "react";
import { Furigana } from "@/components/Furigana";
import { Icon } from "@/components/icons";
import { ObiePhoto } from "@/components/ObiePhoto";
import { useT } from "@/contexts/locale";

/**
 * "Japanese word order" — a four-car train shown above the diary editor.
 *
 * The one thing it has to land: the main point sits at the END of the
 * sentence. So the first three cars are deliberately quiet and only the last
 * one is accented — the colour does the teaching before the labels do.
 *
 * Drawn with divs rather than SVG on purpose: the labels are translated, and
 * text baked into an SVG viewBox cannot reflow when "the main point" becomes a
 * much longer phrase in another language.
 *
 * Display-only — no DB, no plan gating, no usage counters.
 */

// The four cars spell out one sentence: 今日は友だちと公園で遊びました。
const CARS: { jp: string; labelKey: string; box: string; label: string }[] = [
  { jp: "今日(きょう)は", labelKey: "write.wordOrder.when", box: "border-line bg-tint-green", label: "text-muted" },
  { jp: "友(とも)だちと", labelKey: "write.wordOrder.who", box: "border-line bg-tint-sage", label: "text-muted" },
  { jp: "公園(こうえん)で", labelKey: "write.wordOrder.where", box: "border-line bg-tint-blue", label: "text-muted" },
  // The point of the whole diagram — the only car that gets an accent.
  { jp: "遊(あそ)びました", labelKey: "write.wordOrder.mainPoint", box: "border-apricot/60 bg-tint-sand", label: "text-apricot" },
];

// The same opening (今日は…) closed three different ways, so the ending is the
// only thing that varies. English glosses stay English in every locale, like
// the writing prompts and the Write-page tips.
const ENDINGS: { jp: string; en: string; kindKey: string }[] = [
  {
    jp: "今日(きょう)は友(とも)だちと公園(こうえん)で遊(あそ)びました。",
    en: "I played with a friend at the park today.",
    kindKey: "write.wordOrder.action",
  },
  {
    jp: "今日(きょう)はとても楽(たの)しかったです。",
    en: "Today was a lot of fun.",
    kindKey: "write.wordOrder.feeling",
  },
  {
    jp: "今日(きょう)は休(やす)みでした。",
    en: "Today was a day off.",
    kindKey: "write.wordOrder.whatItWas",
  },
];

export function TrainDiagram() {
  const t = useT();
  const baseId = useId();
  const panelId = `${baseId}-panel`;
  const headerId = `${baseId}-header`;

  // Open by default. This band now lives inside the collapsed Hints section,
  // which is what keeps the editor quiet — so opening Hints has to reveal the
  // diagram itself, not a second closed band with nothing in it. The toggle
  // stays for anyone who wants to fold it away while Hints is open; that is
  // per-mount only, deliberately not remembered.
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-4 rounded-xl border border-line bg-mint/30">
      <button
        type="button"
        id={headerId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span aria-hidden>🚃</span>
        <span className="min-w-0 flex-1 break-words text-xs font-bold text-pine">
          {t("write.wordOrder.title")}
          <span className="ml-1.5 font-normal text-muted">
            {t("write.wordOrder.subtitle")}
          </span>
        </span>
        <Icon.arrow
          className={`h-4 w-4 shrink-0 text-moss-600 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          className="border-t border-line px-3 pb-3 pt-3"
        >
          {/* Cars */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CARS.map((c, i) => {
              const isLast = i === CARS.length - 1;
              return (
                <div key={c.labelKey} className="relative text-center">
                  {/* Obie rides in the last car — the one that carries the point */}
                  {isLast && (
                    <span className="absolute -right-1 -top-2.5 z-10">
                      <ObiePhoto size={28} />
                    </span>
                  )}
                  <div className={`rounded-2xl border-2 px-2 py-2 ${c.box}`}>
                    <p className={`break-words text-[10px] font-bold uppercase tracking-wide ${c.label}`}>
                      {t(c.labelKey)}
                    </p>
                    <p className="mt-1 font-jp text-sm font-semibold text-ink">
                      <Furigana text={c.jp} />
                    </p>
                  </div>
                  {/* wheels */}
                  <div className="mt-1 flex justify-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-ink/30" />
                    <span className="h-2 w-2 rounded-full bg-ink/30" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rail — only on the single-row layout; under a 2×2 grid it would
              just underline the bottom row. */}
          <div className="hidden h-0.5 w-full rounded bg-ink/20 sm:block" />

          <p className="mt-2 break-words text-center text-[11px] text-muted">
            {t("write.wordOrder.mainPointSub")}
          </p>

          {/* The same opening, three different endings */}
          <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-muted">
            {t("write.wordOrder.endings")}
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {ENDINGS.map((e) => (
              <li
                key={e.kindKey}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-lg bg-paper/70 px-2.5 py-1.5"
              >
                <span className="font-jp text-sm text-ink">
                  <Furigana text={e.jp} />
                </span>
                <span className="break-words text-[11px] text-muted">{e.en}</span>
                <span className="ml-auto shrink-0 rounded-full bg-mint px-2 py-0.5 text-[10px] font-bold text-pine">
                  {t(e.kindKey)}
                </span>
              </li>
            ))}
          </ul>

          <a
            href="/support"
            className="mt-3 inline-block break-words text-[11px] font-semibold text-moss-600 hover:text-pine"
          >
            {t("write.wordOrder.moreInLesson")}
          </a>
        </div>
      )}
    </div>
  );
}
