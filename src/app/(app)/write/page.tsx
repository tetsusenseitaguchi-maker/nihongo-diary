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
import { RecheckResult } from "@/components/RecheckResult";
import { PublicToggle } from "@/components/PublicToggle";
import { Furigana } from "@/components/Furigana";
import { Bilingual } from "@/components/Bilingual";
import { templates, sampleDraft } from "@/lib/mock-data";
import type { Level, CorrectionStyle, Correction, DiaryPlace, MistakeItem, RecheckResult as RecheckResultData } from "@/lib/types";
import { GrammarReviewCard } from "@/components/GrammarReviewCard";
import { WritingPromptCard } from "@/components/WritingPromptCard";
import { TrainDiagram } from "@/components/TrainDiagram";
import { HintsSection } from "@/components/HintsSection";
import { SavedWordsRow, type SavedWord } from "@/components/SavedWordsRow";
import { DictationLink } from "@/components/DictationLink";
import { hasDictation } from "@/lib/dictation";
import type { UsedExpression } from "@/lib/learned-display";
import { promptForDate, randomPromptExcept, type WritingPrompt } from "@/lib/writing-prompts";
import { RECHECK_LIMITS } from "@/lib/recheck-limits";
import { limitsFor, normalizePlan, PLAN_LABELS, PLAN_LIMITS, type Plan } from "@/lib/plans";
import { PRESET_TAGS, PRESET_TAG_KEYS } from "@/lib/tags";
import { useT } from "@/contexts/locale";
import { todayInTZ } from "@/lib/date-tz";
import { normalizeRubyText } from "@/lib/furigana";
import { parseCorrectionPayload, correctionToDbColumns } from "@/lib/correction-payload";

const DiaryMapPicker = dynamicLoad(
  () => import("@/components/DiaryMapPicker").then((m) => m.DiaryMapPicker),
  {
    ssr: false,
    loading: () => <div className="h-72 animate-pulse rounded-2xl bg-mint/30" />,
  }
);

// Max rechecks allowed per corrected diary entry (ephemeral, client-only —
// resets when a fresh correction is run). No plan/billing/usage-counter involved.
const RECHECK_LIMIT = 3;

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

/**
 * 「保存した表現を日記で使えたか」の照合を投げるだけの関数。
 *
 * 日記保存のおまけなので、保存の成否には絶対に影響させない。そのために:
 *   ・await しない（呼び出し側の保存フローを1msも待たせない）
 *   ・.catch(() => {}) で reject を握りつぶす（unhandled rejection も出さない）
 *   ・全体を try/catch で包む（fetch 自体が同期的に投げても外に出さない）
 * つまりこの関数は throw もしないし reject もしない。だから呼び出し側の
 * try ブロックの外に置ける（置いている）。
 *
 * keepalive: true — handleJustSave / handleSeekPeerCorrection は直後に
 * router.push で遷移する。SPA 遷移なら通常はリクエストが生き残るが、
 * ハードナビゲーションやタブを閉じた場合に落ちるのを防ぐ。
 *
 * onResult は「使えた」演出を出すためだけの任意のフック。渡しても
 * 上の3点は変わらない — await しないので保存フローは待たされず、
 * 失敗しても呼ばれないだけで、例外は外に出ない。演出を出す画面
 * （handleCorrect / handleSave）だけが渡す。保存後すぐ router.push で
 * 離れる経路は渡さない — 表示する画面がもう無い。
 *
 * /api/learned/scan は失敗しても 200 + { ok: false } を返す設計なので、
 * ok を見てから呼ぶ。呼ばれなければ演出が出ないだけで、記録は
 * サーバー側で完了している。
 */
interface ScanResponse {
  ok?: boolean;
  used?: { id: string; word: string; matchedText: string; useCount: number }[];
  graduated?: string[];
}

function scanLearnedInBackground(
  diaryEntryId: string,
  onResult?: (result: ScanResponse) => void,
): void {
  try {
    void fetch("/api/learned/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diaryEntryId }),
      keepalive: true,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ScanResponse | null) => {
        if (data?.ok && onResult) onResult(data);
      })
      .catch(() => {});
  } catch {
    /* 何もしない — 保存はすでに成功している */
  }
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
  // Today's writing prompt. Starts null and is filled in from an effect — the
  // choice depends on the user_tz cookie, which does not exist during SSR.
  const [prompt, setPrompt] = useState<WritingPrompt | null>(null);
  const [partialCorrection, setPartialCorrection] = useState<{ corrected: string; natural: string } | null>(null);

  // Revise & recheck — lightweight follow-up flow, no correction credit consumed.
  const [reviseMode, setReviseMode] = useState(false);
  const [revisedText, setRevisedText] = useState("");
  const [rechecking, setRechecking] = useState(false);
  const [recheckError, setRecheckError] = useState<string | null>(null);
  const [recheckResult, setRecheckResult] = useState<RecheckResultData | null>(null);
  // Number of successful rechecks used for the current correction (resets on a new correction).
  // Paid plans are capped this way; Free is capped per calendar day instead — see recheckUsedToday.
  const [recheckCount, setRecheckCount] = useState(0);
  // Free only: rechecks already used today, read from usage_limits.recheck_count on mount.
  // Unlike recheckCount this does NOT reset when a new correction runs.
  const [recheckUsedToday, setRecheckUsedToday] = useState(0);
  // Set when /api/recheck returns 429 so Free users can be pointed at an upgrade.
  const [showRecheckUpgrade, setShowRecheckUpgrade] = useState(false);

  // Words the learner saved and has not graduated yet. Two consumers: the
  // reminder row above the editor shows the first three, and the scan result
  // looks up readings here by id (see applyScanResult). Empty array is also the
  // "nothing saved" state; SavedWordsRow renders nothing.
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);

  // Saved expressions this diary actually used, filled in when the scan answers.
  // Only ever shown next to a correction result on this page.
  const [usedExpressions, setUsedExpressions] = useState<UsedExpression[]>([]);

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

  // Recheck allowance. Free is capped per calendar day and enforced server-side
  // by try_use_recheck(); paid plans keep the existing per-correction cap and
  // never hit the RPC, so their behaviour here is unchanged.
  const isFreePlan = plan === "free";
  const recheckLimit = isFreePlan ? RECHECK_LIMITS.free : RECHECK_LIMIT;
  const recheckUsed = isFreePlan ? recheckUsedToday : recheckCount;
  const recheckLeft = Math.max(0, recheckLimit - recheckUsed);
  const recheckExhausted = recheckLeft <= 0;

  useEffect(() => {
    // Pick today's prompt here rather than during render: getClientTZ() reads
    // document.cookie, and a render-time choice would differ between the SSR
    // markup and the client (hydration mismatch). Runs before the auth check
    // below so the prompt shows even while the session is still loading.
    setPrompt(promptForDate(todayInTZ(getClientTZ())));
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const today = todayInTZ(getClientTZ());
      const [{ data: prof }, { data: usage }, { data: reviewRow }, { data: savedWordRows }] = await Promise.all([
        supabase.from("profiles").select("plan").eq("id", user.id).single(),
        supabase.from("usage_limits").select("correction_count, recheck_count").eq("user_id", user.id).eq("usage_date", today).maybeSingle(),
        supabase.from("diary_entries").select("grammar_focus").eq("user_id", user.id).not("grammar_focus", "is", null).lt("diary_date", today).order("diary_date", { ascending: false }).limit(1).maybeSingle(),
        // Saved words for the reminder row above the editor. Added to this
        // existing Promise.all rather than as its own request or a call to
        // /api/vocabulary — it rides along with queries already in flight.
        // Unfinished words only, closest to graduating first. nullsFirst: false
        // because the deployed use_count column's nullability is unverified and
        // Postgres sorts NULLs first on DESC, which would put untouched words
        // ahead of the nearly-graduated ones.
        supabase
          .from("vocabulary_entries")
          .select("id, word, reading, use_count")
          .eq("user_id", user.id)
          .eq("entry_type", "word")
          .is("graduated_at", null)
          // No limit: the row below only shows the first three, but the scan
          // result needs to look up a reading for ANY word it matched, which
          // may be further down the list. id/word/reading/use_count is a tiny
          // payload even for a heavy saver.
          .order("use_count", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false }),
      ]);
      setPlan(normalizePlan(prof?.plan));
      setUsedToday(usage?.correction_count ?? 0);
      setRecheckUsedToday(usage?.recheck_count ?? 0);
      if (reviewRow?.grammar_focus) setGrammarReview(reviewRow.grammar_focus as MistakeItem);
      if (savedWordRows) setSavedWords(savedWordRows as SavedWord[]);
    })();
  }, []);


  /**
   * scan のレスポンスを、そのまま描ける形に整えて state に入れる。
   *
   * ここでやっているのは2つだけ:
   *   ・reading の補完 — scan は読みを返さない。返させると scan ルートの
   *     変更になるので、この画面が既に持っている単語リストから id で引く。
   *     引けなければ null で、その語はふりがな無しで出る（取りこぼし側）。
   *   ・graduated の付与 — レスポンスの graduated 配列は「この保存で
   *     ちょうど閾値に達した」id だけ。既に卒業済みの語は scan の候補から
   *     外れているので、ここに紛れ込むことはない。
   */
  function applyScanResult(result: ScanResponse) {
    const used = result.used ?? [];
    if (used.length === 0) return;

    const justGraduated = new Set(result.graduated ?? []);
    const readingById = new Map(savedWords.map((w) => [w.id, w.reading]));

    setUsedExpressions(
      used.map((u) => ({
        id: u.id,
        word: u.word,
        matchedText: u.matchedText,
        useCount: u.useCount,
        reading: readingById.get(u.id) ?? null,
        graduated: justGraduated.has(u.id),
      })),
    );
  }

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
    setPartialCorrection(null);
    setSavedEntryId(null);
    // A new correction is a new diary — clear the previous one's "used it"
    // panel so it cannot linger next to a result it has nothing to do with.
    setUsedExpressions([]);
    setRecheckCount(0); // fresh correction → recheck allowance resets to RECHECK_LIMIT
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

      // Error responses are still JSON (not streamed) — check ok first
      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string; upgrade?: boolean };
        if (res.status === 429) {
          // Daily correction limit — show the friendly plan-specific banner, not a red error
          setShowUpgrade(true);
          setCorrectError(null);
          // Force remaining=0 so the button disables immediately (avoids repeated 429 clicks)
          setUsedToday(limits.corrections);
        } else {
          setCorrectError(errData?.error || "Correction failed. Please try again.");
          if (errData?.upgrade) setShowUpgrade(true);
        }
        setLoading(false);
        return;
      }

      // Read the plain-text stream and accumulate into a buffer
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let earlyShown = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        if (!earlyShown) {
          const corrected = extractField(buffer, "correctedJapaneseRuby");
          const natural   = extractField(buffer, "naturalJapaneseRuby");
          if (corrected && natural) {
            setPartialCorrection({ corrected, natural });
            earlyShown = true;
          }
        }
      }

      // Parse full JSON after stream completes
      const parsed = safeJson(buffer);
      if (!parsed) {
        setCorrectError(t("write.networkError"));
        setLoading(false);
        return;
      }
      setUsedToday((n) => n + 1);

      // One converter turns the model's JSON into a Correction, and it is the
      // only thing that decides which transform each field gets. See
      // @/lib/correction-payload — the table there has to name every field of
      // Correction, so a new one cannot be added without saying what it is.
      const correction: Correction = parseCorrectionPayload(parsed, text);

      setPartialCorrection(null);
      setResult(correction);
      setLoading(false);   // show result immediately; save happens next

      // Auto-save: diary is persisted as part of the correction flow
      setSaving(true);
      let autoSavedId: string | null = null;
      try {
        const id = await saveEntry(correction);
        autoSavedId = id;
        setSavedEntryId(id);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSaving(false);
      }
      // 保存の try/catch/finally の外で投げる。保存が失敗した回は id が
      // null のままなので呼ばない。scanLearnedInBackground は throw も
      // reject もしないので、添削フロー側の catch を誤って踏むこともない。
      // 添削結果はこの時点で既に画面に出ているので、演出は少し遅れて
      // 現れる（日記が保存されるまで照合は走れないため、原理的にそうなる）。
      if (autoSavedId) scanLearnedInBackground(autoSavedId, applyScanResult);
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

    // alternative_words is not in this insert: it is written by the separate
    // update further down, which is how this flow has always done it.
    const { alternative_words, ...correctionColumns } = correctionToDbColumns(correction);

    const { data, error } = await supabase
      .from("diary_entries")
      .insert({
        // Everything derived from the correction, with the transform each
        // column needs — shared with /api/correct-existing so the two writers
        // cannot drift again (they already had, over the diary title).
        ...correctionColumns,
        // Everything that is not:
        user_id: user.id,
        diary_date: diaryDate,
        tags,
        original_text: correction.original,
        level: levels[level],
        correction_style: styles[style],
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    let imagePath: string | null = null;
    let audioPath: string | null = null;

    if (photoFile) {
      const uploadFd = new FormData();
      uploadFd.append("photo", photoFile);
      uploadFd.append("entryId", data.id);
      const upRes = await fetch("/api/diary/upload-image", { method: "POST", body: uploadFd });
      if (!upRes.ok) {
        await supabase.from("diary_entries").delete().eq("id", data.id);
        const upData = await upRes.json().catch(() => ({}));
        throw new Error((upData as { error?: string }).error ?? "Photo upload failed");
      }
      const { path } = await upRes.json() as { path: string };
      imagePath = path;
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

    if (alternative_words.length > 0) {
      supabase
        .from("diary_entries")
        .update({
          alternative_words,
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

    // Same upload route as the correction path above, for the same reason: it
    // re-encodes through sharp, which strips EXIF — GPS included — and this is
    // the only save that can publish a diary outright (opts.isPublic), so it is
    // the last one that should have been sending raw camera files to a public
    // bucket. It was written three days before that route existed and never
    // caught up.
    if (photoFile) {
      const uploadFd = new FormData();
      uploadFd.append("photo", photoFile);
      uploadFd.append("entryId", data.id);
      const upRes = await fetch("/api/diary/upload-image", { method: "POST", body: uploadFd });
      if (!upRes.ok) {
        await supabase.from("diary_entries").delete().eq("id", data.id);
        const upData = await upRes.json().catch(() => ({}));
        throw new Error((upData as { error?: string }).error ?? "Photo upload failed");
      }
      const { path } = await upRes.json() as { path: string };
      await supabase.from("diary_entries").update({ image_path: path }).eq("id", data.id);
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
    let savedId: string | null = null;
    try {
      savedId = await saveWithoutCorrection({ isPublic: true, seekingPeerCorrection: true });
      router.push(`/diary/${savedId}`);
    } catch (err) {
      setSeekPeerError(err instanceof Error ? err.message : t("write.seekPeerError"));
    } finally {
      setSeekingPeer(false);
    }
    // 添削なしでも original_text は学習者自身の文なので、照合対象として
    // 正しい（AI の書き換えではない）。添削ありだけを対象にすると、
    // 添削回数を節約している人が永久に「使えた」を得られなくなる。
    // onResult は渡さない — 直後に router.push で離れるので、演出を
    // 出す画面がもう無い。記録はサーバー側で変わらず行われる。
    if (savedId) scanLearnedInBackground(savedId);
  }

  async function handleJustSave() {
    if (!text.trim() || overLimit || loading || justSaving || saving) return;
    setJustSaving(true);
    setJustSaveError(null);
    let savedId: string | null = null;
    try {
      savedId = await saveWithoutCorrection();
      router.push(`/diary/${savedId}`);
    } catch (err) {
      setJustSaveError(err instanceof Error ? err.message : t("write.justSaveError"));
    } finally {
      setJustSaving(false);
    }
    if (savedId) scanLearnedInBackground(savedId);
  }

  // Manual save retry — only reachable when auto-save failed.
  async function handleSave() {
    if (!result || savedEntryId) return;
    setSaving(true);
    setSaveError(null);
    let savedId: string | null = null;
    try {
      savedId = await saveEntry(result);
      setSavedEntryId(savedId);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
    // 手動リトライでも添削結果は画面に出たままなので、演出を出す。
    if (savedId) scanLearnedInBackground(savedId, applyScanResult);
  }

  // Enter revise mode: prefill the editor with the learner's original text so
  // they can rewrite it and get lightweight follow-up feedback.
  function startRevise() {
    if (!result) return;
    setRevisedText(result.original || text);
    setRecheckResult(null);
    setRecheckError(null);
    setReviseMode(true);
  }

  function cancelRevise() {
    setReviseMode(false);
    setRecheckError(null);
  }

  // Recheck: send original + previous feedback + rewrite to /api/recheck.
  // Consumes NO correction credit — this never touches the usage counters.
  async function handleRecheck() {
    if (!result || !revisedText.trim() || rechecking) return;
    if (recheckExhausted) return; // allowance used up (per entry on paid, per day on Free)
    setRechecking(true);
    setRecheckError(null);
    setRecheckResult(null);
    setShowRecheckUpgrade(false);
    try {
      const res = await fetch("/api/recheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalText: result.original || text,
          revisedText: revisedText.trim(),
          previousMistakes: result.mistakes,
          previousNatural: result.natural,
          level: levels[level],
        }),
      });
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string; limit?: number };
        if (res.status === 429) {
          // Free plan used today's allowance. Pin the counter to the limit so
          // the button stays disabled instead of inviting another 429, and
          // offer the upgrade (suppressed inside the iOS app).
          setRecheckUsedToday(errData?.limit ?? RECHECK_LIMITS.free);
          setRecheckError(null);
          setShowRecheckUpgrade(true);
          return;
        }
        setRecheckError(errData?.error || t("write.networkError"));
        return;
      }
      const data = (await res.json()) as RecheckResultData;
      // Sanitize AI-generated <ruby> markup before it is shown (same as handleCorrect).
      setRecheckResult({
        fixed: (data.fixed ?? []).map((f) => ({ point: f.point ?? "", detail: f.detail ?? "" })),
        remaining: (data.remaining ?? []).map((r) => ({
          point: r.point ?? "",
          quoteRuby: normalizeRubyText(r.quoteRuby || ""),
          suggestionRuby: normalizeRubyText(r.suggestionRuby || ""),
          detail: r.detail ?? "",
        })),
        summary: data.summary ?? "",
        encouragementRuby: normalizeRubyText(data.encouragementRuby || ""),
      });
      // Count only successful rechecks — failures/network errors never consume the allowance.
      // Both counters advance: recheckCount caps paid plans per correction,
      // recheckUsedToday mirrors the server-side daily count used for Free.
      setRecheckCount((n) => n + 1);
      setRecheckUsedToday((n) => n + 1);
    } catch {
      setRecheckError(t("write.networkError"));
    } finally {
      setRechecking(false);
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
        {!isIosApp && plan === "free" && (
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
                    className="flex-1 rounded-full border border-line bg-paper px-3 py-1 text-base text-ink placeholder:text-muted focus:border-moss focus:outline-none"
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

              {/* hints — one collapsed band; hint content never touches the text */}
              <HintsSection>
                {prompt && (
                  <WritingPromptCard
                    prompt={prompt}
                    onAnother={() => setPrompt((p) => randomPromptExcept(p?.id))}
                  />
                )}
                <TrainDiagram />
              </HintsSection>

              {/* Saved-word reminder — outside the Hints band on purpose, since
                  that band is collapsed on every mount and this needs to be
                  seen without being opened. Renders nothing when empty. */}
              {/* slice(0, 3): the query now returns every unfinished word so the
                  scan result can look up readings, but the row still shows the
                  three closest to graduating, exactly as before. */}
              <SavedWordsRow words={savedWords.slice(0, 3)} />

              {/* selectors */}
              <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4" data-tour="write-options">
                <Selector label={t("write.level")} value={levels[level]} onClick={() => cycle(setLevel, levels.length)} />
                <Selector label={t("write.style")} value={styleJP[styles[style]]} onClick={() => setStyle((n) => (n+1)%styles.length)} />
                <Selector label={t("write.mood")} value={moods[mood]} onClick={() => cycle(setMood, moods.length)} />
                <Selector label={t("write.weather")} value={weathers[weather]} onClick={() => cycle(setWeather, weathers.length)} />
              </div>

              {/* notebook paper textarea */}
              <textarea
                data-tour="write-editor"
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
                <Button data-tour="write-correct" onClick={handleCorrect} disabled={!text.trim() || overLimit || loading || seekingPeer || justSaving || remaining <= 0}>
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

      {/* Early partial display — natural Japanese shown as soon as both corrected+natural fields arrive */}
      {partialCorrection && !result && (
        <section className="space-y-4 border-t border-line pt-8">
          <div className="flex items-center gap-2">
            <span>🌸</span>
            <h2 className="font-serif text-2xl font-bold text-pine">
              <Furigana text="添削結果(てんさくけっか)" />
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="gloss-card rounded-[var(--radius-card)] p-6">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted">
                {t("correction.originalText")}
              </p>
              <p className="font-jp text-[15px] leading-loose text-ink/70">{text}</p>
            </div>
            <div
              className="gloss-panel relative rounded-[var(--radius-card)] p-6"
              style={{ "--color-tint": "var(--color-tint-sage)" } as CSSProperties}
            >
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted">
                {t("correction.naturalJapanese")}
              </p>
              <p className="font-jp text-[15px] leading-loose text-ink">
                <Furigana text={partialCorrection.natural} />
              </p>
            </div>
          </div>
          <div className="animate-pulse space-y-3 rounded-[var(--radius-card)] bg-paper p-6 shadow-card">
            <div className="h-3 w-2/3 rounded bg-mint/50" />
            <div className="h-3 w-1/2 rounded bg-mint/50" />
            <div className="h-3 w-3/4 rounded bg-mint/50" />
          </div>
          <div className="animate-pulse space-y-3 rounded-[var(--radius-card)] bg-paper p-6 shadow-card">
            <div className="h-3 w-1/2 rounded bg-mint/50" />
            <div className="h-3 w-2/3 rounded bg-mint/50" />
          </div>
        </section>
      )}

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
                <PublicToggle diaryId={savedEntryId} initialPublic={false} />
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
          {/* Free corrections generate neither drills nor the mini lesson (see
              includeDrills / includeMiniLesson in /api/correct), so show the
              locked placeholders rather than two gaps. */}
          <CorrectionResult
            correction={result}
            locked={{ drills: isFreePlan, miniLesson: isFreePlan }}
            usedExpressions={usedExpressions}
          />
          <p className="pt-1 text-center text-xs text-muted">
            {t("write.aiDisclaimer")}
          </p>

          {/* Listening practice on the sentence that was just corrected.
              Placed here rather than inside CorrectionResult because that
              component renders in the tour as well, on a sample diary — a link
              to /dictation/<sample id> would go nowhere. Needs savedEntryId:
              the exercise page loads the row by id, so there has to be a row.
              hasDictation() keeps it hidden when the natural version has no
              readings to mark against. */}
          {savedEntryId && hasDictation(result.natural) && (
            <DictationLink diaryId={savedEntryId} />
          )}

          {/* Revise & recheck — rewrite the diary and get lightweight diff feedback */}
          <div className="rounded-[var(--radius-card)] border border-line bg-paper p-6 shadow-card">
            {!reviseMode ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-serif text-lg font-bold text-pine">
                    <Furigana text="書(か)き直(なお)してみる" />
                  </p>
                  <p className="mt-0.5 text-sm text-ink/70">
                    {!recheckExhausted
                      ? t("recheck.introDesc")
                      : isFreePlan
                        ? t("recheck.limitReachedDaily")
                        : t("recheck.limitReached", { n: recheckLimit })}
                  </p>
                </div>
                <Button
                  onClick={startRevise}
                  variant="secondary"
                  className="shrink-0"
                  disabled={recheckExhausted}
                >
                  <Icon.sparkle className="h-4 w-4" /> {t("recheck.reviseBtn")}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span>✏️</span>
                  <p className="font-serif text-lg font-bold text-pine">
                    <Furigana text="書(か)き直(なお)し" />
                  </p>
                  <span className="text-sm font-medium text-muted">{t("recheck.editorTitle")}</span>
                </div>
                <p className="text-sm text-ink/70">{t("recheck.editorHint")}</p>
                <textarea
                  value={revisedText}
                  onChange={(e) => setRevisedText(e.target.value)}
                  rows={7}
                  className="notebook block w-full resize-none rounded-lg border border-line bg-transparent px-3 pt-[7px] font-jp text-lg leading-[34px] text-ink placeholder:text-muted/60 focus:border-moss focus:outline-none"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm text-muted">
                    {!recheckExhausted
                      ? t("recheck.remaining", { n: recheckLeft })
                      : isFreePlan
                        ? t("recheck.limitReachedDaily")
                        : t("recheck.limitReached", { n: recheckLimit })}
                  </span>
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={cancelRevise} disabled={rechecking}>
                      {t("recheck.cancel")}
                    </Button>
                    <Button
                      onClick={handleRecheck}
                      disabled={!revisedText.trim() || rechecking || recheckExhausted}
                    >
                      {rechecking ? (
                        t("recheck.rechecking")
                      ) : (
                        <><Icon.sparkle className="h-4 w-4" /> {t("recheck.recheckBtn")}</>
                      )}
                    </Button>
                  </div>
                </div>
                {recheckError && (
                  <p className="rounded-lg bg-apricot/10 px-3 py-2 text-sm text-apricot">
                    {recheckError}
                  </p>
                )}
                {recheckResult && (
                  <div className="border-t border-line pt-4">
                    <RecheckResult result={recheckResult} />
                  </div>
                )}
              </div>
            )}
            {showRecheckUpgrade && isFreePlan && (
              <div className="gloss-panel mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] p-4" style={{ ["--tint" as string]: "var(--color-tint-sand)" } as CSSProperties}>
                <p className="text-sm text-ink/80">
                  {t("recheck.limitReachedFree", {
                    limit: RECHECK_LIMITS.free,
                    plusLimit: RECHECK_LIMITS.plus,
                  })}
                </p>
                {/* iOS native app: hide all paid upgrade CTAs (App Store policy) */}
                {!isIosApp && (
                  <a href="/upgrade" className="gloss-btn shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-cream hover:brightness-105">
                    {t("write.upgradeToPlus")}
                  </a>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function extractField(buf: string, fieldName: string): string | null {
  const re = new RegExp(`"${fieldName}"\\s*:\\s*"((?:[^"\\\\]|\\\\[\\s\\S])*)"`);
  const m = buf.match(re);
  return m ? m[1] : null;
}

function safeJson(content: string): Record<string, unknown> | null {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    return null;
  }
}

