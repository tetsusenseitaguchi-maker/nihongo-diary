"use client";

import { useState } from "react";
import { Furigana } from "@/components/Furigana";
import { Card, Badge, LinkButton } from "@/components/ui";
import { Icon } from "@/components/icons";
import { ObiePhoto } from "@/components/ObiePhoto";

type Tab = "templates" | "ideas";

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

      {/* Tabs */}
      <div className="inline-flex rounded-full border border-line bg-paper p-1">
        {([["templates", "Templates"], ["ideas", "Key Ideas"]] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
              tab === t ? "bg-pine text-cream" : "text-pine hover:bg-mint"
            }`}
          >
            {label}
          </button>
        ))}
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
    </div>
  );
}
