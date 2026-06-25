"use client";

import Image from "next/image";
import { useState, useEffect, useTransition } from "react";
import { Furigana } from "@/components/Furigana";
import { Card, Badge, LinkButton } from "@/components/ui";
import { Icon } from "@/components/icons";
import { ObiePhoto } from "@/components/ObiePhoto";
import { MINI_LESSONS } from "@/lib/lessons";
import { MiniLessonReview } from "@/components/MiniLessonReview";
import { createClient } from "@/lib/supabase/client";
import { normalizePlan, limitsFor, type Plan } from "@/lib/plans";

type Tab = "templates" | "ideas" | "lessons" | "review";

const TEMPLATES: {
  pattern: string;
  insert: string;
  meaning: string;
  example: string;
}[] = [
  { pattern: "今日(きょう)は〜しました。", insert: "今日は〜しました。", meaning: "Today I did ~.", example: "今日(きょう)は勉強(べんきょう)しました。" },
  { pattern: "昨日(きのう)は〜しました。", insert: "昨日は〜しました。", meaning: "Yesterday I did ~.", example: "昨日(きのう)は友(とも)だちに会(あ)いました。" },
  { pattern: "〜に行(い)きました。", insert: "〜に行きました。", meaning: "I went to ~.", example: "公園(こうえん)に行(い)きました。" },
  { pattern: "〜を食(た)べました。", insert: "〜を食べました。", meaning: "I ate ~.", example: "ラーメンを食(た)べました。" },
  { pattern: "〜が楽(たの)しかったです。", insert: "〜が楽しかったです。", meaning: "~ was fun.", example: "旅行(りょこう)が楽(たの)しかったです。" },
  { pattern: "〜したいです。", insert: "〜したいです。", meaning: "I want to ~.", example: "日本(にほん)に行(い)きたいです。" },
  { pattern: "〜と思(おも)います。", insert: "〜と思います。", meaning: "I think ~.", example: "いい天気(てんき)だと思(おも)います。" },
  { pattern: "〜について書(か)きます。", insert: "〜について書きます。", meaning: "I'll write about ~.", example: "今日(きょう)の出来事(できごと)について書(か)きます。" },
];

const KEY_IDEAS: { emoji: string; title: string; explanation: string }[] = [
  { emoji: "🚃", title: "Japanese is like a train.", explanation: "The important part often comes at the end. Keep reading to the last word before you decide what the sentence means." },
  { emoji: "💭", title: "Think in Japanese, not word-for-word English.", explanation: "Japanese does not always match English word order. Try to build the idea in Japanese instead of translating word by word." },
  { emoji: "🔗", title: "Particles show relationships.", explanation: "Particles like は, が, を, に, で show how words connect. They are small, but they carry a lot of meaning." },
  { emoji: "✍️", title: "Short daily writing is powerful.", explanation: "Writing a little every day is better than waiting for perfect Japanese. One sentence today beats a perfect essay someday." },
];

export default function SupportPage() {
  const [tab, setTab] = useState<Tab>("templates");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [openLessonId, setOpenLessonId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "lessons" || t === "ideas" || t === "templates" || t === "review") setTab(t);
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setPlan("free"); return; }
      const { data } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
      setPlan(normalizePlan(data?.plan));
    })();
  }, []);

  const canReadLibrary = plan !== null && limitsFor(plan).lessonLibrary;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted">Learning support</p>
        <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-pine">Templates &amp; Key Ideas</h1>
        <p className="mt-1 text-ink/70">Learn how Japanese works while you write. 🌸</p>
      </div>

      {/* Obie banner */}
      <Card className="gloss-green relative overflow-hidden p-0">
        <div className="flex flex-col items-center gap-5 p-6 sm:flex-row sm:p-7">
          <ObiePhoto size={84} className="ring-4 ring-cream/20" />
          <div>
            <Badge tone="apricot" className="mb-2">
              <Icon.sparkle className="h-3.5 w-3.5" /> Obie says
            </Badge>
            <p className="font-serif text-xl font-bold leading-snug text-cream sm:text-2xl">
              Pick a pattern, write one line, and I&apos;ll help you grow.
            </p>
            <p className="mt-1 text-cream/80">Not just correction — teaching, guiding, and growing together.</p>
          </div>
        </div>
      </Card>

      {/* Tabs — scrollable on narrow screens */}
      <div className="overflow-x-auto">
        <div className="inline-flex rounded-full border border-line bg-paper p-1 whitespace-nowrap">
          {([
            ["templates", "Templates"],
            ["ideas",     "Key Ideas"],
            ["lessons",   "Mini Lessons"],
            ["review",    "📝 Review"],
          ] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => startTransition(() => setTab(t))}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                tab === t ? "bg-pine text-cream" : "text-pine hover:bg-mint"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* TEMPLATES */}
      {tab === "templates" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {TEMPLATES.map((t) => (
            <Card key={t.insert} className="flex flex-col p-5">
              <Furigana text={t.pattern} className="font-jp text-xl font-bold text-pine" />
              <p className="mt-1 text-sm font-medium text-ink/70">{t.meaning}</p>
              <div className="mt-3 rounded-xl bg-mint/50 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-moss-600">Example</p>
                <Furigana text={t.example} className="font-jp text-[15px] text-ink" />
              </div>
              <LinkButton
                href={`/write?starter=${encodeURIComponent(t.insert)}`}
                size="sm"
                className="mt-4 self-start"
              >
                <Icon.pen className="h-4 w-4" /> Use this template
              </LinkButton>
            </Card>
          ))}
        </div>
      )}

      {/* KEY IDEAS */}
      {tab === "ideas" && (
        <div className="space-y-4">
          {KEY_IDEAS.map((idea, i) => (
            <div key={i} className="flex items-start gap-3 sm:gap-4">
              <ObiePhoto size={56} className="mt-1 shrink-0 ring-2 ring-mint" />
              {/* speech bubble */}
              <Card className="relative flex-1 p-5">
                <span className="absolute -left-2 top-5 h-4 w-4 rotate-45 border-b border-l border-line bg-paper" aria-hidden />
                <div className="flex items-start gap-2">
                  <span className="text-xl leading-none">{idea.emoji}</span>
                  <div>
                    <h3 className="font-serif text-lg font-bold leading-snug text-pine">
                      {i + 1}. {idea.title}
                    </h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-ink/80">{idea.explanation}</p>
                  </div>
                </div>
              </Card>
            </div>
          ))}

          <Card className="gloss-green flex items-center gap-4 p-5">
            <span className="text-2xl">🐾</span>
            <p className="font-jp text-[15px] font-medium text-cream">
              <Furigana text="毎日(まいにち)ちょっとずつ。いっしょにがんばろう！" />
              <span className="mt-0.5 block text-xs font-normal text-cream/75">A little every day. Let&apos;s do this together!</span>
            </p>
          </Card>
        </div>
      )}

      {/* MINI LESSON REVIEW DRILLS */}
      {tab === "review" && <MiniLessonReview plan={plan} />}

      {/* MINI LESSON LIBRARY */}
      {tab === "lessons" && (
        <div className="space-y-3">
          <p className="text-sm text-ink/70">
            📚 Mini Lesson Library — your step-by-step path. The order is always the same.
          </p>

          {/* Upgrade banner for Free users */}
          {!canReadLibrary && (
            <div className="flex items-center justify-between gap-4 rounded-[var(--radius-card)] border border-moss/30 bg-mint/30 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔒</span>
                <p className="text-sm font-medium text-pine">
                  Full lesson content is available on <strong>Plus and above</strong>.
                  <span className="ml-1 text-ink/70">Titles and short previews are visible below.</span>
                </p>
              </div>
              <a
                href="/upgrade"
                className="shrink-0 rounded-full bg-pine px-4 py-2 text-xs font-bold text-cream hover:opacity-90"
              >
                See plans →
              </a>
            </div>
          )}

          {MINI_LESSONS.map((l) => {
            const isOpen = openLessonId === l.id;
            return (
              <Card key={l.id} className="overflow-hidden p-0">
                {/* Accordion header — always visible, click to expand */}
                <button
                  type="button"
                  onClick={() => setOpenLessonId(isOpen ? null : l.id)}
                  className="flex w-full items-start gap-3 p-5 text-left"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pine text-sm font-bold text-cream">
                    {l.order}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-lg font-bold text-pine">{l.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink/80">{l.shortExplanation}</p>
                  </div>
                  <Icon.arrow
                    className={`mt-2 h-5 w-5 shrink-0 text-moss-600 transition-transform ${isOpen ? "rotate-90" : ""}`}
                  />
                </button>

                {/* Accordion body — only rendered when open */}
                {isOpen && (
                  <div className="border-t border-line px-5 pb-5 pt-4">
                    {canReadLibrary ? (
                      <>
                        <div className="rounded-xl bg-mint/40 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-moss-600">🧠 Visual Image</p>
                          <p className="mt-0.5 text-sm leading-relaxed text-ink/85">{l.visualImage}</p>
                        </div>
                        {l.points && l.points.length > 0 && (
                          <ul className="mt-3 space-y-1.5">
                            {l.points.map((pt, i) => (
                              <li key={i} className="flex items-start gap-2 rounded-xl bg-paper/70 px-3 py-2.5 text-sm">
                                <span className="mt-0.5 shrink-0 font-bold text-moss-600">{i + 1}.</span>
                                <span className="min-w-0">
                                  <span className="text-ink/85"><Furigana text={pt.text} /></span>
                                  {pt.example && (
                                    <span className="mt-0.5 block font-jp text-xs text-ink/55">
                                      例: <Furigana text={pt.example} />
                                    </span>
                                  )}
                                  {pt.examples && pt.examples.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {pt.examples.map((ex, j) => (
                                        <div key={j} className="rounded-lg bg-mint/25 px-2.5 py-1.5">
                                          <span className="block font-jp text-xs leading-relaxed text-ink/75">
                                            <Furigana text={ex.jp} />
                                          </span>
                                          <span className="mt-0.5 block text-[11px] italic text-muted">{ex.en}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {l.exampleJapaneseRuby && (
                          <div className="mt-3">
                            <Furigana text={l.exampleJapaneseRuby} className="font-jp text-[15px] text-ink" />
                            <p className="text-xs text-muted">{l.exampleEnglish}</p>
                          </div>
                        )}
                        {l.commonMistakes && l.commonMistakes.length > 0 && (
                          <div className="mt-4 rounded-xl border border-apricot/20 bg-apricot/5 p-3">
                            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-apricot">⚠️ Common Mistakes</p>
                            <ul className="space-y-3">
                              {l.commonMistakes.map((m, i) => (
                                <li key={i}>
                                  <p className="font-jp text-sm text-ink/80"><span className="mr-1 font-bold text-apricot">✗</span><Furigana text={m.wrong} /></p>
                                  <p className="font-jp mt-0.5 text-sm text-ink/80"><span className="mr-1 font-bold text-moss-600">✓</span><Furigana text={m.right} /></p>
                                  <p className="mt-1 text-xs leading-relaxed text-muted">{m.note}</p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2 rounded-xl border border-dashed border-line bg-sand/30 px-4 py-3">
                        <span className="text-sm">🔒</span>
                        <p className="text-xs text-muted">
                          Visual image, key points &amp; examples —{" "}
                          <a href="/upgrade" className="font-semibold text-moss-600 hover:text-pine">
                            Unlock with Plus →
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      {/* Tetsu Sensei section — always visible below tabs */}
      <Card className="overflow-hidden p-0">
        <div className="flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:items-start sm:p-7 sm:text-left">
          {/* Portrait photo — circular crop focused on face */}
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full sm:h-28 sm:w-28">
            <Image
              src="/tetsu-sensei.jpg"
              alt="Tetsu Sensei"
              fill
              className="object-cover"
              style={{ objectPosition: "50% 25%" }}
              sizes="112px"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Created by</p>
            <h3 className="mt-0.5 font-serif text-xl font-bold text-pine">Tetsu Sensei</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink/75">
              Hi! I&apos;m Tetsu, a native Japanese teacher from Sapporo. I make Japanese learning
              videos on YouTube and built this app to help you write Japanese every day.
              Come say hi! 🌱
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <a
                href="https://www.youtube.com/@tetsusenseidesuyo"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-apricot/90 px-4 py-2 text-xs font-semibold text-cream transition-opacity hover:opacity-90"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1C4.5 20.4 12 20.4 12 20.4s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z" />
                </svg>
                YouTube
              </a>
              <a
                href="https://www.skool.com/tetsu-senseis-lounge-8620/about"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-moss/40 bg-mint/40 px-4 py-2 text-xs font-semibold text-pine transition-colors hover:bg-mint/70"
              >
                🏕 Skool Community
              </a>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
