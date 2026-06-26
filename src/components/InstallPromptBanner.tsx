"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/contexts/locale";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | null;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as Record<string, unknown>).standalone === true
  );
}

// Safari share button: box with upward arrow
function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 1v11" />
      <path d="M7 4l3-3 3 3" />
      <path d="M4 8H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}

// Square with + (Add to Home Screen)
function AddSquareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="16" height="16" rx="3.5" />
      <path d="M10 6.5v7M6.5 10h7" />
    </svg>
  );
}

// Three vertical dots (Chrome menu)
function MenuDotsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <circle cx="10" cy="4"  r="1.6" />
      <circle cx="10" cy="10" r="1.6" />
      <circle cx="10" cy="16" r="1.6" />
    </svg>
  );
}

function Step({ num, icon, text }: { num: number; icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-moss/40 text-[10px] font-bold text-cream">
        {num}
      </span>
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-cream">
        {icon}
      </span>
      <span className="text-xs leading-snug text-cream/90">{text}</span>
    </div>
  );
}

export function InstallPromptBanner() {
  const t = useT();
  const [platform, setPlatform] = useState<Platform>(null);
  const [hasNativePrompt, setHasNativePrompt] = useState(false);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isStandalone()) return;

    const ua = navigator.userAgent;

    if (/iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios/i.test(ua)) {
      setTimeout(() => setPlatform("ios"), 1500);
    } else if (/android/i.test(ua)) {
      setTimeout(() => setPlatform("android"), 1500);
      const handler = (e: Event) => {
        e.preventDefault();
        deferredRef.current = e as BeforeInstallPromptEvent;
        setHasNativePrompt(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  function dismiss() {
    setPlatform(null);
  }

  async function handleInstall() {
    if (!deferredRef.current) return;
    await deferredRef.current.prompt();
    const { outcome } = await deferredRef.current.userChoice;
    if (outcome === "accepted") setPlatform(null);
  }

  if (!mounted || !platform) return null;

  const banner = (
    <div
      role="region"
      aria-label={t("pwa.installTitle")}
      className="fixed bottom-[72px] left-3 right-3 z-50 rounded-2xl bg-pine p-4 shadow-2xl ring-1 ring-white/10 lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-[360px]"
    >
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="h-8 w-8 flex-shrink-0 rounded-xl" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-cream">{t("pwa.installTitle")}</p>
            <p className="truncate text-[11px] text-moss">{t("pwa.installDesc")}</p>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label={t("pwa.notNow")}
          className="flex-shrink-0 rounded-full p-1.5 text-moss transition-colors hover:text-cream"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M2 2l10 10M12 2L2 12" />
          </svg>
        </button>
      </div>

      {/* Step-by-step instructions */}
      <div className="space-y-2">
        {platform === "ios" && (
          <>
            <Step num={1} icon={<ShareIcon />} text={t("pwa.iosStep1")} />
            <Step num={2} icon={<AddSquareIcon />} text={t("pwa.iosStep2")} />
          </>
        )}
        {platform === "android" && (
          <>
            <Step num={1} icon={<MenuDotsIcon />} text={t("pwa.androidStep1")} />
            <Step num={2} icon={<AddSquareIcon />} text={t("pwa.androidStep2")} />
          </>
        )}
      </div>

      {/* CTA row */}
      <div className="mt-3.5 flex gap-2">
        {platform === "android" && hasNativePrompt && (
          <button
            onClick={handleInstall}
            className="flex-1 rounded-xl bg-moss-600 py-2 text-sm font-semibold text-cream transition-colors hover:bg-moss"
          >
            {t("pwa.install")}
          </button>
        )}
        <button
          onClick={dismiss}
          className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-moss transition-colors hover:text-cream"
        >
          {t("pwa.notNow")}
        </button>
      </div>
    </div>
  );

  return createPortal(banner, document.body);
}
