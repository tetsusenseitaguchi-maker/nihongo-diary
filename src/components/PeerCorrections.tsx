"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { Avatar } from "@/components/ObiePhoto";
import { relativeTime } from "@/lib/activity";
import { useT } from "@/contexts/locale";
import { countryFlag } from "@/lib/countryFlag";
import { segmentJapanese } from "@/lib/segmenter";
import { ReplySection } from "@/components/ReplySection";
import { ReportButton } from "@/components/ReportButton";

type ProfileSnap = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  country: string | null;
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

// One tappable segment produced by TinySegmenter.
// cuStart/cuEnd are code-unit (UTF-16) offsets into originalText, matching
// the start_offset / end_offset columns in peer_corrections.
type SegmentEntry = {
  text: string;
  cuStart: number;
  cuEnd: number;
  isTappable: boolean;
};

function buildSegmentEntries(text: string): SegmentEntry[] {
  const words = segmentJapanese(text);
  const entries: SegmentEntry[] = [];
  let cu = 0;

  for (const word of words) {
    // Split each segment on newlines so line breaks render correctly.
    let pos = 0;
    while (pos < word.length) {
      const nlIdx = word.indexOf("\n", pos);
      if (nlIdx === -1) {
        const sub = word.slice(pos);
        entries.push({
          text: sub,
          cuStart: cu + pos,
          cuEnd: cu + pos + sub.length,
          isTappable: sub.trim().length > 0,
        });
        pos = word.length;
      } else {
        if (nlIdx > pos) {
          const sub = word.slice(pos, nlIdx);
          entries.push({
            text: sub,
            cuStart: cu + pos,
            cuEnd: cu + nlIdx,
            isTappable: sub.trim().length > 0,
          });
        }
        entries.push({
          text: "\n",
          cuStart: cu + nlIdx,
          cuEnd: cu + nlIdx + 1,
          isTappable: false,
        });
        pos = nlIdx + 1;
      }
    }
    cu += word.length;
  }
  return entries;
}

function resolveProfile(raw: PeerCorrection["profiles"]): ProfileSnap | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

// Shows original_text with underlines on corrected ranges.
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
    const segEnd = Math.min(c.end_offset, text.length);
    if (c.start_offset > pos) {
      segs.push({ text: text.slice(pos, c.start_offset), cid: null });
    }
    if (segEnd > Math.max(pos, c.start_offset)) {
      segs.push({ text: text.slice(Math.max(pos, c.start_offset), segEnd), cid: c.id });
      pos = segEnd;
    }
  }
  if (pos < text.length) segs.push({ text: text.slice(pos), cid: null });

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

// Renders TinySegmenter segments as tappable word-buttons.
// In "picking-start": every tappable segment is a neutral button.
// In "picking-end": tapStartSegIdx and any hovered range are highlighted.
// Mouse hover (desktop) previews the range before confirming.
// onPointerDown fires on both touch and click without 300 ms delay.
function TappableText({
  segments,
  phase,
  tapStartSegIdx,
  onTap,
}: {
  segments: SegmentEntry[];
  phase: "picking-start" | "picking-end";
  tapStartSegIdx: number | null;
  onTap: (segIdx: number) => void;
}) {
  const [hoverSegIdx, setHoverSegIdx] = useState<number | null>(null);

  return (
    <div className="font-jp text-base leading-relaxed text-ink select-none break-words">
      {segments.map((seg, segIdx) => {
        if (seg.text === "\n") return <br key={segIdx} />;
        if (!seg.isTappable) return <span key={segIdx}>{seg.text}</span>;

        let inRange = false;
        if (phase === "picking-end" && tapStartSegIdx !== null) {
          const previewEnd =
            hoverSegIdx !== null && hoverSegIdx >= tapStartSegIdx
              ? hoverSegIdx
              : tapStartSegIdx;
          inRange = segIdx >= tapStartSegIdx && segIdx <= previewEnd;
        }

        return (
          <button
            key={segIdx}
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              onTap(segIdx);
            }}
            onMouseEnter={() => phase === "picking-end" && setHoverSegIdx(segIdx)}
            onMouseLeave={() => phase === "picking-end" && setHoverSegIdx(null)}
            className={`touch-manipulation inline rounded font-jp text-base transition-colors ${
              inRange
                ? "bg-mint text-pine font-medium"
                : "text-ink hover:bg-mint/30 active:bg-mint/60"
            }`}
          >
            {seg.text}
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

  // "picking-start" → waiting for first word tap
  // "picking-end"   → start is set, waiting for end word tap
  // null            → not in selection mode
  const [selectPhase, setSelectPhase] = useState<"picking-start" | "picking-end" | null>(null);
  const [tapStartSegIdx, setTapStartSegIdx] = useState<number | null>(null);

  const [pendingRange, setPendingRange] = useState<PendingRange | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [correctedInput, setCorrectedInput] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({}).current;

  const segments = useMemo(() => buildSegmentEntries(originalText), [originalText]);

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
    setTapStartSegIdx(null);
    setPendingRange(null);
    setActiveId(null);
    setError(null);
  }

  function cancelAdd() {
    setSelectPhase(null);
    setTapStartSegIdx(null);
    setPendingRange(null);
    setError(null);
  }

  function handleSegTap(segIdx: number) {
    if (selectPhase === "picking-start") {
      setTapStartSegIdx(segIdx);
      setSelectPhase("picking-end");
    } else if (selectPhase === "picking-end" && tapStartSegIdx !== null) {
      if (segIdx < tapStartSegIdx) {
        // Tapped before start → re-pick the start position
        setTapStartSegIdx(segIdx);
      } else {
        // Confirm range [tapStartSegIdx .. segIdx] (both inclusive in segment space).
        // Convert to code-unit offsets for DB storage.
        const startSeg = segments[tapStartSegIdx];
        const endSeg = segments[segIdx];
        const cuStart = startSeg.cuStart;
        const cuEnd = endSeg.cuEnd;
        const excerpt = originalText.slice(cuStart, cuEnd);
        setPendingRange({ start: cuStart, end: cuEnd, excerpt });
        setCorrectedInput("");
        setCommentInput("");
        setSelectPhase(null);
        setTapStartSegIdx(null);
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
            ? {
                ...c,
                corrected_text: data.correction.corrected_text,
                comment: data.correction.comment,
              }
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
          {/* Original text with correction underlines */}
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

          {/* Word-tap selection mode */}
          {canAdd && isSelecting && (
            <div className="space-y-3 rounded-2xl border border-moss/30 bg-mint/10 p-4">
              <p className="text-sm font-semibold text-pine">
                {selectPhase === "picking-start"
                  ? t("peerCorrection.tapFirstChar")
                  : t("peerCorrection.tapLastChar")}
              </p>
              <div className="rounded-xl bg-paper px-4 py-3">
                <TappableText
                  segments={segments}
                  phase={selectPhase!}
                  tapStartSegIdx={tapStartSegIdx}
                  onTap={handleSegTap}
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
                  className="mt-1 block w-full rounded-xl border border-line bg-paper px-3 py-2 font-jp text-base text-ink placeholder:text-muted focus:border-moss focus:outline-none"
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
                  className="mt-1 block w-full rounded-xl border border-line bg-paper px-3 py-2 text-base text-ink placeholder:text-muted focus:border-moss focus:outline-none"
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
              {isOwner
                ? t("peerCorrection.noCorrectionsOwner")
                : t("peerCorrection.noCorrections")}
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
                    className={`space-y-2 rounded-2xl border p-4 transition-colors ${
                      isActive ? "border-moss/40 bg-mint/30" : "border-line bg-paper/60"
                    }`}
                  >
                    {/* Corrector header */}
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
                        {countryFlag(profile?.country) && (
                          <span className="text-sm leading-none">{countryFlag(profile?.country)}</span>
                        )}
                        {c.corrector_level && (
                          <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-pine">
                            {c.corrector_level}
                          </span>
                        )}
                        <span className="text-xs text-muted">{relativeTime(c.created_at)}</span>
                      </div>
                      {!isEditing && (
                        <div className="flex shrink-0 items-center gap-1">
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
                          {(isMine || isOwner) && (
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="rounded-full p-1.5 text-muted hover:bg-apricot/10 hover:text-apricot"
                              aria-label={t("peerCorrection.deleteBtn")}
                            >
                              <Icon.trash className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {!isMine && (
                            <ReportButton targetType="peer_correction" targetId={c.id} />
                          )}
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
                          className="block w-full rounded-xl border border-line bg-paper px-3 py-2 font-jp text-base text-ink focus:border-moss focus:outline-none"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          placeholder={t("peerCorrection.commentPlaceholder")}
                          className="block w-full rounded-xl border border-line bg-paper px-3 py-2 text-base text-ink placeholder:text-muted focus:border-moss focus:outline-none"
                        />
                        {error && <p className="text-sm text-apricot">{error}</p>}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(c.id)}
                            disabled={!correctedInput.trim() || submitting}
                            className="rounded-full bg-pine px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-60"
                          >
                            {submitting
                              ? t("peerCorrection.submitting")
                              : t("peerCorrection.saveBtn")}
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setError(null);
                            }}
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
                          <span className="font-jp text-ink/60 line-through">
                            {c.original_excerpt}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <span className="mt-0.5 shrink-0 text-xs font-bold uppercase tracking-wide text-pine">
                            {t("peerCorrection.corrected")}
                          </span>
                          <span className="font-jp font-semibold text-pine">
                            {c.corrected_text}
                          </span>
                        </div>
                        {c.comment && <p className="text-sm text-ink/70">{c.comment}</p>}
                        <ReplySection
                          parentType="peer_correction"
                          parentId={c.id}
                          currentUserId={currentUserId}
                        />
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
