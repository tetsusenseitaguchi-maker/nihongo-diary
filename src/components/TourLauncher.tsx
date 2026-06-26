"use client";
import { useEffect, useState } from "react";
import { TourOverlay, TOUR_SEEN_KEY } from "@/components/TourOverlay";
import { useT } from "@/contexts/locale";

/**
 * Auto-starts the tour on first visit (localStorage flag not set).
 * Place inside the app layout so it's available on every page.
 */
export function TourLauncher() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Delay slightly so the page renders before the overlay appears
    const timer = setTimeout(() => {
      if (localStorage.getItem(TOUR_SEEN_KEY) !== "1") {
        setOpen(true);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return <TourOverlay open={open} onClose={() => setOpen(false)} />;
}

/**
 * Button that re-launches the tour. Use on the How to Use page.
 */
export function RestartTourButton() {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-2xl bg-pine px-6 py-3 font-bold text-cream shadow-lift transition-opacity hover:opacity-90 active:opacity-80"
      >
        ▶ {t("tutorial.restartTour")}
      </button>
      <TourOverlay open={open} onClose={() => setOpen(false)} />
    </>
  );
}
