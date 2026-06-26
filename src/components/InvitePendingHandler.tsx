"use client";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Runs silently in the (app) layout.
 * After login/signup, checks localStorage for a pending invite code
 * and calls the apply API once. Clears the code regardless of result
 * (success, already-connected, self-invite) so it never retries infinitely.
 */
export function InvitePendingHandler() {
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    const code = localStorage.getItem("pendingInviteCode");
    if (!code) return;
    didRun.current = true;

    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        didRun.current = false; // not logged in yet — try again on next render
        return;
      }

      try {
        const res = await fetch("/api/invite/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        // Clear on all definitive outcomes; keep on 5xx so a retry is possible
        if (res.status !== 500) localStorage.removeItem("pendingInviteCode");
      } catch {
        didRun.current = false; // network error — allow one retry
      }
    })();
  }, []);

  return null;
}
