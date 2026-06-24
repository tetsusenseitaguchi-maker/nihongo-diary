"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  diaryId: string;
  redirectAfter?: boolean;
  onDeleted?: () => void;
}

export function DeleteDiaryButton({ diaryId, redirectAfter = false, onDeleted }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/diary/${diaryId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "削除に失敗しました。");
        setLoading(false);
        return;
      }
      setShowConfirm(false);
      if (redirectAfter) {
        router.push("/history");
      } else {
        onDeleted?.();
      }
    } catch {
      setError("ネットワークエラーです。接続を確認してください。");
      setLoading(false);
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => { setError(null); setShowConfirm(true); }}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink/60 transition-colors hover:border-apricot/50 hover:text-apricot"
        aria-label="日記を削除"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9" />
        </svg>
        削除
      </button>

      {/* Error (shown outside modal, e.g. after modal closes on error) */}
      {error && !showConfirm && (
        <p className="mt-1 text-xs text-apricot">{error}</p>
      )}

      {/* Confirmation modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget && !loading) setShowConfirm(false); }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-paper p-6 shadow-xl">
            <h2 className="font-serif text-lg font-bold text-pine">日記を削除しますか？</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">
              この日記と添付ファイルを削除します。<br />
              <strong className="text-apricot">元に戻すことはできません。</strong>
            </p>

            {error && (
              <p className="mt-3 rounded-xl bg-apricot/10 px-3 py-2 text-xs text-apricot">
                {error}
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="flex-1 rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink hover:bg-mint/50 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 rounded-full bg-apricot px-4 py-2.5 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cream/30 border-t-cream" />
                    削除中…
                  </span>
                ) : (
                  "削除する"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
