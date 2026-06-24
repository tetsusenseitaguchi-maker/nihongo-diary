// Server-component-compatible viewer for saved diary attachments.
// No "use client" needed — <img> and <audio controls> are plain HTML.

export function DiaryAttachments({
  imageUrl,
  audioUrl,
}: {
  imageUrl: string | null;
  audioUrl: string | null;
}) {
  if (!imageUrl && !audioUrl) return null;

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-paper p-5 shadow-card space-y-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">
        Attachments
      </p>

      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt="Diary photo"
          className="w-full max-w-sm rounded-2xl object-cover"
        />
      )}

      {audioUrl && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-pine">音声 · Voice</p>
          <audio controls src={audioUrl} className="w-full max-w-sm" />
        </div>
      )}
    </div>
  );
}
