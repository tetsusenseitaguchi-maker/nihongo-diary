"use client";
import { useState } from "react";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { useT } from "@/contexts/locale";

interface Props {
  diaryEntryId: string;
  /** Full translations JSONB from DB, keyed by language code. */
  translations: Record<string, string>;
  /** Viewer's preferred language (from profiles.preferred_language). */
  preferredLanguage: string;
}

function langLabel(code: string) {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.label ?? code.toUpperCase();
}

export function TranslateButton({ diaryEntryId, translations, preferredLanguage }: Props) {
  const [translation, setTranslation] = useState<string | null>(
    translations[preferredLanguage] ?? null
  );
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  async function handleToggle() {
    if (show) {
      setShow(false);
      return;
    }
    if (translation) {
      setShow(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diaryEntryId, language: preferredLanguage }),
      });
      const data: { translation?: string; error?: string; message?: string } = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || t("translate.failed"));
        return;
      }
      setTranslation(data.translation ?? null);
      setShow(true);
    } catch {
      setError(t("translate.networkError"));
    } finally {
      setLoading(false);
    }
  }

  const targetLabel = langLabel(preferredLanguage);

  return (
    <div className="space-y-3">
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
          show
            ? "border-moss/50 bg-mint/50 text-pine hover:bg-mint/70"
            : "border-line bg-paper text-ink/70 hover:border-moss/50 hover:bg-mint/30 hover:text-pine"
        }`}
      >
        {loading ? (
          <>
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-moss border-t-transparent" />
            翻訳中… {t("translate.translating")}
          </>
        ) : show ? (
          <>🌐 翻訳を隠す · {t("translate.hide")}</>
        ) : (
          <>🌐 {targetLabel} 訳を見る · {t("translate.show")}</>
        )}
      </button>

      {error && !loading && (
        <p className="rounded-xl bg-apricot/10 px-4 py-2 text-sm text-apricot">{error}</p>
      )}

      {/* Translation panel — sand background distinguishes it from mint Japanese sections */}
      {show && translation && (
        <div className="rounded-2xl border border-sand/60 bg-sand/20 px-5 py-4">
          <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-ink/40">
            <span>🌐</span> {t("translate.label", { lang: targetLabel })}
          </p>
          <p className="leading-relaxed text-ink/85">{translation}</p>
        </div>
      )}
    </div>
  );
}
