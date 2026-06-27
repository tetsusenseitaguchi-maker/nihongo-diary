import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Obie } from "@/components/Obie";
import { Card } from "@/components/ui";
import { Icon, renderIcon } from "@/components/icons";
import { PublicLangSwitcher } from "@/components/PublicLangSwitcher";
import { type Locale } from "@/lib/i18n";

type T = (key: string, params?: Record<string, string | number>) => string;

export function LandingPageNew({ t, locale }: { t: T; locale: Locale }) {
  const features: Array<{ icon: string; title: string; body: string }> = [
    { icon: "sparkle",  title: t("lp.features.f1.title"),  body: t("lp.features.f1.body") },
    { icon: "mic",      title: t("lp.features.f2.title"),  body: t("lp.features.f2.body") },
    { icon: "feed",     title: t("lp.features.f3.title"),  body: t("lp.features.f3.body") },
    { icon: "history",  title: t("lp.features.f4.title"),  body: t("lp.features.f4.body") },
    { icon: "flame",    title: t("lp.features.f5.title"),  body: t("lp.features.f5.body") },
    { icon: "book",     title: t("lp.features.f6.title"),  body: t("lp.features.f6.body") },
    { icon: "arrow",    title: t("lp.features.f7.title"),  body: t("lp.features.f7.body") },
    { icon: "calendar", title: t("lp.features.f8.title"),  body: t("lp.features.f8.body") },
    { icon: "support",  title: t("lp.features.f9.title"),  body: t("lp.features.f9.body") },
    { icon: "pen",      title: t("lp.features.f10.title"), body: t("lp.features.f10.body") },
  ];

  const pillars = [
    { title: t("lp.solution.p1.title"), body: t("lp.solution.p1.body") },
    { title: t("lp.solution.p2.title"), body: t("lp.solution.p2.body") },
    { title: t("lp.solution.p3.title"), body: t("lp.solution.p3.body") },
  ];

  const steps = [
    t("lp.steps.s1"),
    t("lp.steps.s2"),
    t("lp.steps.s3"),
  ];

  const teacherBody = [
    t("lp.teacher.body1"),
    t("lp.teacher.body2"),
    t("lp.teacher.body3"),
    t("lp.teacher.body4"),
  ];

  return (
    <div className="min-h-screen bg-cream">

      {/* ── NAV ─────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 border-b border-line/70 bg-cream/85 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            <PublicLangSwitcher currentLocale={locale} />
            <Link
              href="/login"
              className="hidden rounded-full px-4 py-2 text-sm font-semibold text-pine hover:bg-mint sm:inline-block"
            >
              {t("lp.nav.login")}
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-pine px-4 text-sm font-semibold text-cream transition hover:bg-pine/90"
            >
              {t("lp.nav.cta")}
            </Link>
          </div>
        </div>
      </header>

      {/* ── 1. HERO ─────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-cream">
        {/* Radial light: soft white glow from top */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(255,255,255,0.60) 0%, transparent 68%)" }}
          aria-hidden
        />
        {/* Genkou paper texture at low opacity on cream */}
        <div className="genkou absolute inset-0 opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-20 sm:px-6 sm:pt-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              {/* Coral eyebrow accent — decorative only */}
              <div className="mb-5 flex items-center gap-2.5" aria-hidden>
                <span className="h-2 w-2 rounded-full" style={{ background: "#e3704c" }} />
                <span className="h-px w-10 bg-pine/20" />
              </div>

              <h1 className="font-serif text-4xl font-extrabold leading-[1.1] tracking-tight text-pine sm:text-5xl lg:text-[3.5rem]">
                {t("lp.hero.h1a")}
                <br />
                <span className="text-ink">{t("lp.hero.h1b")}</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed" style={{ color: "#5d6b62" }}>
                {t("lp.hero.subhead")}
              </p>
              <div className="mt-8">
                {/* Glossy deep-green CTA pill */}
                <Link
                  href="/signup"
                  className="relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-full px-7 text-base font-bold text-cream transition-transform active:scale-[0.97]"
                  style={{
                    background: "linear-gradient(180deg,#27664f 0%,#154a37 45%,#0f3d2e 100%)",
                    boxShadow: "0 1px 0 rgba(255,255,255,.18) inset, 0 -8px 14px rgba(0,0,0,.12) inset, 0 8px 18px rgba(15,61,46,.28)",
                  }}
                >
                  {/* Upper-half gloss layer */}
                  <span
                    className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full"
                    style={{ background: "linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,0))" }}
                    aria-hidden
                  />
                  <span className="relative flex items-center gap-2">
                    {t("lp.hero.cta")} <Icon.arrow className="h-5 w-5" />
                  </span>
                </Link>
              </div>
              <p className="mt-4 text-sm" style={{ color: "#8a948b" }}>{t("lp.hero.microcopy")}</p>
            </div>
            <div className="mx-auto w-full max-w-sm lg:max-w-none">
              <DiaryCard />
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. THE PROBLEM ──────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif text-3xl font-extrabold leading-snug tracking-tight text-pine sm:text-4xl">
            {t("lp.problem.h2")}
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-ink/75">{t("lp.problem.body1")}</p>
          <p className="mt-4 text-lg leading-relaxed text-ink/75">{t("lp.problem.body2")}</p>
          <ul className="mt-5 space-y-3">
            {[t("lp.problem.bullet1"), t("lp.problem.bullet2")].map((bullet, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-2xl bg-sand/60 px-5 py-4 text-[15px] leading-relaxed text-ink/80"
              >
                <span className="mt-0.5 shrink-0 font-bold text-apricot">✗</span>
                {bullet}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-lg font-semibold leading-relaxed text-pine">
            {t("lp.problem.body3")}
          </p>
        </div>
      </section>

      {/* ── 3. THE SOLUTION ─────────────────────────────── */}
      <section className="bg-pine">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-extrabold tracking-tight text-cream sm:text-4xl">
              {t("lp.solution.h2")}
            </h2>
            <p className="mt-4 text-lg text-cream/70">{t("lp.solution.intro")}</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {pillars.map((p, i) => (
              <div
                key={i}
                className="rounded-[var(--radius-card)] bg-white/5 p-7 ring-1 ring-cream/10"
              >
                <p className="mb-3 font-serif text-3xl font-extrabold text-moss-300/60">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="font-serif text-xl font-bold text-cream">{p.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-cream/70">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. FEATURES ─────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="max-w-2xl font-serif text-3xl font-extrabold tracking-tight text-pine sm:text-4xl">
          {t("lp.features.h2")}
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="flex flex-col p-6 transition-shadow hover:shadow-lift">
              <span className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-mint text-pine">
                {renderIcon(f.icon, "h-5 w-5")}
              </span>
              <h3 className="font-serif text-base font-bold text-pine">{f.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink/70">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── 5. HOW IT WORKS ─────────────────────────────── */}
      <section className="bg-sand/40">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="max-w-2xl font-serif text-3xl font-extrabold tracking-tight text-pine sm:text-4xl">
            {t("lp.steps.h2")}
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((s, i) => (
              <Card key={i} className="p-7">
                <span className="font-serif text-3xl font-extrabold text-moss/40">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-4 text-[15px] leading-relaxed text-ink/80">{s}</p>
              </Card>
            ))}
          </div>
          <p className="mt-8 text-center font-semibold text-pine">
            {t("lp.steps.closing")}
          </p>
        </div>
      </section>

      {/* ── 6. MEET YOUR TEACHER ────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.6fr]">
          <div className="flex flex-col gap-4">
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl">
              <Image
                src="/tetsu-sensei.jpg"
                alt="Tetsu Sensei, Japanese teacher in Sapporo"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 380px"
              />
            </div>
            <p className="text-center text-sm font-semibold text-pine">{t("lp.teacher.name")}</p>
            <Link
              href="https://youtube.com/@tetsusenseidesuyo"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-xl border border-moss/30 bg-mint/20 px-4 py-2.5 text-center text-sm font-semibold text-pine transition hover:bg-mint/50"
            >
              {t("lp.teacher.cta")}
            </Link>
          </div>
          <div className="space-y-5">
            {teacherBody.map((para, i) => (
              <p key={i} className="text-[17px] leading-relaxed text-ink/80">
                {para}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. PRICING ──────────────────────────────────── */}
      <section className="bg-sand/30">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="mx-auto max-w-2xl text-center font-serif text-3xl font-extrabold tracking-tight text-pine sm:text-4xl">
            {t("lp.pricing.h2")}
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            <PricingCard
              name={t("lp.pricing.free.name")}
              price={t("lp.pricing.free.price")}
              cadence=""
              tagline={t("lp.pricing.free.tagline")}
              features={[
                t("lp.pricing.free.f1"),
                t("lp.pricing.free.f2"),
                t("lp.pricing.free.f3"),
                t("lp.pricing.free.f4"),
              ]}
              cta={t("lp.pricing.free.cta")}
              ctaHref="/signup"
              highlight={false}
            />
            <PricingCard
              name={t("lp.pricing.plus.name")}
              price={t("lp.pricing.plus.price")}
              cadence={t("lp.pricing.plus.cadence")}
              tagline={t("lp.pricing.plus.tagline")}
              features={[
                t("lp.pricing.plus.f1"),
                t("lp.pricing.plus.f2"),
                t("lp.pricing.plus.f3"),
                t("lp.pricing.plus.f4"),
              ]}
              cta={t("lp.pricing.plus.cta")}
              ctaHref="/upgrade"
              highlight={true}
              badge={t("lp.pricing.badge.popular")}
            />
            <PricingCard
              name={t("lp.pricing.pro.name")}
              price={t("lp.pricing.pro.price")}
              cadence={t("lp.pricing.pro.cadence")}
              tagline={t("lp.pricing.pro.tagline")}
              features={[
                t("lp.pricing.pro.f1"),
                t("lp.pricing.pro.f2"),
                t("lp.pricing.pro.f3"),
                t("lp.pricing.pro.f4"),
              ]}
              cta={t("lp.pricing.pro.cta")}
              ctaHref="/upgrade"
              highlight={false}
            />
          </div>
          <p className="mt-8 text-center">
            <Link
              href="/upgrade"
              className="text-sm font-semibold text-pine underline-offset-2 hover:underline"
            >
              {t("lp.pricing.compare")}
            </Link>
          </p>
        </div>
      </section>

      {/* ── 8. FINAL CTA ────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6">
        <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-pine p-10 text-center shadow-lift sm:p-16">
          <div className="genkou absolute inset-0 opacity-[0.07]" aria-hidden />
          <div className="relative">
            <Obie size={56} className="mx-auto mb-5" />
            <h2 className="mx-auto max-w-2xl font-serif text-3xl font-extrabold tracking-tight text-cream sm:text-4xl">
              {t("lp.cta.h2")}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-cream/75">{t("lp.cta.subhead")}</p>
            <div className="mt-8">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-cream px-7 text-base font-bold text-pine transition hover:bg-paper active:scale-95"
              >
                {t("lp.cta.btn")} <Icon.arrow className="h-5 w-5" />
              </Link>
            </div>
            <p className="mt-4 text-sm text-cream/40">{t("lp.cta.microcopy")}</p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <Logo />
          <p className="text-sm text-muted">{t("landing.footer.copy")}</p>
        </div>
        <div className="border-t border-line px-4 py-4 text-center text-xs leading-relaxed text-muted">
          <p>{t("landing.footer.disclaimer")}</p>
          <p className="mt-1">{t("landing.footer.beta")}</p>
        </div>
      </footer>
    </div>
  );
}

function DiaryCard() {
  return (
    <div style={{ transform: "rotate(-1.5deg)" }}>
      <div
        className="relative overflow-hidden rounded-2xl p-5"
        style={{
          background: "#fdfbf4",
          border: "1px solid #e7e0cf",
          boxShadow: "0 20px 60px rgba(15,61,46,0.12), 0 4px 16px rgba(0,0,0,0.06)",
        }}
      >
        {/* Glass sheen */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 40%)" }}
          aria-hidden
        />

        {/* Header row */}
        <div className="relative mb-4 flex items-center justify-between">
          {/* TODO i18n: lp.heroCard.label */}
          <span className="text-xs font-medium" style={{ color: "#9ca3af" }}>Today&apos;s entry</span>
          <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: "#e8f0eb", color: "#1d4a2e" }}>N4</span>
        </div>

        {/* Diary text — Japanese hardcoded (example content, not i18n) */}
        <p className="relative mb-4 font-jp text-[15px] leading-relaxed text-ink">
          今日は友達と公園に行きました。天気がよくて、
          <span style={{ borderBottom: "2px solid #e3704c" }}>楽しいでした</span>
          ！
        </p>

        {/* Natural rewrite block */}
        <div className="relative mb-4 rounded-xl p-3.5" style={{ background: "#f0f5f1" }}>
          <div className="mb-2 flex items-center gap-1.5">
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
              style={{ background: "#2d6a4f", color: "#fff" }}
            >
              ✓
            </span>
            {/* TODO i18n: lp.heroCard.rewriteLabel */}
            <span className="text-xs font-semibold" style={{ color: "#2d6a4f" }}>Natural rewrite</span>
          </div>
          {/* Japanese hardcoded (example content, not i18n) */}
          <p className="font-jp text-[14px] leading-relaxed" style={{ color: "#374151" }}>
            今日は友達と公園に行きました。天気がよくて、
            <span className="font-semibold" style={{ color: "#2d6a4f" }}>楽しかったです</span>
            ！
          </p>
        </div>

        {/* Obie streak bubble */}
        <div
          className="flex items-center gap-2.5 rounded-xl bg-white p-3"
          style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.07)", border: "1px solid #f0ede6" }}
        >
          <div
            className="h-7 w-7 shrink-0 rounded-full"
            style={{ background: "radial-gradient(circle at 35% 35%, #c9a97a, #8b5e34)" }}
          />
          {/* TODO i18n: lp.heroCard.streak */}
          <p className="text-xs" style={{ color: "#6b7280" }}>
            Obie:{" "}
            <span className="font-bold" style={{ color: "#e3704c" }}>3-day streak!</span>
            {" "}Keep going 🐾
          </p>
        </div>
      </div>
    </div>
  );
}

function PricingCard({
  name, price, cadence, tagline, features, cta, ctaHref, highlight, badge,
}: {
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlight: boolean;
  badge?: string;
}) {
  return (
    <Card
      className={[
        "relative flex flex-col p-6",
        highlight ? "ring-2 ring-moss" : "",
      ].filter(Boolean).join(" ")}
    >
      {badge && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-pine px-3 py-1 text-[11px] font-bold text-cream">
          {badge}
        </span>
      )}
      <h3 className="font-serif text-xl font-bold text-pine">{name}</h3>
      <p className="mt-1">
        <span className="font-serif text-3xl font-bold text-pine">{price}</span>
        {cadence && <span className="ml-0.5 text-sm text-muted">{cadence}</span>}
      </p>
      <p className="mt-2 min-h-[2.5rem] text-xs leading-snug text-ink/60">{tagline}</p>
      <ul className="mt-4 flex-1 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-ink/80">
            <Icon.check className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-5">
        <Link
          href={ctaHref}
          className={
            highlight
              ? "block w-full rounded-full bg-pine px-4 py-2.5 text-center text-sm font-semibold text-cream transition hover:bg-pine/90"
              : "block w-full rounded-full border border-pine/40 px-4 py-2.5 text-center text-sm font-semibold text-pine transition hover:bg-mint/30"
          }
        >
          {cta}
        </Link>
      </div>
    </Card>
  );
}
