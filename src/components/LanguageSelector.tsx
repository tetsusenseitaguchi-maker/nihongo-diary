"use client";
import { useState } from "react";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { LOCALE_COOKIE } from "@/lib/i18n";
import { useLocale } from "@/contexts/locale";
import type { Locale } from "@/lib/i18n";

/**
 * Full-width language selector for the Profile settings page.
 * Updates the LocaleContext (instant UI update), the NEXT_LOCALE cookie,
 * and Supabase profiles.preferred_language.
 */
export function LanguageSelector({ initialLanguage }: { initialLanguage: string }) {
  const { setLocale } = useLocale();
  const [lang, setLang] = useState(initialLanguage || "en");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  async function handleChange(code: string) {
    setLang(code);
    setStatus("saving");

    // Update cookie immediately so the server picks it up on the next render
    document.cookie = `${LOCALE_COOKIE}=${code};path=/;max-age=31536000;SameSite=Lax`;

    // Update LocaleContext (client UI updates instantly, also persists to DB)
    await setLocale(code as Locale);

    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1500);
  }

  return (
    <div className="flex items-center gap-3">
      <select
        value={lang}
        onChange={(e) => handleChange(e.target.value)}
        disabled={status === "saving"}
        className="rounded-xl border border-line bg-paper px-3 py-2 text-sm font-medium text-ink focus:border-moss focus:outline-none disabled:opacity-60"
      >
        {SUPPORTED_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
      {status === "saving" && (
        <span className="text-xs text-muted">保存中…</span>
      )}
      {status === "saved" && (
        <span className="text-xs font-semibold text-moss-600">✓ 保存しました</span>
      )}
    </div>
  );
}
