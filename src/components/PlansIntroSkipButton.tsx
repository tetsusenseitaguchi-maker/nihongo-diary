"use client";

import { LinkButton } from "@/components/ui";
import { markPlansIntroSeen } from "@/lib/plans-intro/seen";

/**
 * "Start writing for free" — the way out of the plan intro.
 *
 * A real link to /dashboard, not a button that navigates. Leaving this screen
 * is a navigation: an anchor keeps middle-click, open-in-new-tab and the
 * right-click menu working, and it still goes somewhere if the click handler
 * never runs. An earlier version used <Button onClick={router.push}> and threw
 * all of that away for no gain.
 *
 * A client component only because the flag lives in localStorage and
 * /welcome-plans is a Server Component. The flag is written on mount too, by
 * PlansIntroSeenMarker — that is the one that guarantees "shown once", since
 * a user can also leave this screen by subscribing. Marking here as well is
 * belt and braces, and the write is idempotent.
 */
export function PlansIntroSkipButton({ label }: { label: string }) {
  return (
    <LinkButton
      href="/dashboard"
      variant="secondary"
      size="lg"
      className="w-full"
      onClick={() => markPlansIntroSeen()}
    >
      {label}
    </LinkButton>
  );
}
