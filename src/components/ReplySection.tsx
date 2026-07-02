"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ObiePhoto";
import { relativeTime } from "@/lib/activity";
import { useT } from "@/contexts/locale";
import { countryFlag } from "@/lib/countryFlag";
import { ReportButton } from "@/components/ReportButton";

type ReplyProfile = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  country: string | null;
};

type ReplyRow = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles: ReplyProfile | ReplyProfile[] | null;
};

function resolveProfile(p: ReplyRow["profiles"]): ReplyProfile | null {
  if (!p) return null;
  return Array.isArray(p) ? (p[0] ?? null) : p;
}

/**
 * Inline reply thread for a single comment or peer correction.
 * Lazy-loads on first open; shows existing replies and a post form.
 * Replies are 1-level deep only (no nesting).
 */
export function ReplySection({
  parentType,
  parentId,
  currentUserId,
}: {
  parentType: "comment" | "peer_correction";
  parentId: string;
  currentUserId: string;
}) {
  const t = useT();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [replies, setReplies] = useState<ReplyRow[]>([]);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fk = parentType === "comment" ? "comment_id" : "peer_correction_id";

  async function loadReplies() {
    const { data } = await supabase
      .from("replies")
      .select("id, author_id, body, created_at, profiles(username, display_name, avatar_url, country)")
      .eq(fk, parentId)
      .order("created_at", { ascending: true });
    setReplies(((data ?? []) as unknown[]) as ReplyRow[]);
    setLoaded(true);
  }

  async function handleToggle() {
    if (!open) {
      if (!loaded) await loadReplies();
      setOpen(true);
    } else {
      setOpen(false);
      setBody("");
      setError("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError("");
    const { error: err } = await supabase.from("replies").insert({
      author_id: currentUserId,
      body: trimmed,
      [fk]: parentId,
    });
    setSubmitting(false);
    if (err) {
      setError(t("reply.error"));
    } else {
      setBody("");
      await loadReplies();
    }
  }

  async function handleDelete(replyId: string) {
    await supabase.from("replies").delete().eq("id", replyId);
    setReplies((prev) => prev.filter((r) => r.id !== replyId));
  }

  // Show count on toggle label once replies have been loaded
  const toggleLabel = open
    ? t("reply.close")
    : loaded && replies.length > 0
    ? `${t("reply.label")} (${replies.length})`
    : t("reply.label");

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={handleToggle}
        className="text-[11px] font-semibold text-moss-600/70 transition-colors hover:text-pine"
      >
        {toggleLabel}
      </button>

      {open && (
        <div className="mt-2 space-y-2 border-l-2 border-mint/60 pl-3">
          {/* Existing replies */}
          {loaded && replies.length > 0 && (
            <ul className="space-y-2">
              {replies.map((r) => {
                const p = resolveProfile(r.profiles);
                const name = p?.display_name || p?.username || "Learner";
                return (
                  <li key={r.id} className="flex items-start gap-2">
                    {p?.avatar_url ? (
                      <span className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-full bg-sage">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.avatar_url}
                          alt={name}
                          className="h-full w-full object-cover"
                        />
                      </span>
                    ) : (
                      <Avatar initials={name.slice(0, 2).toUpperCase()} size={24} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-1.5">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-pine">
                          {p?.username ? (
                            <Link
                              href={`/profile/${p.username}`}
                              className="hover:text-moss-600"
                            >
                              {name}
                            </Link>
                          ) : (
                            name
                          )}
                          {countryFlag(p?.country) && (
                            <span className="text-xs leading-none">{countryFlag(p?.country)}</span>
                          )}
                        </span>
                        <span className="text-[10px] text-muted">
                          {relativeTime(r.created_at)}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-ink/80">{r.body}</p>
                    </div>
                    {r.author_id === currentUserId ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        className="shrink-0 text-[10px] text-muted hover:text-red-500"
                        aria-label={t("reply.delete")}
                      >
                        ✕
                      </button>
                    ) : (
                      <ReportButton targetType="reply" targetId={r.id} className="shrink-0" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Post form */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("reply.placeholder")}
              maxLength={500}
              className="flex-1 rounded-xl border border-line bg-paper px-3 py-1.5 text-xs text-ink placeholder:text-muted focus:border-moss focus:outline-none"
            />
            <button
              type="submit"
              disabled={!body.trim() || submitting}
              className="shrink-0 rounded-full bg-pine px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-40"
            >
              {submitting ? "…" : t("reply.submit")}
            </button>
          </form>
          {error && <p className="text-[11px] text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
}
