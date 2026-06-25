"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ObiePhoto";
import { relativeTime } from "@/lib/activity";

type CommentProfile = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type CommentRow = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles: CommentProfile | null;
};

// Supabase PostgREST may return the embedded profile as an array or object
// depending on whether it infers one-to-one vs one-to-many. Normalize here.
function normalizeProfile(p: CommentProfile | CommentProfile[] | null | undefined): CommentProfile | null {
  if (!p) return null;
  if (Array.isArray(p)) return p[0] ?? null;
  return p;
}

function nameOf(p: CommentRow["profiles"]) {
  return p?.display_name || p?.username || "Learner";
}
function initialsOf(p: CommentRow["profiles"]) {
  return nameOf(p).slice(0, 2).toUpperCase();
}

export function CommentsSection({
  diaryEntryId,
  currentUserId,
}: {
  diaryEntryId: string;
  currentUserId: string;
}) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  async function fetchComments() {
    const { data } = await supabase
      .from("comments")
      .select("id, user_id, body, created_at, profiles(username, display_name, avatar_url)")
      .eq("diary_entry_id", diaryEntryId)
      .order("created_at", { ascending: true });
    // Normalize the embedded profile (PostgREST may return object or array)
    const rows = ((data ?? []) as unknown as Array<Omit<CommentRow, "profiles"> & { profiles: CommentProfile | CommentProfile[] | null }>).map(
      (r) => ({ ...r, profiles: normalizeProfile(r.profiles) })
    );
    setComments(rows);
  }

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaryEntryId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError("");
    const { error: err } = await supabase.from("comments").insert({
      diary_entry_id: diaryEntryId,
      user_id: currentUserId,
      body: trimmed,
    });
    setSubmitting(false);
    if (err) {
      setError("コメントを投稿できませんでした。/ Could not post comment.");
    } else {
      setBody("");
      textareaRef.current?.blur();
      await fetchComments();
    }
  }

  async function handleDelete(commentId: string) {
    await supabase.from("comments").delete().eq("id", commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span>💬</span>
        <h2 className="font-serif text-xl font-bold text-pine">Comments</h2>
        <span className="text-sm font-medium text-muted">コメント</span>
        {comments.length > 0 && (
          <span className="ml-1 rounded-full bg-mint px-2 py-0.5 text-xs font-semibold text-pine">
            {comments.length}
          </span>
        )}
      </div>

      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="rounded-2xl bg-sand/30 py-6 text-center text-sm text-muted">
          No comments yet — be the first to cheer! 🌸
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="flex items-start gap-3 rounded-2xl bg-paper p-4">
              {c.profiles?.avatar_url ? (
                <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-sage">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.profiles.avatar_url}
                    alt={nameOf(c.profiles)}
                    className="h-full w-full object-cover"
                  />
                </span>
              ) : (
                <Avatar initials={initialsOf(c.profiles)} size={36} />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold text-pine">
                    {c.profiles?.username ? (
                      <Link
                        href={`/profile/${c.profiles.username}`}
                        className="hover:text-moss-600"
                      >
                        {nameOf(c.profiles)}
                      </Link>
                    ) : (
                      nameOf(c.profiles)
                    )}
                  </span>
                  <span className="text-[11px] text-muted">{relativeTime(c.created_at)}</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-ink/80">{c.body}</p>
              </div>
              {c.user_id === currentUserId && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="shrink-0 rounded p-0.5 text-[11px] text-muted hover:text-red-500"
                  aria-label="Delete comment"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Post form */}
      <form onSubmit={handleSubmit} className="flex items-start gap-3">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="応援コメントをどうぞ / Leave a comment…"
          rows={2}
          maxLength={500}
          className="flex-1 resize-none rounded-2xl border border-line bg-paper px-4 py-3 text-sm text-ink placeholder:text-muted focus:border-moss focus:outline-none"
        />
        <button
          type="submit"
          disabled={!body.trim() || submitting}
          className="rounded-full bg-pine px-4 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-pine/90 disabled:opacity-40"
        >
          {submitting ? "…" : "Post"}
        </button>
      </form>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
