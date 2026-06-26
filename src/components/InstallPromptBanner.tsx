"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/contexts/locale";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "nd-pwa-dismissed";
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type Platform = "ios" | "android" | null;

export function InstallPromptBanner() {
  const t = useT();
  const [platform, setPlatform] = useState<Platform>(null);
  const [showSteps, setShowSteps] = useState(false);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Already running as installed PWA — hide
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as Record<string, unknown>).standalone === true
    ) return;

    // Dismissed recently — hide
    const ts = localStorage.getItem(STORAGE_KEY);
    if (ts && Date.now() - Number(ts) < COOLDOWN_MS) return;

    const ua = navigator.userAgent;

    if (/iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios/i.test(ua)) {
      // iOS Safari — no prompt API, show manual instructions
      setTimeout(() => setPlatform("ios"), 2000);
    } else if (/android/i.test(ua)) {
      // Android Chrome — wait for browser's install event
      const handler = (e: Event) => {
        e.preventDefault();
        deferredRef.current = e as BeforeInstallPromptEvent;
        setTimeout(() => setPlatform("android"), 2000);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setPlatform(null);
    setShowSteps(false);
  }

  async function handleInstall() {
    if (!deferredRef.current) return;
    await deferredRef.current.prompt();
    const { outcome } = await deferredRef.current.userChoice;
    if (outcome === "accepted") dismiss();
  }

  if (!mounted || !platform) return null;

  const banner = (
    <>
      {/* iOS step-by-step modal */}
      {showSteps && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4"
          onClick={dismiss}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-paper p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 font-serif text-lg font-bold text-pine">
              {t("pwa.howToAddTitle")}
            </h3>
            <ol className="space-y-3 text-sm text-ink">
              {([
                "pwa.iosStep1",
                "pwa.iosStep2",
                "pwa.iosStep3",
              ] as const).map((key, i) => (
                <li key={key} className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-pine text-xs font-bold text-cream">
                    {i + 1}
                  </span>
                  <span>{t(key)}</span>
                </li>
              ))}
            </ol>
            <button
              onClick={dismiss}
              className="mt-6 w-full rounded-xl bg-pine py-2.5 text-sm font-semibold text-cream hover:bg-pine-700"
            >
              {t("pwa.done")}
            </button>
          </div>
        </div>
      )}

      {/* Bottom banner */}
      <div className="fixed bottom-20 left-4 right-4 z-50 lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-sm">
        <div className="flex items-center gap-3 rounded-2xl bg-pine p-4 shadow-xl ring-1 ring-white/10">
          {/* App icon */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt=""
            className="h-12 w-12 flex-shrink-0 rounded-xl"
          />

          {/* Text */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-cream">
              {t("pwa.installTitle")}
            </p>
            <p className="mt-0.5 text-xs text-moss">{t("pwa.installDesc")}</p>
          </div>

          {/* Dismiss */}
          <button
            onClick={dismiss}
            aria-label={t("pwa.notNow")}
            className="flex-shrink-0 rounded-full p-1 text-moss hover:text-cream"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13"/>
            </svg>
          </button>
        </div>

        {/* CTA row */}
        <div className="mt-2 flex gap-2">
          {platform === "ios" && (
            <button
              onClick={() => setShowSteps(true)}
              className="flex-1 rounded-xl bg-moss-600 py-2 text-sm font-semibold text-cream hover:bg-moss"
            >
              {t("pwa.howToAdd")}
            </button>
          )}
          {platform === "android" && (
            <button
              onClick={handleInstall}
              className="flex-1 rounded-xl bg-moss-600 py-2 text-sm font-semibold text-cream hover:bg-moss"
            >
              {t("pwa.install")}
            </button>
          )}
          <button
            onClick={dismiss}
            className="rounded-xl border border-moss-600/40 bg-pine/80 px-4 py-2 text-sm text-moss hover:text-cream"
          >
            {t("pwa.notNow")}
          </button>
        </div>
      </div>
    </>
  );

  return createPortal(banner, document.body);
}
