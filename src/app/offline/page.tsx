export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-cream px-6 text-center">
      <div className="text-5xl">📵</div>
      <h1 className="font-serif text-2xl font-bold text-pine">
        You&apos;re offline
      </h1>
      <p className="max-w-xs text-sm text-muted">
        Check your connection and try again. Your diary entries are saved and
        will sync when you&apos;re back online.
      </p>
      <a
        href="/dashboard"
        className="mt-2 rounded-xl bg-pine px-5 py-2.5 text-sm font-semibold text-white hover:bg-pine-700"
      >
        Try again
      </a>
    </div>
  );
}
