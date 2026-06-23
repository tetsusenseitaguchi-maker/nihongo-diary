"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { GoalRing } from "@/components/GoalRing";
import { Attachments } from "@/components/Attachments";
import { CorrectionResult } from "@/components/CorrectionResult";
import { Furigana } from "@/components/Furigana";
import { Bilingual } from "@/components/Bilingual";
import { templates, sampleDraft } from "@/lib/mock-data";
import type { Level, CorrectionStyle, Correction } from "@/lib/types";

const MAX_CHARS = 500;

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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const router = useRouter();

  const len = text.trim().length;
  const overLimit = len > MAX_CHARS;
  const goalPct = Math.min(100, Math.round((len / 50) * 100));

  async function handleCorrect() {
    if (!text.trim() || overLimit) return;
    setLoading(true);
    setCorrectError(null);
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
        setCorrectError(data?.error || "添削に失敗しました。もう一度お試しください。");
        setLoading(false);
        return;
      }

      // Map the API response into the shape the UI + Supabase use.
      // We keep the ruby (furigana) versions for display.
      const correction: Correction = {
        original: data.original ?? text,
        corrected: data.correctedJapaneseRuby || data.correctedJapanese || "",
        natural: data.naturalJapaneseRuby || data.naturalJapanese || "",
        explanation: data.englishExplanation ?? "",
        correctionNote: data.correctionNote ?? "",
        mistakes: (data.keyMistakes ?? []).map(
          (m: { mistake?: string; correction?: string; correctionRuby?: string; explanation?: string }) => ({
            before: m.mistake ?? "",
            after: m.correctionRuby || m.correction || "",
            note: m.explanation ?? "",
          }),
        ),
        vocabulary: (data.usefulVocabulary ?? []).map(
          (v: { word?: string; wordRuby?: string; meaning?: string; example?: string; exampleRuby?: string }) => ({
            word: v.wordRuby || v.word || "",
            reading: "",
            meaning: v.meaning ?? "",
            example: v.exampleRuby || v.example || "",
          }),
        ),
        practice: { jp: data.practiceSentenceRuby || data.practiceSentence || "", en: "" },
      };
      setResult(correction);
    } catch {
      setCorrectError("ネットワークエラーです。接続を確認してもう一度お試しください。");
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

              {/* selectors */}
              <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Selector label="Level" value={levels[level]} onClick={() => cycle(setLevel, levels.length)} />
                <Selector label="Style" value={styleJP[styles[style]]} onClick={() => cycle(setStyle, styles.length)} />
                <Selector label="Mood" value={moods[mood]} onClick={() => cycle(setMood, moods.length)} />
                <Selector label="Weather" value={weathers[weather]} onClick={() => cycle(setWeather, weathers.length)} />
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
                  <Furigana text="文字数(もじすう)" />: {len} / {MAX_CHARS}
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
                <Button onClick={handleCorrect} disabled={!text.trim() || overLimit || loading}>
                  {loading ? (
                    <Furigana text="Obie が読(よ)んでいます…" />
                  ) : (
                    <><Icon.sparkle className="h-4 w-4" /> <Furigana text="添削(てんさく)してもらう" /></>
                  )}
                </Button>
              </div>
              {overLimit && (
                <p className="mt-2 text-right text-sm text-apricot">
                  今は1回 {MAX_CHARS} 文字までです。少し短くしてね。
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
          <Attachments />
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
              <span className="text-sm font-medium text-muted">Correction Result</span>
            </div>
            {saving ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-mint px-4 py-2 text-sm font-semibold text-pine">
                <Furigana text="保存中(ほぞんちゅう)…" />
              </span>
            ) : (
              <Button onClick={handleSave}>
                <Icon.check className="h-4 w-4" /> <Furigana text="日記(にっき)を保存(ほぞん)" />
              </Button>
            )}
          </div>
          {saveError && (
            <p className="rounded-lg bg-apricot/10 px-3 py-2 text-sm text-apricot">
              {saveError}
            </p>
          )}
          <CorrectionResult correction={result} />
        </section>
      )}
    </div>
  );
}
