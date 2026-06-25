"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";

export function LanguageSelector({ initialLanguage }: { initialLanguage: string }) {
  const [lang, setLang] = useState(initialLanguage || "en");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  async function handleChange(code: string) {
    setLang(code);
    setStatus("saving");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ preferred_language: code })
        .eq("id", user.id);
    }
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
