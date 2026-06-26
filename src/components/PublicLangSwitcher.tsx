"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { useLocale } from "@/contexts/locale";

/**
 * Language switcher for pre-auth pages (landing, login, signup).
 *
 * Two-pronged update:
 * 1. setLocale() from LocaleContext — when inside a LocaleProvider (login/signup),
 *    this lazy-loads the new messages and updates client state immediately so
 *    useT() hooks re-render without waiting for the server round-trip.
 *    On pages without a provider (landing) the default no-op fires instead.
 * 2. router.refresh() — re-fetches server components with the new cookie so the
 *    server-rendered locale stays in sync (essential for the landing page).
 */
export function PublicLangSwitcher({ currentLocale }: { currentLocale: Locale }) {
  const router = useRouter();
  const { setLocale } = useLocale();
  // Local state so the <select> reflects the new value immediately,
  // before router.refresh() completes and updates the server-side prop.
  const [displayed, setDisplayed] = useState<Locale>(currentLocale);
  const [switching, setSwitching] = useState(false);

  async function handleChange(code: string) {
    if (switching || code === displayed) return;
    setSwitching(true);
    setDisplayed(code as Locale);
    document.cookie = `${LOCALE_COOKIE}=${code};path=/;max-age=31536000;SameSite=Lax`;
    // Updates LocaleProvider state on login/signup (instant client-side re-render).
    // No-op when called outside a provider (landing page).
    await setLocale(code as Locale);
    // Refreshes server components — required on the landing page which has no
    // LocaleProvider and relies entirely on server re-render for locale changes.
    router.refresh();
    setSwitching(false);
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-line/60 bg-paper/80 px-2.5 py-1.5 backdrop-blur">
      <span className="text-base leading-none">🌐</span>
      <select
        value={displayed}
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
  );
}
