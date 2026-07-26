"use client";

import { useId, useState } from "react";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useT } from "@/contexts/locale";

/**
 * The How to Use guide items. Emoji live here (not in i18n) because they are
 * language-independent; only title/body are translated.
 */
const GUIDE_ITEMS: { key: string; emoji: string }[] = [
  { key: "write", emoji: "✍️" },
  { key: "correct", emoji: "🤖" },
  { key: "recheck", emoji: "🔁" },
  { key: "vocab", emoji: "📚" },
  { key: "tapTranslate", emoji: "👆" },
  { key: "obie", emoji: "🐶" },
  { key: "calendar", emoji: "📅" },
  { key: "feed", emoji: "🌏" },
  { key: "social", emoji: "💬" },
  { key: "peer", emoji: "🖊" },
  { key: "report", emoji: "📊" },
  { key: "lessons", emoji: "🎓" },
];

export function GuideAccordion() {
  const t = useT();
  const baseId = useId();
  // Only one item open at a time; all closed initially.
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {GUIDE_ITEMS.map(({ key, emoji }) => {
        const isOpen = openKey === key;
        const panelId = `${baseId}-${key}-panel`;
        const headerId = `${baseId}-${key}-header`;
        return (
          <Card key={key} className="overflow-hidden p-0">
            <h2>
              <button
                type="button"
                id={headerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenKey(isOpen ? null : key)}
                className="flex w-full items-center gap-3 p-5 text-left"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-mint text-xl">
                  {emoji}
                </span>
                <span className="min-w-0 flex-1 font-serif font-bold text-pine">
                  {t(`guide.${key}.title`)}
                </span>
                <Icon.arrow
                  className={`h-5 w-5 shrink-0 text-moss-600 transition-transform ${
                    isOpen ? "rotate-90" : ""
                  }`}
                />
              </button>
            </h2>

            {isOpen && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={headerId}
                className="border-t border-line px-5 pb-5 pt-4"
              >
                <p className="text-sm leading-relaxed text-ink/80">
                  {t(`guide.${key}.body`)}
                </p>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
