"use client";

import { useEffect } from "react";

/** Fires the Obie notification check once when the user loads the app. */
export function ObieNotificationSyncer({ userId }: { userId: string }) {
  useEffect(() => {
    if (!userId) return;
    fetch("/api/notifications/obie", { method: "POST" }).catch(() => {});
  }, [userId]);
  return null;
}
