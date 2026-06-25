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
import type { Level, CorrectionStyle, Correction, DiaryPlace } from "@/lib/types";
import { limitsFor, normalizePlan, PLAN_LABELS, type Plan } from "@/lib/plans";
import { PRESET_TAGS, PRESET_TAG_KEYS } from "@/lib/tags";
import { useT } from "@/contexts/locale";

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
const moods = ["😊 Happy", "🙂 Okay", "😌 Calm", "😴 Tired", "😣 Tough"];
const weathers = ["☀️ Sunny", "☁️ Cloudy", "🌧️ Rainy"];

const tips = [
  { jp: "使(つか)った単語(たんご)をチェックしよう", en: "Check the words you used" },
  { jp: "文(ぶん)のつながりを意識(いしき)しよう", en: "Notice how your sentences connect" },
  { jp: "自分(じぶん)の気持(きも)ちを書(か)こう", en: "Write how you feel" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
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
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [text, setText] = useState("");
  const [level, setLevel] = useState(1);
  const [style, setStyle] = useState(1);
  const [matchScript, setMatchScript] = useState(true);

  // Prefill from /write?starter=... (e.g. when coming from a template)
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("starter");
    if (s) setText((prev) => (prev ? prev : s));
  }, []);
  const [mood, setMood] = useState(0);
  const [weather, setWeather] = useState(0);
  const [result, setResult] = useState<Correction | null>(null);
  const [loading, setLoading] = useState(false);
  const [correctError, setCorrectError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [places, setPlaces] = useState<DiaryPlace[]>([]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Plan + usage
  const [plan, setPlan] = useState<Plan>("free");
  const [usedToday, setUsedToday] = useState(0);
  const router = useRouter();
  const t = useT();

  const limits = limitsFor(plan);
  const remaining = Math.max(0, limits.corrections - usedToday);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: prof }, { data: usage }] = await Promise.all([
        supabase.from("profiles").select("plan").eq("id", user.id).single(),
        supabase.from("usage_limits").select("correction_count").eq("user_id", user.id).eq("usage_date", today).maybeSingle(),
      ]);
      setPlan(normalizePlan(prof?.plan));
      setUsedToday(usage?.correction_count ?? 0);
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
    try {
      const res = await fetch("/api/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          level: levels[level],
          style: styles[style],
          matchScript,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCorrectError(data?.error || "Correction failed. Please try again.");
        if (data?.upgrade) setShowUpgrade(true);
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
      };
      setResult(correction);
    } catch {
      setCorrectError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    setSaveError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const { data, error } = await supabase
      .from("diary_entries")
      .insert({
        user_id: user.id,
        diary_date: date,
        title: title.trim() || null,
        tags,
        original_text: result.original,
        corrected_japanese: result.corrected,
        natural_japanese: result.natural,
        english_explanation: result.explanation,
        correction_note: result.correctionNote ?? "",
        key_mistakes: result.mistakes,
        useful_vocabulary: result.vocabulary,
        practice_sentence: result.practice.jp,
        level: levels[level],
        correction_style: styles[style],
      })
      .select("id")
      .single();

    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }

    // Upload attachments to Supabase Storage
    // Path: <user_id>/<entry_id>.<ext> — consistent with avatars bucket pattern.
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
        setSaveError(`Photo upload failed: ${upErr.message}`);
        setSaving(false);
        return;
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
        setSaveError(`Audio upload failed: ${upErr.message}`);
        setSaving(false);
        return;
      }
      audioPath = storagePath;
    }

    if (imagePath || audioPath) {
      await supabase
        .from("diary_entries")
        .update({ image_path: imagePath, audio_path: audioPath })
        .eq("id", data.id);
    }

    // Save location pins
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

    // Record a learning-activity (no diary text — privacy safe)
    await supabase.from("activity_feed").insert({
      user_id: user.id,
      activity_type: "wrote_diary",
      diary_entry_id: data.id,
      metadata: { diary_date: date, is_public: false },
    });

    router.push(`/diary/${data.id}`);
    router.refresh();
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
        <span className="text-sm font-medium text-muted">Write Diary</span>
        <span className="text-xl">🌸</span>
      </div>

      {/* Plan + remaining */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-line bg-paper px-4 py-2 text-sm">
        <span className="font-semibold text-pine">{PLAN_LABELS[plan]} plan</span>
        <span className="text-line">·</span>
        <span className={remaining > 0 ? "text-ink/70" : "font-semibold text-apricot"}>
          {remaining > 0
            ? `Today's corrections: ${remaining} / ${limits.corrections} left`
            : "No corrections left today"}
        </span>
        {plan === "free" && (
          <a href="/upgrade" className="ml-auto font-semibold text-moss-600 hover:text-pine">
            Upgrade →
          </a>
        )}
      </div>

      {showUpgrade && (
        <div className="gloss-panel flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] p-4" style={{ ["--tint" as string]: "var(--color-tint-sand)" } as CSSProperties}>
          <p className="text-sm text-ink/80">
            You&apos;ve reached your daily limit. Upgrade for more corrections and longer entries.
          </p>
          <a href="/upgrade" className="gloss-btn rounded-full px-4 py-2 text-sm font-semibold text-cream hover:brightness-105">
            See plans
          </a>
        </div>
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

              {/* title input */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={50}
                placeholder="今日のひとこと（任意）/ A title for today (optional)"
                className="mb-4 block w-full rounded-lg border border-line bg-mint/30 px-3 py-2 text-sm font-semibold text-pine placeholder:font-normal placeholder:text-muted/60 focus:border-moss focus:outline-none"
              />

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

              {/* match writer's script toggle */}
              <button
                type="button"
                onClick={() => setMatchScript((v) => !v)}
                aria-pressed={matchScript}
                className={`mb-4 inline-flex items-center gap-2.5 rounded-full border px-3.5 py-2 text-left text-sm transition-colors ${
                  matchScript
                    ? "border-moss/50 bg-mint/50 text-pine"
                    : "border-line bg-paper text-muted hover:border-moss/40"
                }`}
              >
                <span
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                    matchScript ? "bg-moss" : "bg-line"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-paper shadow-sm transition-all ${
                      matchScript ? "left-[18px]" : "left-0.5"
                    }`}
                  />
                </span>
                <span className="leading-tight">
                  <Furigana text="書(か)いた文字(もじ)に合(あ)わせる" className="font-jp font-semibold" />
                  <span className="ml-1.5 text-xs text-muted">Match my writing (kanji/kana)</span>
                </span>
              </button>

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
                  Characters: {len} / {maxChars}
                </span>
                <button
                  onClick={() => setText(sampleDraft)}
                  className="text-xs font-semibold text-moss-600 hover:text-pine"
                >
                  <Furigana text="サンプルを入(い)れる" /> · Load a sample
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
                <Button variant="secondary">
                  <Icon.book className="h-4 w-4" /> Save draft
                </Button>
                <Button onClick={handleCorrect} disabled={!text.trim() || overLimit || loading || remaining <= 0}>
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
                  Your plan allows up to {maxChars} characters. Please shorten your text.
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
              <p className="font-serif font-bold text-pine">Today&apos;s goal</p>
              <p className="font-jp text-sm text-ink/70"><Furigana text="日記(にっき)を書(か)こう（50文字(もじ)〜）" /></p>
              <p className="text-xs text-muted">Write a diary (50+ characters)</p>
            </div>
          </div>

          {/* Writing tips */}
          <div className="rounded-[var(--radius-card)] border border-line bg-paper p-5 shadow-card">
            <p className="mb-1 font-serif font-bold text-pine">Writing tips</p>
            <ul className="mt-2 space-y-3">
              {tips.map((t) => (
                <li key={t.en} className="flex items-start gap-2.5 text-sm text-ink/80">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-mint text-moss-600">
                    <Icon.check className="h-3.5 w-3.5" />
                  </span>
                  <Bilingual jp={t.jp} en={t.en} />
                </li>
              ))}
            </ul>
          </div>

          {/* Obie tip sticky note */}
          <div className="sticky-note relative rotate-1 rounded-xl p-4">
            <div className="absolute -top-2 left-1/2 h-4 w-16 -translate-x-1/2 rounded-sm bg-pine/15" aria-hidden />
            <div className="flex items-center gap-2">
              <span className="text-lg">🐾</span>
              <p className="text-sm font-bold text-pine">Obie&apos;s tip</p>
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
            AI corrections may not be perfect. Please use them as learning support.
          </p>
        </section>
      )}
    </div>
  );
}
