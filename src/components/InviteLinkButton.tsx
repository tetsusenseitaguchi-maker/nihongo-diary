"use client";
import { useState } from "react";

// Build-time constant — Next.js inlines NEXT_PUBLIC_* at compile time.
// Set NEXT_PUBLIC_SITE_URL in Vercel env vars; fallback keeps it working locally.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://nihongodiary.app";

interface Props {
  inviteCode: string;
}

export function InviteLinkButton({ inviteCode }: Props) {
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${SITE_URL}/invite/${inviteCode}`;

  async function handleShare() {
    if (typeof navigator === "undefined") return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Nihongo Diary",
          text: "一緒に日本語を学ぼう！招待リンクから登録すると最初から友達になれます。",
          url: inviteUrl,
        });
      } catch {
        // user cancelled — do nothing
      }
    } else {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  }

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
          {typeof navigator !== "undefined" && "share" in navigator ? (
            <>📤 シェア</>
          ) : copied ? (
            <>✓ コピーしました！</>
          ) : (
            <>📋 URLをコピー</>
          )}
        </button>

        {/* Explicit copy button (always visible alongside share on mobile) */}
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2200);
          }}
          className="flex items-center gap-1.5 rounded-xl border border-line bg-paper px-3 py-2.5 text-xs font-semibold text-pine transition-colors hover:border-moss hover:bg-mint/40"
        >
          {copied ? "✓ コピー済み" : "📋 コピー"}
        </button>
      </div>
    </div>
  );
}
