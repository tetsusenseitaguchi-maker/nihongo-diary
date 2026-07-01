"use client";

import { useState, useEffect, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import dynamicLoad from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { GoalRing } from "@/components/GoalRing";
import { Attachments } from "@/components/Attachments";
import { CorrectionResult } from "@/components/CorrectionResult";
import { Furigana } from "@/components/Furigana";
import { Bilingual } from "@/components/Bilingual";
import { templates, sampleDraft } from "@/lib/mock-data";
import type { Level, CorrectionStyle, Correction, DiaryPlace, MistakeItem } from "@/lib/types";
import { GrammarReviewCard } from "@/components/GrammarReviewCard";
import { limitsFor, normalizePlan, PLAN_LABELS, PLAN_LIMITS, type Plan } from "@/lib/plans";
import { PRESET_TAGS, PRESET_TAG_KEYS } from "@/lib/tags";
import { useT } from "@/contexts/locale";
import { todayInTZ } from "@/lib/date-tz";

const DiaryMapPicker = dynamicLoad(
  () => import("@/components/DiaryMapPicker").then((m) => m.DiaryMapPicker),
  {
    ssr: false,
    loading: () => <div className="h-72 animate-pulse rounded-2xl bg-mint/30" />,
  }
);

const levels: Level[] = ["N5", "N4", "N3", "Natural"];
const styles: CorrectionStyle[] = ["Light", "Natural", "Native"];
const styleJP: Record<CorrectionStyle, string> = {
  Light: "ていねい",
  Natural: "です・ます体",
  Native: "ナチュラル",
};
const DEFAULT_MOODS = ["😊 Happy", "🙂 Okay", "😌 Calm", "😴 Tired", "😣 Tough"];
const DEFAULT_WEATHERS = ["☀️ Sunny", "☁️ Cloudy", "🌧️ Rainy"];

const tips = [
  { jp: "使(つか)った単語(たんご)をチェックしよう", en: "Check the words you used" },
  { jp: "文(ぶん)のつながりを意識(いしき)しよう", en: "Notice how your sentences connect" },
  { jp: "自分(じぶん)の気持(きも)ちを書(か)こう", en: "Write how you feel" },
];

// Display only: the date shown in the notebook header (when the page was opened).
function todayISO() {
  return new Date().toLocaleDateString("en-CA");
}

// Read the user_tz cookie (set by TimezoneSyncer) so date calculations stay in
// sync with the same timezone used by layout.tsx and dashboard/page.tsx.
// Falls back to the browser's own IANA timezone if the cookie isn't set yet.
function getClientTZ(): string {
  const match = document.cookie.match(/(?:^|;\s*)user_tz=([^;]+)/);
  const raw = match ? decodeURIComponent(match[1]) : null;
  if (raw) {
    try {
      new Intl.DateTimeFormat("en-CA", { timeZone: raw });
      return raw;
    } catch { /* invalid cookie value */ }
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function jpDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function Selector({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex min-w-0 flex-col rounded-xl border border-line bg-paper/80 px-3 py-1.5 text-left transition-colors hover:border-moss"
    >
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
        {label}
      </span>
      <span className="flex items-center gap-1 truncate text-sm font-semibold text-pine">
        {value} <span className="text-muted">▾</span>
      </span>
    </button>
  );
}

export default function WritePage() {
  const [date] = useState(todayISO());
  const [tags, setTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [text, setText] = useState("");
  const [level, setLevel] = useState(1);
  const [style, setStyle] = useState(1);

  // Prefill from /write?starter=... (e.g. when coming from a template)
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("starter");
    if (s) setText((prev) => (prev ? prev : s));
  }, []);

  // Detect Capacitor native iOS shell — upgrade CTAs are hidden inside the app store build
  useEffect(() => {
    type CapWindow = Window & { Capacitor?: { isNativePlatform?: () => boolean } };
    if ((window as CapWindow).Capacitor?.isNativePlatform?.()) {
      setIsIosApp(true);
    }
  }, []);
  const [mood, setMood] = useState(0);
  const [weather, setWeather] = useState(0);
  const [result, setResult] = useState<Correction | null>(null);
  const [loading, setLoading] = useState(false);
  const [correctError, setCorrectError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  const [justSaving, setJustSaving] = useState(false);
  const [justSaveError, setJustSaveError] = useState<string | null>(null);
  const [seekingPeer, setSeekingPeer] = useState(false);
  const [seekPeerError, setSeekPeerError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [places, setPlaces] = useState<DiaryPlace[]>([]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [grammarReview, setGrammarReview] = useState<MistakeItem | null>(null);

  // Plan + usage
  const [plan, setPlan] = useState<Plan>("free");
  const [usedToday, setUsedToday] = useState(0);
  // True when running inside the Capacitor iOS native app — suppress paid upgrade CTAs
  const [isIosApp, setIsIosApp] = useState(false);
  const router = useRouter();
  const t = useT();
  const moods = (t("write.moods") || DEFAULT_MOODS.join("|")).split("|");
  const weathers = (t("write.weathers") || DEFAULT_WEATHERS.join("|")).split("|");

  const limits = limitsFor(plan);
  const remaining = Math.max(0, limits.corrections - usedToday);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const today = todayInTZ(getClientTZ());
      const [{ data: prof }, { data: usage }, { data: reviewRow }] = await Promise.all([
        supabase.from("profiles").select("plan").eq("id", user.id).single(),
        supabase.from("usage_limits").select("correction_count").eq("user_id", user.id).eq("usage_date", today).maybeSingle(),
        supabase.from("diary_entries").select("grammar_focus").eq("user_id", user.id).not("grammar_focus", "is", null).lt("diary_date", today).order("diary_date", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setPlan(normalizePlan(prof?.plan));
      setUsedToday(usage?.correction_count ?? 0);
      if (reviewRow?.grammar_focus) setGrammarReview(reviewRow.grammar_focus as MistakeItem);
    })();
  }, []);


  const len = text.trim().length;
  const maxChars = limits.maxChars;
  const overLimit = len > maxChars;
  const goalPct = Math.min(100, Math.round((len / 50) * 100));

  async function handleCorrect() {
    if (!text.trim() || overLimit) return;
    setLoading(true);
    setCorrectError(null);
    setShowUpgrade(false);
    setSaveError(null);
    setResult(null);
    setSavedEntryId(null);
    try {
      const res = await fetch("/api/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          level: levels[level],
          style: styles[style],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          // Daily correction limit — show the friendly plan-specific banner, not a red error
          setShowUpgrade(true);
          setCorrectError(null);
          // Force remaining=0 so the button disables immediately (avoids repeated 429 clicks)
          setUsedToday(limits.corrections);
        } else {
          setCorrectError(data?.error || "Correction failed. Please try again.");
          if (data?.upgrade) setShowUpgrade(true);
        }
        setLoading(false);
        return;
      }
      setUsedToday((n) => n + 1);

      // Map the API response into the shape the UI + Supabase use.
      // We keep the ruby (furigana) versions for display.
      const correction: Correction = {
        original: data.original ?? text,
        corrected: data.correctedJapaneseRuby || data.correctedJapanese || "",
        natural: data.naturalJapaneseRuby || data.naturalJapanese || "",
        explanation: data.englishExplanation ?? "",
        correctionNote: data.correctionNote ?? "",
        mistakes: (data.keyMistakes ?? []).map(
          (m: { mistake?: string; mistakeRuby?: string; correction?: string; correctionRuby?: string; explanation?: string }) => ({
            before: m.mistakeRuby || m.mistake || "",
            after: m.correctionRuby || m.correction || "",
            note: m.explanation ?? "",
          }),
        ),
        vocabulary: (data.usefulVocabulary ?? []).map(
          (v: { word?: string; reading?: string; wordRuby?: string; meaning?: string; example?: string; exampleRuby?: string }) => ({
            word: v.word || (v.wordRuby ? v.wordRuby.replace(/<[^>]*>/g, "") : "") || "",
            reading: v.reading || "",
            meaning: v.meaning ?? "",
            example: v.exampleRuby || v.example || "",
          }),
        ),
        practice: { jp: data.practiceSentenceRuby || data.practiceSentence || "", en: "" },
        relatedMiniLesson: data.relatedMiniLesson ?? null,
        practiceDrills: (data.practiceDrills ?? []).map(
          (d: { type?: string; question?: string; questionRuby?: string; choices?: string[]; answer?: string; answerRuby?: string; englishExplanation?: string }) => ({
            type: d.type ?? "fill-in",
            question: d.question ?? "",
            questionRuby: d.questionRuby ?? "",
            choices: Array.isArray(d.choices) ? d.choices : [],
            answer: d.answer ?? "",
            answerRuby: d.answerRuby ?? "",
            englishExplanation: d.englishExplanation ?? "",
          })
        ),
        nextVocab: (data.nextVocab ?? []).map(
          (v: { word?: string; reading?: string; meaning?: string; level?: string }) => ({
            word: v.word ?? "",
            reading: v.reading ?? "",
            meaning: v.meaning ?? "",
            level: v.level ?? "",
          })
        ),
        nextGrammar: (data.nextGrammar ?? []).map(
          (g: { pattern?: string; explanation?: string; exampleRuby?: string }) => ({
            pattern: g.pattern ?? "",
            explanation: g.explanation ?? "",
            exampleRuby: g.exampleRuby ?? "",
          })
        ),
        alternativeWords: (data.alternativeWords ?? []).map(
          (a: { original?: string; alternative?: string; alternativeReading?: string }) => ({
            original: a.original ?? "",
            alternative: a.alternative ?? "",
            alternativeReading: a.alternativeReading ?? "",
          })
        ),
        diaryTitle: data.diaryTitleRuby || "",
        obieCheer: data.obieCheerRuby || "",
        obiePhraseRuby: data.obiePhraseRuby || "",
        obiePhraseExplanation: data.obiePhraseExplanation || "",
        grammarFocus: (() => {
          const km = (data.keyMistakes ?? [])[0];
          if (!km || !km.mistake) return null;
          return {
            before: km.mistakeRuby || km.mistake || "",
            after: km.correctionRuby || "",
            note: km.explanation || "",
          } satisfies MistakeItem;
        })(),
      };
      setResult(correction);
      setLoading(false);   // show result immediately; save happens next

      // Auto-save: diary is persisted as part of the correction flow
      setSaving(true);
      try {
        const id = await saveEntry(correction);
        setSavedEntryId(id);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSaving(false);
      }
    } catch {
      setCorrectError(t("write.networkError"));
      setLoading(false);
    }
  }

  // Core save logic — inserts the entry and returns its ID. Does NOT navigate.
  async function saveEntry(correction: Correction): Promise<string> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Compute diary_date at submission time using the same timezone as the streak
    // logic (layout.tsx / diary.ts). If the user writes across midnight their diary
    // is filed under the calendar day they actually submitted, not when they opened
    // the page.
    const diaryDate = todayInTZ(getClientTZ());

    const { data, error } = await supabase
      .from("diary_entries")
      .insert({
        user_id: user.id,
        diary_date: diaryDate,
        title: correction.diaryTitle
          ? correction.diaryTitle
              .replace(
                /([一-鿿々〆ヶ]+)(<ruby>([^<]*)<rt>)/g,
                (_m, preK: string, rubyOpen: string, rubyBase: string) =>
                  rubyBase.startsWith(preK) ? rubyOpen : _m,
              )
              .replace(/<rt>[^<]*<\/rt>/g, "")
              .replace(/<[^>]*>/g, "")
              .trim() || null
          : null,
        tags,
        original_text: correction.original,
        corrected_japanese: correction.corrected,
        natural_japanese: correction.natural,
        english_explanation: correction.explanation,
        correction_note: correction.correctionNote ?? "",
        key_mistakes: correction.mistakes,
        grammar_focus: correction.grammarFocus ?? null,
        useful_vocabulary: correction.vocabulary,
        practice_sentence: correction.practice.jp,
        level: levels[level],
        correction_style: styles[style],
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    let imagePath: string | null = null;
    let audioPath: string | null = null;

    if (photoFile) {
      const ext = photoFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const storagePath = `${user.id}/${data.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("diary-images")
        .upload(storagePath, photoFile, { contentType: photoFile.type });
      if (upErr) {
        await supabase.from("diary_entries").delete().eq("id", data.id);
        throw new Error(`Photo upload failed: ${upErr.message}`);
      }
      imagePath = storagePath;
    }

    if (audioFile) {
      const ext = audioFile.name.split(".").pop()?.toLowerCase() ?? "webm";
      const storagePath = `${user.id}/${data.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("diary-audio")
        .upload(storagePath, audioFile, { contentType: audioFile.type });
      if (upErr) {
        if (imagePath) await supabase.storage.from("diary-images").remove([imagePath]);
        await supabase.from("diary_entries").delete().eq("id", data.id);
        throw new Error(`Audio upload failed: ${upErr.message}`);
      }
      audioPath = storagePath;
    }

    if (imagePath || audioPath) {
      await supabase
        .from("diary_entries")
        .update({ image_path: imagePath, audio_path: audioPath })
        .eq("id", data.id);
    }

    if (places.length > 0) {
      await supabase.from("diary_places").insert(
        places.map((p) => ({
          diary_entry_id: data.id,
          user_id: user.id,
          lat: p.lat,
          lng: p.lng,
          place_name: p.name || null,
        }))
      );
    }

    if (correction.alternativeWords?.length) {
      supabase
        .from("diary_entries")
        .update({
          alternative_words: correction.alternativeWords ?? [],
        })
        .eq("id", data.id)
        .then(() => {});
    }

    await supabase.from("activity_feed").insert({
      user_id: user.id,
      activity_type: "wrote_diary",
      diary_entry_id: data.id,
      metadata: { diary_date: diaryDate, is_public: false },
    });

    return data.id;
  }

  // Save diary without running AI correction — does not consume any correction count.
  async function saveWithoutCorrection(opts?: { isPublic?: boolean; seekingPeerCorrection?: boolean }): Promise<string> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const diaryDate = todayInTZ(getClientTZ());

    const { data, error } = await supabase
      .from("diary_entries")
      .insert({
        user_id: user.id,
        diary_date: diaryDate,
        tags,
        original_text: text.trim(),
        level: levels[level],
        correction_style: styles[style],
        is_public: opts?.isPublic ?? false,
        seeking_peer_correction: opts?.seekingPeerCorrection ?? false,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    if (photoFile) {
      const ext = photoFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const storagePath = `${user.id}/${data.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("diary-images")
        .upload(storagePath, photoFile, { contentType: photoFile.type });
      if (upErr) {
        await supabase.from("diary_entries").delete().eq("id", data.id);
        throw new Error(`Photo upload failed: ${upErr.message}`);
      }
      await supabase.from("diary_entries").update({ image_path: storagePath }).eq("id", data.id);
    }

    if (audioFile) {
      const ext = audioFile.name.split(".").pop()?.toLowerCase() ?? "webm";
      const storagePath = `${user.id}/${data.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("diary-audio")
        .upload(storagePath, audioFile, { contentType: audioFile.type });
      if (upErr) {
        await supabase.from("diary_entries").delete().eq("id", data.id);
        throw new Error(`Audio upload failed: ${upErr.message}`);
      }
      await supabase.from("diary_entries").update({ audio_path: storagePath }).eq("id", data.id);
    }

    if (places.length > 0) {
      await supabase.from("diary_places").insert(
        places.map((p) => ({
          diary_entry_id: data.id,
          user_id: user.id,
          lat: p.lat,
          lng: p.lng,
          place_name: p.name || null,
        }))
      );
    }

    await supabase.from("activity_feed").insert({
      user_id: user.id,
      activity_type: "wrote_diary",
      diary_entry_id: data.id,
      metadata: { diary_date: diaryDate, is_public: opts?.isPublic ?? false },
    });

    return data.id;
  }

  async function handleSeekPeerCorrection() {
    if (!text.trim() || overLimit || loading || seekingPeer || justSaving || saving) return;
    setSeekingPeer(true);
    setSeekPeerError(null);
    try {
      const id = await saveWithoutCorrection({ isPublic: true, seekingPeerCorrection: true });
      router.push(`/diary/${id}`);
    } catch (err) {
      setSeekPeerError(err instanceof Error ? err.message : t("write.seekPeerError"));
    } finally {
      setSeekingPeer(false);
    }
  }

  async function handleJustSave() {
    if (!text.trim() || overLimit || loading || justSaving || saving) return;
    setJustSaving(true);
    setJustSaveError(null);
    try {
      const id = await saveWithoutCorrection();
      router.push(`/diary/${id}`);
    } catch (err) {
      setJustSaveError(err instanceof Error ? err.message : t("write.justSaveError"));
    } finally {
      setJustSaving(false);
    }
  }

  // Manual save retry — only reachable when auto-save failed.
  async function handleSave() {
    if (!result || savedEntryId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const id = await saveEntry(result);
      setSavedEntryId(id);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function cycle(setter: (fn: (n: number) => number) => void, len: number) {
    setter((n) => (n + 1) % len);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-pine">
          <Furigana text="日記(にっき)を書(か)く" />
        </h1>
        <span className="text-sm font-medium text-muted">{t("write.writeDiary")}</span>
        <span className="text-xl">🌸</span>
      </div>

      {/* Plan + remaining */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-line bg-paper px-4 py-2 text-sm">
        <span className="font-semibold text-pine">{t("write.planLabel", { plan: PLAN_LABELS[plan] })}</span>
        <span className="text-line">·</span>
        <span className={remaining > 0 ? "text-ink/70" : "font-semibold text-apricot"}>
          {remaining > 0
            ? t("write.correctionsLeft", { remaining, total: limits.corrections })
            : t("write.noCorrectionsLeft")}
        </span>
        {plan === "free" && (
          <a href="/upgrade" className="ml-auto font-semibold text-moss-600 hover:text-pine">
            {t("write.upgradeLink")}
          </a>
        )}
      </div>

      {showUpgrade && (
        <div className="gloss-panel flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] p-4" style={{ ["--tint" as string]: "var(--color-tint-sand)" } as CSSProperties}>
          <p className="text-sm text-ink/80">
            {plan === "free" && t("write.limitReachedFree", {
              limit: limits.corrections,
              plusLimit: PLAN_LIMITS.plus.corrections,
            })}
            {plan === "plus" && t("write.limitReachedPlus", {
              limit: limits.corrections,
              proLimit: PLAN_LIMITS.pro.corrections,
            })}
            {(plan === "pro" || plan === "teacher_feedback") && t("write.limitReachedPro", {
              limit: limits.corrections,
            })}
          </p>
          {/* iOS native app: hide all paid upgrade CTAs (App Store policy) */}
          {!isIosApp && plan === "free" && (
            <a href="/upgrade" className="gloss-btn shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-cream hover:brightness-105">
              {t("write.upgradeToPlus")}
            </a>
          )}
          {!isIosApp && plan === "plus" && (
            <a href="/upgrade" className="gloss-btn shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-cream hover:brightness-105">
              {t("write.upgradeToPro")}
            </a>
          )}
        </div>
      )}

      {grammarReview && !result && (
        <GrammarReviewCard item={grammarReview} />
      )}

      <div className="grid gap-6 lg:grid-cols-[1.55fr_0.85fr]">
        {/* Notebook */}
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper shadow-lift">
            {/* spiral binding */}
            <div className="spiral absolute inset-y-3 left-2 w-3" aria-hidden />
            {/* bookmark ribbon */}
            <div className="absolute right-7 top-0 h-12 w-7 rounded-b-md bg-pine" aria-hidden>
              <div className="absolute bottom-0 left-0 border-x-[14px] border-t-[8px] border-x-transparent border-t-cream" />
            </div>

            <div className="pl-9 pr-6 py-6">
              {/* date */}
              <div className="mb-4 flex items-center gap-2 border-b border-line pb-3">
                <span className="font-serif text-lg font-bold text-pine">
                  {jpDate(date)}
                </span>
                <span>🌸</span>
              </div>

              {/* tag selector */}
              <div className="mb-4">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                  タグ / Tags <span className="font-normal normal-case">(optional)</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_TAGS.map((t) => {
                    const active = tags.includes(t.key);
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() =>
                          setTags((prev) =>
                            active ? prev.filter((x) => x !== t.key) : [...prev, t.key]
                          )
                        }
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          active
                            ? "bg-pine text-cream"
                            : "border border-line bg-paper text-ink/70 hover:border-moss hover:text-pine"
                        }`}
                      >
                        #{t.key} <span className={active ? "opacity-70" : "text-muted"}>{t.en}</span>
                      </button>
                    );
                  })}
                </div>
                {/* custom tag input */}
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = customTagInput.trim().replace(/^#/, "");
                        if (val && !tags.includes(val) && tags.length < 10) {
                          setTags((prev) => [...prev, val]);
                          setCustomTagInput("");
                        }
                      }
                    }}
                    maxLength={20}
                    placeholder="カスタムタグ（Enter で追加）"
                    className="flex-1 rounded-full border border-line bg-paper px-3 py-1 text-[11px] text-ink placeholder:text-muted focus:border-moss focus:outline-none"
                  />
                </div>
                {/* selected custom tags */}
                {tags.filter((t) => !PRESET_TAG_KEYS.has(t)).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tags.filter((t) => !PRESET_TAG_KEYS.has(t)).map((t) => (
                      <span
                        key={t}
                        className="flex items-center gap-1 rounded-full bg-pine px-2.5 py-1 text-[11px] font-semibold text-cream"
                      >
                        #{t}
                        <button
                          type="button"
                          onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                          className="opacity-60 hover:opacity-100"
                          aria-label={`Remove tag ${t}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* selectors */}
              <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Selector label={t("write.level")} value={levels[level]} onClick={() => cycle(setLevel, levels.length)} />
                <Selector label={t("write.style")} value={styleJP[styles[style]]} onClick={() => setStyle((n) => (n+1)%styles.length)} />
                <Selector label={t("write.mood")} value={moods[mood]} onClick={() => cycle(setMood, moods.length)} />
                <Selector label={t("write.weather")} value={weathers[weather]} onClick={() => cycle(setWeather, weathers.length)} />
              </div>

              {/* notebook paper textarea */}
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="今日は、…"
                rows={7}
                className="notebook block w-full resize-none rounded-lg bg-transparent px-3 pt-[7px] font-jp text-lg leading-[34px] text-ink placeholder:text-muted/60 focus:outline-none"
              />

              <div className="mt-3 flex items-center justify-between">
                <span className={`text-sm ${overLimit ? "font-semibold text-apricot" : "text-muted"}`}>
                  {t("write.charCount", { len, max: maxChars })}
                </span>
                <button
                  onClick={() => setText(sampleDraft)}
                  className="text-xs font-semibold text-moss-600 hover:text-pine"
                >
                  <Furigana text="サンプルを入(い)れる" /> · {t("write.loadSample")}
                </button>
              </div>

              {/* sentence starters */}
              <div className="mt-4 rounded-xl bg-mint/40 p-3">
                <p className="mb-2 text-xs font-bold text-pine">
                  <Furigana text="使(つか)ってみよう！" /> <span className="text-muted">Try a sentence starter</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {templates.slice(0, 5).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setText((p) => (p ? p : t.starter.replace(/[（(][ぁ-んァ-ヶー]+[）)]/g, "")))}
                      className="rounded-full border border-line bg-paper px-3 py-1 font-jp text-sm text-pine hover:border-moss hover:bg-mint/60"
                    >
                      <Furigana text={t.starter} />
                    </button>
                  ))}
                </div>
              </div>

              {/* actions */}
              <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                {!result && (
                  <>
                    <Button
                      variant="ghost"
                      onClick={handleJustSave}
                      disabled={!text.trim() || overLimit || loading || justSaving || seekingPeer || saving}
                    >
                      {justSaving ? t("write.justSaving") : t("write.justSave")}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleSeekPeerCorrection}
                      disabled={!text.trim() || overLimit || loading || justSaving || seekingPeer || saving}
                    >
                      {seekingPeer ? t("write.seekingPeer") : <><Icon.feed className="h-4 w-4" /> {t("write.seekPeer")}</>}
                    </Button>
                  </>
                )}
                <Button onClick={handleCorrect} disabled={!text.trim() || overLimit || loading || seekingPeer || justSaving || remaining <= 0}>
                  {loading ? (
                    t("write.correcting")
                  ) : remaining <= 0 ? (
                    t("write.limitTitle")
                  ) : (
                    <><Icon.sparkle className="h-4 w-4" /> {t("write.correctBtn")}</>
                  )}
                </Button>
              </div>
              {overLimit && (
                <p className="mt-2 text-right text-sm text-apricot">
                  {t("write.charLimit", { max: maxChars })}
                </p>
              )}
              {justSaveError && (
                <p className="mt-2 rounded-lg bg-apricot/10 px-3 py-2 text-sm text-apricot">
                  {justSaveError}
                </p>
              )}
              {seekPeerError && (
                <p className="mt-2 rounded-lg bg-apricot/10 px-3 py-2 text-sm text-apricot">
                  {seekPeerError}
                </p>
              )}
              {correctError && (
                <p className="mt-2 rounded-lg bg-apricot/10 px-3 py-2 text-sm text-apricot">
                  {correctError}
                </p>
              )}
            </div>
          </div>

          {/* attachments */}
          <Attachments
            photoFile={photoFile}
            audioFile={audioFile}
            onPhotoChange={setPhotoFile}
            onAudioChange={setAudioFile}
          />

          {/* location picker */}
          <div className="rounded-[var(--radius-card)] border border-line bg-paper shadow-card">
            <button
              type="button"
              onClick={() => setShowLocationPicker((v) => !v)}
              className="flex w-full items-center gap-2.5 px-5 py-4 text-left"
            >
              <Icon.mapPin className="h-5 w-5 shrink-0 text-moss-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-pine">
                  場所を追加 · Add location
                  {places.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-muted">
                      {places.length} ヶ所選択中
                    </span>
                  )}
                </p>
              </div>
              <span
                className={`text-muted transition-transform duration-200 ${
                  showLocationPicker ? "rotate-180" : ""
                }`}
              >
                ▾
              </span>
            </button>

            {/* selected place chips */}
            {places.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-5 pb-3">
                {places.map((p, i) => (
                  <span
                    key={`${p.lat}-${p.lng}-${i}`}
                    className="flex items-center gap-1 rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-pine"
                  >
                    📍 {p.name}
                    <button
                      type="button"
                      onClick={() =>
                        setPlaces((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="ml-0.5 opacity-60 hover:opacity-100"
                      aria-label={`Remove ${p.name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {showLocationPicker && (
              <div className="px-5 pb-5">
                <DiaryMapPicker places={places} onPlacesChange={setPlaces} />
              </div>
            )}
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          {/* Today's goal */}
          <div className="flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-paper p-5 shadow-card">
            <GoalRing value={goalPct} size={60} />
            <div>
              <p className="font-serif font-bold text-pine">{t("write.todaysGoal")}</p>
              <p className="font-jp text-sm text-ink/70"><Furigana text="日記(にっき)を書(か)こう（50文字(もじ)〜）" /></p>
              <p className="text-xs text-muted">Write a diary (50+ characters)</p>
            </div>
          </div>

          {/* Writing tips */}
          <div className="rounded-[var(--radius-card)] border border-line bg-paper p-5 shadow-card">
            <p className="mb-1 font-serif font-bold text-pine">{t("write.writingTips")}</p>
            <ul className="mt-2 space-y-3">
              {tips.map((tip) => (
                <li key={tip.en} className="flex items-start gap-2.5 text-sm text-ink/80">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-mint text-moss-600">
                    <Icon.check className="h-3.5 w-3.5" />
                  </span>
                  <Bilingual jp={tip.jp} en={tip.en} />
                </li>
              ))}
            </ul>
          </div>

          {/* Obie tip sticky note */}
          <div className="sticky-note relative rotate-1 rounded-xl p-4">
            <div className="absolute -top-2 left-1/2 h-4 w-16 -translate-x-1/2 rounded-sm bg-pine/15" aria-hidden />
            <div className="flex items-center gap-2">
              <span className="text-lg">🐾</span>
              <p className="text-sm font-bold text-pine">{t("dashboard.obieTip")}</p>
            </div>
            <div className="mt-1 text-sm leading-relaxed text-ink/80">
              <Bilingual
                jp="短(みじか)くてもいいよ。続(つづ)けることがいちばん！"
                en="Short is fine — keeping it up is what matters most!"
              />
            </div>
          </div>
        </div>
      </div>

      {/* AI Teacher's Feedback */}
      {result && (
        <section className="space-y-4 border-t border-line pt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span>🌸</span>
              <h2 className="font-serif text-2xl font-bold text-pine">
                <Furigana text="添削結果(てんさくけっか)" />
              </h2>
              <span className="text-sm font-medium text-muted">{t("write.resultTitle")}</span>
            </div>
            {saving ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-mint px-4 py-2 text-sm font-semibold text-pine">
                {t("write.saving")}
              </span>
            ) : savedEntryId ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-moss-600">✓ {t("write.savedMsg")}</span>
                <a
                  href={`/diary/${savedEntryId}`}
                  className="gloss-btn shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-cream hover:brightness-105"
                >
                  {t("write.viewDiary")}
                </a>
              </div>
            ) : (
              <Button onClick={handleSave}>
                <Icon.check className="h-4 w-4" /> {t("write.saveBtn")}
              </Button>
            )}
          </div>
          {saveError && (
            <p className="rounded-lg bg-apricot/10 px-3 py-2 text-sm text-apricot">
              {saveError}
            </p>
          )}
          <CorrectionResult correction={result} />
          <p className="pt-1 text-center text-xs text-muted">
            {t("write.aiDisclaimer")}
          </p>
        </section>
      )}
    </div>
  );
}
