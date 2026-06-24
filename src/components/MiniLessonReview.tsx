"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizePlan, limitsFor } from "@/lib/plans";
import { MINI_LESSONS } from "@/lib/lessons";
import { DrillList } from "@/components/PracticeDrills";
import { Icon } from "@/components/icons";
import type { PracticeDrill } from "@/lib/types";

const LEVELS = ["N5", "N4", "N3", "Natural"] as const;

// ── MiniLessonReview ────────────────────────────────────────────────────────

export function MiniLessonReview() {
  const [plan, setPlan] = useState<string | null>(null);
  const [lessonId, setLessonId] = useState(1);
  const [level, setLevel] = useState<string>("N4");
  const [drills, setDrills] = useState<PracticeDrill[]>([]);
  const [lessonTitle, setLessonTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch plan once on mount
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setPlan("free"); return; }
      const { data } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .single();
      setPlan(normalizePlan(data?.plan));
    })();
  }, []);

  const isSupportUser = plan !== null && limitsFor(plan).reviewDrills;

  async function generate() {
    setLoading(true);
    setError(null);
    setDrills([]);
    try {
      const res = await fetch("/api/mini-lesson-drills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, level }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "問題の生成に失敗しました。もう一度お試しください。");
        return;
      }
      setLessonTitle(data.lessonTitle ?? "");
      setDrills(data.drills ?? []);
    } catch {
      setError("ネットワークエラーです。接続を確認してもう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  // ── Loading plan state ──────────────────────────────────────────────────
  if (plan === null) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted">
        Loading…
      </div>
    );
  }

  // ── Locked (free or plus) ───────────────────────────────────────────────
  if (!isSupportUser) {
    const isPlus = plan === "plus";
    return (
      <div className="space-y-4">
        <div className="rounded-[var(--radius-card)] border border-line bg-paper p-6 shadow-card">
          <div className="flex items-start gap-4">
            <span className="text-3xl">📘</span>
            <div className="min-w-0 flex-1">
              <h3 className="font-serif text-lg font-bold text-pine">
                Mini Lesson Review Drills
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-ink/75">
                {isPlus
                  ? "AI-generated review drills for each Mini Lesson are available on the Pro plan."
                  : "Pick any Mini Lesson and Obie generates 5 targeted practice drills just for you."}
              </p>

              {/* Preview of what it looks like */}
              <div className="mt-4 space-y-2 opacity-50 pointer-events-none select-none">
                <div className="rounded-xl border border-dashed border-line p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-5 w-5 rounded-full bg-pine/20" />
                    <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-bold text-pine">Particles</span>
                  </div>
                  <p className="font-jp text-sm text-ink/60">学校___行きます。</p>
                  <div className="mt-2 flex gap-2">
                    {["に", "を", "で", "が"].map((c) => (
                      <span key={c} className="rounded-full border border-line px-3 py-1 text-xs text-muted">{c}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3 rounded-xl bg-sand/60 px-4 py-3">
                <span className="text-lg">🔒</span>
                <p className="text-sm font-medium text-ink/80">
                  {isPlus ? "Available on " : "Available on "}
                  <a href="/upgrade" className="font-semibold text-moss-600 hover:text-pine">
                    Pro plan and above →
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Unlocked ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <p className="text-sm text-ink/70">
        Choose a Mini Lesson and your level — Obie will generate 5 review drills just for you.
      </p>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        {/* Lesson picker */}
        <select
          value={lessonId}
          onChange={(e) => { setLessonId(Number(e.target.value)); setDrills([]); }}
          className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-2 text-sm font-medium text-pine focus:outline-none focus:ring-2 focus:ring-moss/40"
        >
          {MINI_LESSONS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.order}. {l.title}
            </option>
          ))}
        </select>

        {/* Level picker */}
        <select
          value={level}
          onChange={(e) => { setLevel(e.target.value); setDrills([]); }}
          className="rounded-xl border border-line bg-paper px-3 py-2 text-sm font-medium text-pine focus:outline-none focus:ring-2 focus:ring-moss/40"
        >
          {LEVELS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>

        {/* Generate button */}
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-pine px-5 py-2 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cream/30 border-t-cream" />
              Generating…
            </>
          ) : (
            <>
              <Icon.sparkle className="h-4 w-4" />
              Generate drills
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-lg bg-apricot/10 px-3 py-2 text-sm text-apricot">
          {error}
        </p>
      )}

      {/* Drills */}
      {drills.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <h3 className="font-serif text-lg font-bold text-pine">
              📘 {lessonTitle}
            </h3>
            <span className="text-xs text-muted">{level} · {drills.length} drills</span>
          </div>
          <DrillList drills={drills} />
        </div>
      )}

      {/* Empty state — before first generation */}
      {!loading && drills.length === 0 && !error && (
        <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-line py-10 text-center">
          <span className="text-2xl">📘</span>
          <p className="text-sm font-medium text-pine">Pick a lesson and hit Generate</p>
          <p className="text-xs text-muted">Obie will create 5 tailored drills for you.</p>
        </div>
      )}
    </div>
  );
}
