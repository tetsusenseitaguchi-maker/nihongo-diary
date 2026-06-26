"use client";
import { useState } from "react";

type Status = "idle" | "loading" | "success" | "already" | "self" | "error";

interface Props {
  code: string;
  inviterName: string;
}

export function ApplyInviteButton({ code, inviterName }: Props) {
  const [status, setStatus] = useState<Status>("idle");

  async function apply() {
    setStatus("loading");
    try {
      const res = await fetch("/api/invite/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data: { result?: string; error?: string } = await res.json();
      if (data.result === "success") setStatus("success");
      else if (data.result === "already_connected") setStatus("already");
      else if (data.result === "self") setStatus("self");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "idle") {
    return (
      <button
        onClick={apply}
        className="w-full rounded-2xl bg-pine px-6 py-3.5 text-base font-bold text-cream shadow-lift transition-opacity hover:opacity-90"
      >
        {inviterName}さんと繋がる →
      </button>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex w-full items-center justify-center rounded-2xl bg-pine/60 px-6 py-3.5 text-base font-bold text-cream">
        繋がっています…
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-mint px-6 py-3.5 text-base font-bold text-pine">
          ✓ {inviterName}さんと繋がりました！
        </div>
        <a
          href="/dashboard"
          className="block w-full rounded-2xl border border-line bg-paper px-6 py-2.5 text-center text-sm font-semibold text-pine hover:bg-mint/40"
        >
          ダッシュボードへ →
        </a>
      </div>
    );
  }

  if (status === "already") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-mint/50 px-6 py-3.5 text-sm font-semibold text-pine">
          ✓ すでに{inviterName}さんと繋がっています
        </div>
        <a
          href="/dashboard"
          className="block w-full rounded-2xl border border-line bg-paper px-6 py-2.5 text-center text-sm font-semibold text-pine hover:bg-mint/40"
        >
          ダッシュボードへ →
        </a>
      </div>
    );
  }

  if (status === "self") {
    return (
      <div className="rounded-2xl bg-mint/30 px-6 py-3.5 text-center text-sm text-muted">
        これはあなた自身の招待リンクです
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-apricot/20 px-6 py-3.5 text-center text-sm text-apricot">
        エラーが発生しました。もう一度お試しください。
      </div>
      <button
        onClick={() => setStatus("idle")}
        className="w-full rounded-2xl border border-line bg-paper px-6 py-2.5 text-sm font-semibold text-pine hover:bg-mint/40"
      >
        再試行
      </button>
    </div>
  );
}
