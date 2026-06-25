"use client";

import { useState } from "react";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { useLocale } from "@/contexts/locale";
import type { Locale } from "@/lib/i18n";

/**
 * Compact inline language switcher.
 * Shown in the Sidebar (below nav, above Obie card) and TopBar.
 */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();
  const [switching, setSwitching] = useState(false);

  async function handleChange(code: string) {
    if (switching || code === locale) return;
    setSwitching(true);
    await setLocale(code as Locale);
    setSwitching(false);
  }

  if (compact) {
    // Globe icon + abbreviated label for TopBar
    return (
      <div className="relative">
        <label className="sr-only">Language</label>
        <div className="flex items-center gap-1 rounded-full border border-line bg-paper px-2.5 py-1.5 text-sm text-ink/70 hover:border-moss/50">
          <span className="text-base leading-none">🌐</span>
          <select
            value={locale}
            onChange={(e) => handleChange(e.target.value)}
            disabled={switching}
            className="cursor-pointer bg-transparent text-xs font-medium text-ink outline-none disabled:opacity-60"
            aria-label="Switch language"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  // Full version for sidebar
  return (
    <div className="rounded-xl border border-line bg-paper/70 px-3 py-2.5">
      <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
        <span>🌐</span> Language
      </p>
      <select
        value={locale}
        onChange={(e) => handleChange(e.target.value)}
        disabled={switching}
        className="w-full cursor-pointer rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm font-medium text-ink outline-none focus:border-moss disabled:opacity-60"
        aria-label="Switch language"
      >
        {SUPPORTED_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}
