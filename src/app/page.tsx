import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Obie } from "@/components/Obie";
import { LinkButton, Card, Badge, SectionLabel } from "@/components/ui";
import { Icon, renderIcon } from "@/components/icons";

const features = [
  {
    icon: "sparkle",
    title: "Instant AI corrections",
    body: "Get a corrected version, a natural native rewrite, and clear English notes the moment you finish writing.",
  },
  {
    icon: "book",
    title: "Saved diary history",
    body: "Every entry and its corrections are kept in one place, so you can look back and watch your Japanese grow.",
  },
  {
    icon: "calendar",
    title: "Calendar & streaks",
    body: "See your writing days fill the calendar. A visible streak makes the habit feel real and worth protecting.",
  },
  {
    icon: "support",
    title: "Learning support from Obie",
    body: "Templates, key ideas, and friendly tips from Obie help you start writing even on the days you feel stuck.",
  },
  {
    icon: "pen",
    title: "Corrections at your level",
    body: "Choose N5 to Natural and a correction style, so feedback matches where you are — not where a textbook assumes.",
  },
  {
    icon: "flame",
    title: "Built for daily habit",
    body: "Three sentences is a great day. Nihongo Diary is designed around small wins, not perfect essays.",
  },
];

const steps = [
  {
    n: "01",
    title: "Write a few lines",
    body: "Open today's diary and write in Japanese — as little as one sentence is enough to count.",
  },
  {
    n: "02",
    title: "Get natural corrections",
    body: "Obie returns a corrected version, a natural rewrite, your key mistakes, and useful vocabulary.",
  },
  {
    n: "03",
    title: "Save and review",
    body: "Keep the entry in your history and revisit the corrections whenever you want to reinforce them.",
  },
  {
    n: "04",
    title: "Watch your streak grow",
    body: "Each day fills your calendar. Small daily writing compounds into real, lasting fluency.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-cream/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden rounded-full px-4 py-2 text-sm font-semibold text-pine hover:bg-mint sm:inline-block"
            >
              Log in
            </Link>
            <LinkButton href="/signup" size="sm">
              Start for free
            </LinkButton>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="genkou absolute inset-0 opacity-70" aria-hidden />
        <div
          className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-cream/40 via-cream/70 to-cream"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <Badge tone="moss" className="mb-5">
                <Icon.flame className="h-3.5 w-3.5" /> Build the habit, one day at a time
              </Badge>
              <h1 className="font-serif text-4xl font-extrabold leading-[1.08] tracking-tight text-pine sm:text-5xl lg:text-6xl">
                Write Japanese every day.
                <br />
                <span className="text-moss-600">
                  Get natural corrections instantly.
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/75">
                Nihongo Diary helps Japanese learners build a daily writing
                habit with AI corrections, saved diary history, calendar
                tracking, and learning support from Obie.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <LinkButton href="/signup" size="lg">
                  Start for free <Icon.arrow className="h-5 w-5" />
                </LinkButton>
                <LinkButton href="/write" variant="secondary" size="lg">
                  Try writing a diary
                </LinkButton>
              </div>
              <p className="mt-4 text-sm text-muted">
                No credit card needed · Free to start
              </p>
            </div>

            {/* Hero card — a diary sample on manuscript paper */}
            <div className="relative">
              <Card className="genkou-soft relative overflow-hidden p-6 shadow-lift">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted">
                    Today&apos;s diary
                  </span>
                  <Badge tone="moss">N4</Badge>
                </div>
                <p className="font-jp text-lg leading-relaxed text-ink">
                  今日は友だちと公園に行きました。天気がよかったので、たくさん歩きました。
                </p>
                <div className="my-4 h-px bg-line" />
                <div className="flex items-start gap-3 rounded-2xl bg-mint/60 p-3">
                  <Obie size={36} className="shrink-0" />
                  <p className="text-sm leading-relaxed text-ink/80">
                    Nice work! Just one fix:{" "}
                    <span className="font-jp text-ink/50 line-through">
                      かわいいでした
                    </span>{" "}
                    <span className="text-moss">→</span>{" "}
                    <span className="font-jp font-semibold text-pine">
                      かわいかったです
                    </span>
                  </p>
                </div>
              </Card>
              <div className="absolute -bottom-4 -left-4 hidden rotate-[-6deg] rounded-2xl bg-pine px-4 py-2 text-sm font-bold text-cream shadow-lift sm:block">
                12-day streak 🔥
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>The problem</SectionLabel>
          <h2 className="mt-4 font-serif text-3xl font-extrabold tracking-tight text-pine sm:text-4xl">
            You&apos;ve studied the grammar. You still freeze when you write.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink/70">
            Most learners read and listen far more than they produce. Without
            real writing and honest feedback, the same mistakes repeat — and
            motivation quietly fades when no one is there to say &ldquo;close,
            try this.&rdquo;
          </p>
        </div>
      </section>

      {/* Solution */}
      <section className="bg-pine">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <SectionLabel>The solution</SectionLabel>
              <h2 className="mt-4 font-serif text-3xl font-extrabold tracking-tight text-cream sm:text-4xl">
                A small diary today beats a perfect essay someday.
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-cream/80">
                Write a few honest lines in Japanese. Obie corrects them, shows
                you a natural version, and points out exactly what to fix. Save
                it, and tomorrow you do it again. That loop is how fluency is
                actually built.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Write at your own level, from N5 to natural",
                  "See corrections and a native-style rewrite side by side",
                  "Keep everything, and watch the calendar fill up",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-3 text-cream/90">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-moss text-cream">
                      <Icon.check className="h-4 w-4" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <Card className="bg-paper p-6 shadow-lift">
              <div className="grid grid-cols-2 gap-4 text-center">
                <Stat value="3 min" label="A daily entry" />
                <Stat value="N5–N3" label="Levels supported" />
                <Stat value="100%" label="Entries saved" />
                <Stat value="Daily" label="Habit by design" />
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <SectionLabel>Features</SectionLabel>
          <h2 className="mt-4 font-serif text-3xl font-extrabold tracking-tight text-pine sm:text-4xl">
            Everything you need to keep writing.
          </h2>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="p-6 transition-shadow hover:shadow-lift">
              <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-mint text-pine">
                {renderIcon(f.icon, "h-6 w-6")}
              </span>
              <h3 className="mb-1.5 font-serif text-lg font-bold text-pine">
                {f.title}
              </h3>
              <p className="text-[15px] leading-relaxed text-ink/70">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-sand/40">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <SectionLabel>How it works</SectionLabel>
            <h2 className="mt-4 font-serif text-3xl font-extrabold tracking-tight text-pine sm:text-4xl">
              Four steps, every day.
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <Card key={s.n} className="p-6">
                <span className="font-serif text-3xl font-extrabold text-moss/50">
                  {s.n}
                </span>
                <h3 className="mb-1.5 mt-2 font-serif text-lg font-bold text-pine">
                  {s.title}
                </h3>
                <p className="text-[15px] leading-relaxed text-ink/70">
                  {s.body}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>Pricing</SectionLabel>
          <h2 className="mt-4 font-serif text-3xl font-extrabold tracking-tight text-pine sm:text-4xl">
            Start free. Upgrade when you&apos;re ready.
          </h2>
        </div>
        <div className="mx-auto mt-10 grid max-w-3xl gap-5 sm:grid-cols-2">
          <Card className="p-7">
            <h3 className="font-serif text-xl font-bold text-pine">Free</h3>
            <p className="mt-1 text-sm text-muted">For building the habit.</p>
            <p className="mt-4 font-serif text-4xl font-extrabold text-pine">
              ¥0
            </p>
            <ul className="mt-6 space-y-2.5 text-[15px] text-ink/75">
              {[
                "Daily diary writing",
                "AI corrections & natural rewrites",
                "Saved history & calendar",
                "Templates and Obie tips",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <Icon.check className="h-4 w-4 text-moss" /> {t}
                </li>
              ))}
            </ul>
            <LinkButton href="/signup" className="mt-7 w-full">
              Start for free
            </LinkButton>
          </Card>

          <Card className="relative border-moss/50 bg-mint/30 p-7">
            <Badge tone="apricot" className="absolute right-5 top-5">
              Coming soon
            </Badge>
            <h3 className="font-serif text-xl font-bold text-pine">Pro</h3>
            <p className="mt-1 text-sm text-muted">For serious daily learners.</p>
            <p className="mt-4 font-serif text-4xl font-extrabold text-pine">
              ¥—
            </p>
            <ul className="mt-6 space-y-2.5 text-[15px] text-ink/75">
              {[
                "Everything in Free",
                "Unlimited corrections",
                "Deeper feedback & explanations",
                "Follow other learners (soon)",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <Icon.check className="h-4 w-4 text-moss" /> {t}
                </li>
              ))}
            </ul>
            <LinkButton
              href="/signup"
              variant="secondary"
              className="mt-7 w-full"
            >
              Join the waitlist
            </LinkButton>
          </Card>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <Card className="genkou-soft relative overflow-hidden bg-pine p-10 text-center shadow-lift sm:p-14">
          <div className="relative">
            <Obie size={64} className="mx-auto mb-5" />
            <h2 className="font-serif text-3xl font-extrabold tracking-tight text-cream sm:text-4xl">
              Your first diary is waiting.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-lg text-cream/80">
              Write one sentence in Japanese today. Obie will take it from there.
            </p>
            <div className="mt-7 flex justify-center">
              <LinkButton
                href="/signup"
                size="lg"
                className="bg-cream text-pine hover:bg-paper"
              >
                Start for free <Icon.arrow className="h-5 w-5" />
              </LinkButton>
            </div>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <Logo />
          <p className="text-sm text-muted">
            © 2026 Nihongo Diary · A daily Japanese writing habit
          </p>
        </div>
        <div className="border-t border-line px-4 py-4 text-center text-xs leading-relaxed text-muted">
          <p>AI corrections may not be perfect. Please use them as learning support.</p>
          <p className="mt-1">Public beta · By using this app you agree to our Terms &amp; Privacy.</p>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-mint/50 px-3 py-5">
      <p className="font-serif text-2xl font-extrabold text-pine">{value}</p>
      <p className="mt-1 text-xs font-medium text-muted">{label}</p>
    </div>
  );
}
