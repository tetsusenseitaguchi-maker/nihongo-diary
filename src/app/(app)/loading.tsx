// Next.js App Router convention: automatically wraps (app)/layout.tsx's
// {children} in a Suspense boundary using this as the fallback, so the
// sidebar/header/bottom nav stay visible and only the content area shows
// this while a route segment's data fetching is in flight. Same ring-spinner
// visual language already used for in-component loading states (e.g.
// DeleteDiaryButton.tsx, UserSearch.tsx), just larger and recolored for a
// light background.
export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-mint border-t-moss" />
    </div>
  );
}
