"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { markPlansIntroSeen } from "@/lib/plans-intro/seen";

/**
 * "Start writing for free" — the way out of the plan intro.
 *
 * A client component because /welcome-plans is a Server Component and the flag
 * that stops the screen coming back lives in localStorage. Taking this route
 * is the signal that the user has read the screen and declined, so it is the
 * moment the flag is written.
 *
 * push without refresh: /welcome-plans and /dashboard share the (app) layout,
 * so there is nothing to re-fetch, and the pair together is a documented
 * hazard in this codebase.
 */
export function PlansIntroSkipButton({ label }: { label: string }) {
  const router = useRouter();

  return (
    <Button
      variant="secondary"
      size="lg"
      className="w-full"
      onClick={() => {
        markPlansIntroSeen();
        router.push("/dashboard");
      }}
    >
      {label}
    </Button>
  );
}
