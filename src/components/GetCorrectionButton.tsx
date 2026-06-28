"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { useT } from "@/contexts/locale";

export function GetCorrectionButton({ entryId }: { entryId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const t = useT();

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/correct-existing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          setError(t("write.limitTitle"));
        } else {
          setError(data?.error || t("diary.correctionError"));
        }
        return;
      }
      router.refresh();
    } catch {
      setError(t("diary.correctionError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          t("diary.gettingCorrection")
        ) : (
          <>
            <Icon.sparkle className="h-4 w-4" />
            {t("diary.getCorrectionNow")}
          </>
        )}
      </button>
      {error && (
        <p className="text-sm text-apricot">{error}</p>
      )}
    </div>
  );
}
