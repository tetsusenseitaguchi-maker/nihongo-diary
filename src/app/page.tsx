import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Obie } from "@/components/Obie";
import { LinkButton, Card, Badge, SectionLabel } from "@/components/ui";
import { Icon, renderIcon } from "@/components/icons";
import { PricingGrid } from "@/components/PricingGrid";
import { PublicLangSwitcher } from "@/components/PublicLangSwitcher";
import { getServerT, getLocaleFromCookie } from "@/lib/i18n-server";

export default async function LandingPage() {
  const locale = await getLocaleFromCookie();
  const t = await getServerT(locale);

  const features = [
    { icon: "sparkle", title: t("landing.feature.ai.title"), body: t("landing.feature.ai.body") },
    { icon: "book", title: t("landing.feature.history.title"), body: t("landing.feature.history.body") },
    { icon: "calendar", title: t("landing.feature.calendar.title"), body: t("landing.feature.calendar.body") },
    { icon: "support", title: t("landing.feature.obie.title"), body: t("landing.feature.obie.body") },
    { icon: "pen", title: t("landing.feature.level.title"), body: t("landing.feature.level.body") },
    { icon: "flame", title: t("landing.feature.habit.title"), body: t("landing.feature.habit.body") },
  ];

  const steps = [
    { n: "01", title: t("landing.step1.title"), body: t("landing.step1.body") },
    { n: "02", title: t("landing.step2.title"), body: t("landing.step2.body") },
    { n: "03", title: t("landing.step3.title"), body: t("landing.step3.body") },
    { n: "04", title: t("landing.step4.title"), body: t("landing.step4.body") },
  ];

  return (
    <div className="min-h-screen bg-cream">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-cream/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            <PublicLangSwitcher currentLocale={locale} />
            <Link
              href="/login"
              className="hidden rounded-full px-4 py-2 text-sm font-semibold text-pine hover:bg-mint sm:inline-block"
            >
              {t("landing.nav.login")}
            </Link>
            <LinkButton href="/signup" size="sm">
              {t("landing.nav.startFree")}
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
                <Icon.flame className="h-3.5 w-3.5" /> {t("landing.badge")}
              </Badge>
              <h1 className="font-serif text-4xl font-extrabold leading-[1.08] tracking-tight text-pine sm:text-5xl lg:text-6xl">
                {t("landing.hero.h1a")}
                <br />
                <span className="text-moss-600">
                  {t("landing.hero.h1b")}
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/75">
                {t("landing.hero.lead")}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <LinkButton href="/signup" size="lg">
                  {t("landing.hero.ctaPrimary")} <Icon.arrow className="h-5 w-5" />
                </LinkButton>
                <LinkButton href="/write" variant="secondary" size="lg">
                  {t("landing.hero.ctaSecondary")}
                </LinkButton>
              </div>
              <p className="mt-4 text-sm text-muted">
                {t("landing.hero.subtext")}
              </p>
            </div>

            {/* Hero card — Japanese diary sample (kept as decoration) */}
            <div className="relative">
              <Card className="genkou-soft relative overflow-hidden p-6 shadow-lift">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted">
                    {t("landing.hero.cardLabel")}
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
                {t("landing.hero.streak", { n: 12 })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>{t("landing.problem.label")}</SectionLabel>
          <h2 className="mt-4 font-serif text-3xl font-extrabold tracking-tight text-pine sm:text-4xl">
            {t("landing.problem.h2")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink/70">
            {t("landing.problem.body")}
          </p>
        </div>
      </section>

      {/* Solution */}
      <section className="bg-pine">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <SectionLabel>{t("landing.solution.label")}</SectionLabel>
              <h2 className="mt-4 font-serif text-3xl font-extrabold tracking-tight text-cream sm:text-4xl">
                {t("landing.solution.h2")}
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-cream/80">
                {t("landing.solution.body")}
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  t("landing.solution.li1"),
                  t("landing.solution.li2"),
                  t("landing.solution.li3"),
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-cream/90">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-moss text-cream">
                      <Icon.check className="h-4 w-4" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <Card className="bg-paper p-6 shadow-lift">
              <div className="grid grid-cols-2 gap-4 text-center">
                <Stat value="3 min" label={t("landing.stat.entry")} />
                <Stat value="N5–N3" label={t("landing.stat.levels")} />
                <Stat value="100%" label={t("landing.stat.saved")} />
                <Stat value="Daily" label={t("landing.stat.habit")} />
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <SectionLabel>{t("landing.features.label")}</SectionLabel>
          <h2 className="mt-4 font-serif text-3xl font-extrabold tracking-tight text-pine sm:text-4xl">
            {t("landing.features.h2")}
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
            <SectionLabel>{t("landing.steps.label")}</SectionLabel>
            <h2 className="mt-4 font-serif text-3xl font-extrabold tracking-tight text-pine sm:text-4xl">
              {t("landing.steps.h2")}
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
          <SectionLabel>{t("landing.pricing.label")}</SectionLabel>
          <h2 className="mt-4 font-serif text-3xl font-extrabold tracking-tight text-pine sm:text-4xl">
            {t("landing.pricing.h2")}
          </h2>
        </div>
        <div className="mt-10">
          <PricingGrid mode="landing" />
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <Card className="genkou-soft relative overflow-hidden bg-pine p-10 text-center shadow-lift sm:p-14">
          <div className="relative">
            <Obie size={64} className="mx-auto mb-5" />
            <h2 className="font-serif text-3xl font-extrabold tracking-tight text-cream sm:text-4xl">
              {t("landing.cta.h2")}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-lg text-cream/80">
              {t("landing.cta.body")}
            </p>
            <div className="mt-7 flex justify-center">
              <Link
                href="/write"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-cream px-6 text-base font-semibold text-pine transition-colors hover:bg-paper active:bg-sand"
              >
                {t("landing.cta.btn")} <Icon.arrow className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <Logo />
          <p className="text-sm text-muted">
            {t("landing.footer.copy")}
          </p>
        </div>
        <div className="border-t border-line px-4 py-4 text-center text-xs leading-relaxed text-muted">
          <p>{t("landing.footer.disclaimer")}</p>
          <p className="mt-1">{t("landing.footer.beta")}</p>
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
