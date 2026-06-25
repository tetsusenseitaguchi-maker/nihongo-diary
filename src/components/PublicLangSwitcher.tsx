"use client";

import { useRouter } from "next/navigation";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";

/**
 * Language switcher for pre-auth pages (landing, login, signup).
 * Sets NEXT_LOCALE cookie and calls router.refresh() so the server
 * re-renders the page with the new locale — no full reload.
 */
export function PublicLangSwitcher({ currentLocale }: { currentLocale: Locale }) {
  const router = useRouter();

  function handleChange(code: string) {
    if (code === currentLocale) return;
    document.cookie = `${LOCALE_COOKIE}=${code};path=/;max-age=31536000;SameSite=Lax`;
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-line/60 bg-paper/80 px-2.5 py-1.5 backdrop-blur">
      <span className="text-base leading-none">🌐</span>
      <select
        value={currentLocale}
        onChange={(e) => handleChange(e.target.value)}
        className="cursor-pointer bg-transparent text-xs font-medium text-ink outline-none"
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
