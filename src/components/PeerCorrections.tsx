"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { Avatar } from "@/components/ObiePhoto";
import { relativeTime } from "@/lib/activity";
import { useT } from "@/contexts/locale";

type ProfileSnap = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type PeerCorrection = {
  id: string;
  corrector_id: string;
  start_offset: number;
  end_offset: number;
  original_excerpt: string;
  corrected_text: string;
  comment: string | null;
  corrector_level: string | null;
  created_at: string;
  profiles: ProfileSnap | ProfileSnap[] | null;
};

type PendingRange = { start: number; end: number; excerpt: string };

// code-unit offset entry for each Unicode code point in the text
type CharEntry = { char: string; cuStart: number; cuEnd: number };

function buildCharEntries(text: string): CharEntry[] {
  const entries: CharEntry[] = [];
  let cu = 0;
  for (const char of text) {
    entries.push({ char, cuStart: cu, cuEnd: cu + char.length });
    cu += char.length;
  }
  return entries;
}

function resolveProfile(raw: PeerCorrection["profiles"]): ProfileSnap | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

// Renders original_text with underlined spans where corrections exist
function HighlightedText({
  text,
  corrections,
  activeId,
  onClickRange,
}: {
  text: string;
  corrections: PeerCorrection[];
  activeId: string | null;
  onClickRange: (id: string) => void;
}) {
  const sorted = [...corrections].sort((a, b) => a.start_offset - b.start_offset);

  type Seg = { text: string; cid: string | null };
  const segs: Seg[] = [];
  let pos = 0;

  for (const c of sorted) {
    const segStart = Math.max(pos, c.start_offset);
    const segEnd = Math.min(c.end_offset, text.length);
    if (c.start_offset > pos) {
      segs.push({ text: text.slice(pos, c.start_offset), cid: null });
    }
    if (segEnd > segStart) {
      segs.push({ text: text.slice(segStart, segEnd), cid: c.id });
      pos = segEnd;
    }
  }
  if (pos < text.length) {
    segs.push({ text: text.slice(pos), cid: null });
  }

  return (
    <p className="font-jp text-base leading-relaxed text-ink whitespace-pre-wrap">
      {segs.map((seg, i) =>
        seg.cid ? (
          <button
            key={i}
            type="button"
            onClick={() => onClickRange(seg.cid!)}
            className={`underline decoration-2 underline-offset-4 transition-colors ${
              activeId === seg.cid
                ? "bg-mint/60 decoration-pine"
                : "decoration-moss-600/60 hover:bg-mint/30"
            }`}
          >
            {seg.text}
          </button>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </p>
  );
}

// Renders each character as a tappable button for range selection.
// phase="picking-start": no selection yet, every char is neutral
// phase="picking-end":   tapStartIdx is highlighted; tapping another char confirms the range
function TappableText({
  chars,
  phase,
  tapStartIdx,
  onTap,
}: {
  chars: CharEntry[];
  phase: "picking-start" | "picking-end";
  tapStartIdx: number | null;
  onTap: (cpIdx: number) => void;
}) {
  return (
    <div className="font-jp text-base leading-relaxed text-ink select-none break-all">
      {chars.map(({ char }, cpIdx) => {
        if (char === "\n") return <br key={cpIdx} />;

        const isStart = phase === "picking-end" && cpIdx === tapStartIdx;

        return (
          <button
            key={cpIdx}
            type="button"
            // onPointerDown fires before browser text-selection and works for both
            // mouse and touch without the 300 ms tap delay
            onPointerDown={(e) => {
              e.preventDefault();
              onTap(cpIdx);
            }}
            className={`touch-manipulation inline-block rounded-sm px-0.5 py-1.5 font-jp text-base transition-colors ${
              isStart
                ? "bg-pine/20 text-pine ring-1 ring-pine/30"
                : "text-ink active:bg-mint/60 hover:bg-mint/30"
            }`}
          >
            {char}
          </button>
        );
      })}
    </div>
  );
}

export function PeerCorrections({
  entryId,
  originalText,
  isOwner,
  isPublic,
  currentUserId,
}: {
  entryId: string;
  originalText: string;
  isOwner: boolean;
  isPublic: boolean;
  currentUserId: string;
}) {
  const t = useT();

  const [corrections, setCorrections] = useState<PeerCorrection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  // "picking-start" → waiting for first tap
  // "picking-end"   → start is set, waiting for second tap
  // null            → not in selection mode
  const [selectPhase, setSelectPhase] = useState<"picking-start" | "picking-end" | null>(null);
  const [tapStartIdx, setTapStartIdx] = useState<number | null>(null);

  const [pendingRange, setPendingRange] = useState<PendingRange | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [correctedInput, setCorrectedInput] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardRefs: Record<string, HTMLDivElement | null> = {};

  // Build char entries once — needed for Unicode-safe offset calculation
  const chars = buildCharEntries(originalText);

  useEffect(() => {
    fetch(`/api/peer-corrections?diaryEntryId=${entryId}`)
      .then((r) => r.json())
      .then((d) => setCorrections(d.corrections ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [entryId]);

  function handleClickRange(id: string) {
    setActiveId((prev) => (prev === id ? null : id));
    setTimeout(() => {
      cardRefs[id]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }

  function enterSelectMode() {
    setSelectPhase("picking-start");
    setTapStartIdx(null);
    setPendingRange(null);
    setActiveId(null);
    setError(null);
  }

  function cancelAdd() {
    setSelectPhase(null);
    setTapStartIdx(null);
    setPendingRange(null);
    setError(null);
  }

  function handleCharTap(cpIdx: number) {
    if (selectPhase === "picking-start") {
      setTapStartIdx(cpIdx);
      setSelectPhase("picking-end");
    } else if (selectPhase === "picking-end" && tapStartIdx !== null) {
      if (cpIdx < tapStartIdx) {
        // User tapped before the current start — re-pick start
        setTapStartIdx(cpIdx);
      } else {
        // Confirm range [tapStartIdx, cpIdx] (both inclusive in code-point space)
        const startEntry = chars[tapStartIdx];
        const endEntry = chars[cpIdx];
        const cuStart = startEntry.cuStart;
        const cuEnd = endEntry.cuEnd; // exclusive
        const excerpt = originalText.slice(cuStart, cuEnd);
        setPendingRange({ start: cuStart, end: cuEnd, excerpt });
        setCorrectedInput("");
        setCommentInput("");
        setSelectPhase(null);
        setTapStartIdx(null);
      }
    }
  }

  async function handleSubmit() {
    if (!pendingRange || !correctedInput.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/peer-corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diaryEntryId: entryId,
          startOffset: pendingRange.start,
          endOffset: pendingRange.end,
          originalExcerpt: pendingRange.excerpt,
          correctedText: correctedInput.trim(),
          comment: commentInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || t("peerCorrection.error"));
        return;
      }
      const newC = data.correction as PeerCorrection;
      setCorrections((prev) =>
        [...prev, newC].sort((a, b) => a.start_offset - b.start_offset)
      );
      setActiveId(newC.id);
      setPendingRange(null);
      setTimeout(() => {
        cardRefs[newC.id]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    } catch {
      setError(t("peerCorrection.error"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(cid: string) {
    const res = await fetch(`/api/peer-corrections/${cid}`, { method: "DELETE" });
    if (res.ok) {
      setCorrections((prev) => prev.filter((c) => c.id !== cid));
      if (activeId === cid) setActiveId(null);
      if (editingId === cid) setEditingId(null);
    }
  }

  async function handleSaveEdit(cid: string) {
    if (!correctedInput.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/peer-corrections/${cid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correctedText: correctedInput.trim(),
          comment: commentInput.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || t("peerCorrection.error"));
        return;
      }
      setCorrections((prev) =>
        prev.map((c) =>
          c.id === cid
            ? { ...c, corrected_text: data.correction.corrected_text, comment: data.correction.comment }
            : c
        )
      );
      setEditingId(null);
    } catch {
      setError(t("peerCorrection.error"));
    } finally {
      setSubmitting(false);
    }
  }

  const canAdd = !isOwner && isPublic;
  const isSelecting = selectPhase !== null;

  return (
    <div className="space-y-4">
      {/* Section heading */}
      <div className="flex items-center gap-2">
        <h2 className="font-serif text-xl font-bold text-pine">{t("peerCorrection.title")}</h2>
        {!loading && corrections.length > 0 && (
          <span className="rounded-full bg-mint px-2 py-0.5 text-xs font-bold text-pine">
            {corrections.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="py-4 text-center text-sm text-muted">…</div>
      ) : (
        <>
          {/* Original text with correction highlights */}
          <div className="rounded-2xl border border-line bg-paper/60 px-5 py-4">
            {corrections.length > 0 ? (
              <>
                <HighlightedText
                  text={originalText}
                  corrections={corrections}
                  activeId={activeId}
                  onClickRange={handleClickRange}
                />
                {canAdd && !isSelecting && !pendingRange && (
                  <p className="mt-2 text-[11px] text-muted">{t("peerCorrection.clickHighlight")}</p>
                )}
              </>
            ) : (
              <p className="font-jp text-base leading-relaxed text-ink whitespace-pre-wrap">
                {originalText}
              </p>
            )}
          </div>

          {/* "Add a correction" button */}
          {canAdd && !isSelecting && !pendingRange && (
            <button
              onClick={enterSelectMode}
              className="flex items-center gap-1.5 rounded-full border border-moss/40 bg-mint/30 px-4 py-2 text-sm font-semibold text-pine transition-colors hover:bg-mint/60"
            >
              <Icon.pen className="h-3.5 w-3.5" />
              {t("peerCorrection.addBtn")}
            </button>
          )}

          {/* Tap-to-select mode */}
          {canAdd && isSelecting && (
            <div className="space-y-3 rounded-2xl border border-moss/30 bg-mint/10 p-4">
              <p className="text-sm font-semibold text-pine">
                {selectPhase === "picking-start"
                  ? t("peerCorrection.tapFirstChar")
                  : t("peerCorrection.tapLastChar")}
              </p>
              <div className="rounded-xl bg-paper px-4 py-3">
                <TappableText
                  chars={chars}
                  phase={selectPhase!}
                  tapStartIdx={tapStartIdx}
                  onTap={handleCharTap}
                />
              </div>
              <button onClick={cancelAdd} className="text-sm text-muted hover:text-ink">
                {t("peerCorrection.cancelBtn")}
              </button>
            </div>
          )}

          {/* Correction form — after range is confirmed */}
          {canAdd && pendingRange && (
            <div className="space-y-3 rounded-2xl border border-moss/30 bg-mint/20 p-4">
              <p className="text-sm font-semibold text-pine">
                {t("peerCorrection.correcting")}:{" "}
                <span className="font-jp font-bold">「{pendingRange.excerpt}」</span>
              </p>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted">
                  {t("peerCorrection.correctedLabel")}
                </label>
                <input
                  type="text"
                  value={correctedInput}
                  onChange={(e) => setCorrectedInput(e.target.value)}
                  placeholder={t("peerCorrection.correctionPlaceholder")}
                  className="mt-1 block w-full rounded-xl border border-line bg-paper px-3 py-2 font-jp text-sm text-ink placeholder:text-muted focus:border-moss focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted">
                  {t("peerCorrection.commentLabel")}
                </label>
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder={t("peerCorrection.commentPlaceholder")}
                  className="mt-1 block w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-moss focus:outline-none"
                />
              </div>
              {error && <p className="text-sm text-apricot">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={!correctedInput.trim() || submitting}
                  className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-cream disabled:opacity-60"
                >
                  {submitting ? t("peerCorrection.submitting") : t("peerCorrection.submitBtn")}
                </button>
                <button
                  onClick={cancelAdd}
                  className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink hover:bg-mint/40"
                >
                  {t("peerCorrection.cancelBtn")}
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {corrections.length === 0 && !isSelecting && !pendingRange && (
            <p className="py-2 text-center text-sm text-muted">
              {isOwner ? t("peerCorrection.noCorrectionsOwner") : t("peerCorrection.noCorrections")}
            </p>
          )}

          {/* Corrections list */}
          {corrections.length > 0 && (
            <div className="space-y-3">
              {corrections.map((c) => {
                const profile = resolveProfile(c.profiles);
                const name = profile?.display_name || profile?.username || "Learner";
                const initials = name.slice(0, 2).toUpperCase();
                const isMine = c.corrector_id === currentUserId;
                const isActive = activeId === c.id;
                const isEditing = editingId === c.id;

                return (
                  <div
                    key={c.id}
                    ref={(el) => {
                      cardRefs[c.id] = el;
                    }}
                    className={`rounded-2xl border p-4 space-y-2 transition-colors ${
                      isActive ? "border-moss/40 bg-mint/30" : "border-line bg-paper/60"
                    }`}
                  >
                    {/* Corrector header row */}
                    <div className="flex items-center gap-2">
                      {profile?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profile.avatar_url}
                          alt={name}
                          className="h-7 w-7 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <Avatar initials={initials} size={28} />
                      )}
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
                        {profile?.username ? (
                          <Link
                            href={`/profile/${profile.username}`}
                            className="text-sm font-semibold text-pine hover:text-moss-600"
                          >
                            {name}
                          </Link>
                        ) : (
                          <span className="text-sm font-semibold text-pine">{name}</span>
                        )}
                        {c.corrector_level && (
                          <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-pine">
                            {c.corrector_level}
                          </span>
                        )}
                        <span className="text-xs text-muted">{relativeTime(c.created_at)}</span>
                      </div>
                      {(isMine || isOwner) && !isEditing && (
                        <div className="flex shrink-0 gap-1">
                          {isMine && (
                            <button
                              onClick={() => {
                                setEditingId(c.id);
                                setCorrectedInput(c.corrected_text);
                                setCommentInput(c.comment ?? "");
                                setError(null);
                              }}
                              className="rounded-full p-1.5 text-muted hover:bg-mint hover:text-pine"
                              aria-label={t("peerCorrection.editBtn")}
                            >
                              <Icon.pen className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="rounded-full p-1.5 text-muted hover:bg-apricot/10 hover:text-apricot"
                            aria-label={t("peerCorrection.deleteBtn")}
                          >
                            <Icon.trash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Correction body */}
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={correctedInput}
                          onChange={(e) => setCorrectedInput(e.target.value)}
                          className="block w-full rounded-xl border border-line bg-paper px-3 py-2 font-jp text-sm text-ink focus:border-moss focus:outline-none"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          placeholder={t("peerCorrection.commentPlaceholder")}
                          className="block w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-moss focus:outline-none"
                        />
                        {error && <p className="text-sm text-apricot">{error}</p>}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(c.id)}
                            disabled={!correctedInput.trim() || submitting}
                            className="rounded-full bg-pine px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-60"
                          >
                            {submitting ? t("peerCorrection.submitting") : t("peerCorrection.saveBtn")}
                          </button>
                          <button
                            onClick={() => { setEditingId(null); setError(null); }}
                            className="rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink"
                          >
                            {t("peerCorrection.cancelBtn")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 pl-9">
                        <div className="flex items-start gap-2 text-sm">
                          <span className="mt-0.5 shrink-0 text-xs font-bold uppercase tracking-wide text-muted">
                            {t("peerCorrection.original")}
                          </span>
                          <span className="font-jp text-ink/60 line-through">{c.original_excerpt}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <span className="mt-0.5 shrink-0 text-xs font-bold uppercase tracking-wide text-pine">
                            {t("peerCorrection.corrected")}
                          </span>
                          <span className="font-jp font-semibold text-pine">{c.corrected_text}</span>
                        </div>
                        {c.comment && (
                          <p className="text-sm text-ink/70">{c.comment}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
