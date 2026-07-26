"use client";

import { useRouter } from "next/navigation";
import { useTour } from "@/contexts/tour";
import { useT } from "@/contexts/locale";

/**
 * "Take the tour again", on the guide page.
 *
 * It also navigates, which is not optional: step 1 belongs to /dashboard, so
 * a tour started from /how-to-use would be treated as gone off-script the
 * moment the user pressed Start. Starting first and pushing second is safe —
 * step 0 belongs to no particular route, and /how-to-use and /dashboard share
 * the (app) layout, so the provider is not remounted and the tour survives
 * the navigation.
 *
 * Manual relaunches ignore the "already seen" flag entirely: they neither
 * read nor write it, so this button works however many times it is pressed.
 */
export function TourRestartButton() {
  const t = useT();
  const router = useRouter();
  const { start } = useTour();

  return (
    <button
      onClick={() => {
        start();
        router.push("/dashboard");
      }}
      className="inline-flex items-center gap-2 rounded-2xl bg-pine px-6 py-3 font-bold text-cream shadow-lift transition-opacity hover:opacity-90 active:opacity-80"
    >
      ▶ {t("tutorial.restartTour")}
    </button>
  );
}
