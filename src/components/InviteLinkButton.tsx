"use client";
import { useState } from "react";
import { useT } from "@/contexts/locale";

// Strip trailing slash and www. so the URL is always canonical.
// Vercel env var may be set with or without www — normalise here.
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://nihongodiary.app"
)
  .replace(/\/$/, "")
  .replace("://www.", "://");

interface Props {
  inviteCode: string;
}

export function InviteLinkButton({ inviteCode }: Props) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${SITE_URL}/invite/${inviteCode}`;

  async function handleShare() {
    if (typeof navigator === "undefined") return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Nihongo Diary",
          text: t("invite.shareText"),
          url: inviteUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  const hasNativeShare =
    typeof navigator !== "undefined" && "share" in navigator;

  return (
    <div className="space-y-3">
      {/* URL display */}
      <div className="flex items-center gap-2 rounded-xl border border-line bg-mint/20 px-3 py-2.5">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink/70">
          {inviteUrl}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleShare}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-pine px-4 py-2.5 text-sm font-bold text-cream transition-opacity hover:opacity-90 active:opacity-80"
        >
          {hasNativeShare
            ? t("invite.share")
            : copied
              ? t("invite.copied")
              : t("invite.copyUrl")}
        </button>

        {/* Explicit copy button — always visible */}
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-xl border border-line bg-paper px-3 py-2.5 text-xs font-semibold text-pine transition-colors hover:border-moss hover:bg-mint/40"
        >
          {copied ? t("invite.copiedShort") : t("invite.copy")}
        </button>
      </div>
    </div>
  );
}
