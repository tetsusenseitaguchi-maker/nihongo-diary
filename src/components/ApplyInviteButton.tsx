"use client";
import { useState } from "react";
import { useT } from "@/contexts/locale";

type Status = "idle" | "loading" | "success" | "already" | "self" | "error";

interface Props {
  code: string;
  inviterName: string;
}

export function ApplyInviteButton({ code, inviterName }: Props) {
  const t = useT();
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
        {t("invite.connectWith", { name: inviterName })}
      </button>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex w-full items-center justify-center rounded-2xl bg-pine/60 px-6 py-3.5 text-base font-bold text-cream">
        {t("invite.connecting")}
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-mint px-6 py-3.5 text-base font-bold text-pine">
          {t("invite.connected", { name: inviterName })}
        </div>
        <a
          href="/dashboard"
          className="block w-full rounded-2xl border border-line bg-paper px-6 py-2.5 text-center text-sm font-semibold text-pine hover:bg-mint/40"
        >
          {t("invite.toDashboard")}
        </a>
      </div>
    );
  }

  if (status === "already") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-mint/50 px-6 py-3.5 text-sm font-semibold text-pine">
          {t("invite.alreadyConnected", { name: inviterName })}
        </div>
        <a
          href="/dashboard"
          className="block w-full rounded-2xl border border-line bg-paper px-6 py-2.5 text-center text-sm font-semibold text-pine hover:bg-mint/40"
        >
          {t("invite.toDashboard")}
        </a>
      </div>
    );
  }

  if (status === "self") {
    return (
      <div className="rounded-2xl bg-mint/30 px-6 py-3.5 text-center text-sm text-muted">
        {t("invite.selfInvite")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-apricot/20 px-6 py-3.5 text-center text-sm text-apricot">
        {t("invite.error")}
      </div>
      <button
        onClick={() => setStatus("idle")}
        className="w-full rounded-2xl border border-line bg-paper px-6 py-2.5 text-sm font-semibold text-pine hover:bg-mint/40"
      >
        {t("invite.retry")}
      </button>
    </div>
  );
}
