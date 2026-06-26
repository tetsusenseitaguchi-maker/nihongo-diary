import { getServerT } from "@/lib/i18n-server";
import { Card } from "@/components/ui";
import { RestartTourButton } from "@/components/TourLauncher";

export default async function HowToUsePage() {
  const t = await getServerT();

  const features = [
    {
      emoji: "✍️",
      titleKey: "tutorial.step1.title",
      detailKey: "tutorial.step1.detail",
      href: "/write",
    },
    {
      emoji: "🤖",
      titleKey: "tutorial.step2.title",
      detailKey: "tutorial.step2.detail",
      href: "/write",
    },
    {
      emoji: "📖",
      titleKey: "tutorial.step3.title",
      detailKey: "tutorial.step3.detail",
      href: "/history",
    },
    {
      emoji: "👥",
      titleKey: "tutorial.step4.title",
      detailKey: "tutorial.step4.detail",
      href: "/feed",
    },
  ] as const;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-pine">
          {t("tutorial.pageTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("tutorial.pageSubtitle")}</p>
      </div>

      {/* Tour launcher */}
      <div className="rounded-2xl border border-mint bg-mint/20 p-5">
        <p className="mb-3 text-sm leading-relaxed text-ink/80">
          {t("tutorial.step5.desc")}
        </p>
        <RestartTourButton />
      </div>

      {/* Feature cards */}
      <div className="space-y-4">
        {features.map(({ emoji, titleKey, detailKey }) => (
          <Card key={titleKey} className="p-5">
            <div className="flex gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mint text-2xl">
                {emoji}
              </span>
              <div className="min-w-0">
                <h2 className="font-serif font-bold text-pine">
                  {t(titleKey)}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-ink/80">
                  {t(detailKey)}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
