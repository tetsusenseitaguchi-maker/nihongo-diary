"use client";
import { useEffect } from "react";

/**
 * Saves an invite code to localStorage so InvitePendingHandler
 * can apply it after the user signs up or logs in.
 * Rendered only on the /invite/[code] page for non-logged-in visitors.
 */
export function InviteCapture({ code }: { code: string }) {
  useEffect(() => {
    if (code) localStorage.setItem("pendingInviteCode", code);
  }, [code]);
  return null;
}
