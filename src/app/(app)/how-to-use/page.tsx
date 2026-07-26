import { getServerT } from "@/lib/i18n-server";
import { GuideAccordion } from "@/components/GuideAccordion";
import { RestartTourButton } from "@/components/TourLauncher";

export default async function HowToUsePage() {
  const t = await getServerT();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-pine">
          {t("tutorial.pageTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("tutorial.pageSubtitle")}</p>
      </div>

      {/* Intro */}
      <div className="rounded-2xl border border-mint bg-mint/20 p-5">
        <p className="font-serif text-lg font-bold leading-snug text-pine">
          {t("guide.intro.p1")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink/80">
          {t("guide.intro.p2")}
        </p>
      </div>

      {/* Tour launcher */}
      <div>
        <RestartTourButton />
      </div>

      {/* Feature accordion */}
      <GuideAccordion />

      {/* Plan note — plain text, no upgrade link or price (iOS App Store safe) */}
      <p className="pt-1 text-center text-xs text-muted">{t("guide.planNote")}</p>
    </div>
  );
}
