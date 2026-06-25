"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ObiePhoto";
import { Icon } from "@/components/icons";
import { useT } from "@/contexts/locale";

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  level: string | null;
}

function nameOf(p: Profile) {
  return p.display_name || p.username || "Learner";
}

// ── UserSearch ─────────────────────────────────────────────────────────────

export function UserSearch() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Profile | null | "not-found">(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const supabase = createClient();
      const { data, error: sbErr } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, level")
        .ilike("username", term)
        .maybeSingle();

      if (sbErr) {
        setError("検索中にエラーが発生しました。もう一度お試しください。");
        return;
      }
      setResult(data ? (data as Profile) : "not-found");
    } catch {
      setError("ネットワークエラーです。接続を確認してください。");
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setQuery("");
    setResult(null);
    setError(null);
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-paper p-5 shadow-card">
      <h2 className="mb-1 font-serif text-lg font-bold text-pine">
        🔎 {t("usersearch.title")}
      </h2>

      {/* Search form */}
      <form onSubmit={handleSearch} className="flex gap-2 mt-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("usersearch.placeholder")}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl border border-line bg-paper/80 px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-moss/40"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-pine px-4 py-2 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cream/30 border-t-cream" />
          ) : (
            <Icon.search className="h-3.5 w-3.5" />
          )}
          {t("usersearch.button")}
        </button>
      </form>

      {/* Error */}
      {error && (
        <p className="mt-3 rounded-lg bg-apricot/10 px-3 py-2 text-xs text-apricot">
          {error}
        </p>
      )}

      {/* Not found */}
      {result === "not-found" && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-sand/50 px-4 py-3">
          <p className="text-sm text-ink/70">
            {t("usersearch.notFound", { q: query.trim() })}
          </p>
          <button type="button" onClick={handleClear} className="text-xs font-medium text-muted hover:text-pine">
            {t("usersearch.clear")}
          </button>
        </div>
      )}

      {/* Result */}
      {result && result !== "not-found" && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-paper/80 p-3">
          {result.avatar_url ? (
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-sage">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.avatar_url} alt={nameOf(result)} className="h-full w-full object-cover" />
            </span>
          ) : (
            <Avatar initials={nameOf(result).slice(0, 2).toUpperCase()} size={40} />
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{nameOf(result)}</p>
            {result.username && (
              <p className="text-xs text-muted">@{result.username}</p>
            )}
            {result.level && (
              <span className="mt-0.5 inline-block rounded-full bg-mint px-2 py-0.5 text-[10px] font-semibold text-pine">
                {result.level}
              </span>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            {result.username && (
              <Link
                href={`/profile/${result.username}`}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-pine hover:border-moss hover:bg-mint/50"
              >
                {t("usersearch.viewProfile")}
                <Icon.arrow className="h-3 w-3" />
              </Link>
            )}
            <button type="button" onClick={handleClear} className="text-[10px] text-muted hover:text-pine">
              {t("usersearch.clear")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
