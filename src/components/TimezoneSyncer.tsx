"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const TZ_COOKIE = "user_tz";
const TZ_LS_KEY = "user_tz";

// Detects the browser's IANA timezone, sets it as a cookie (for server-side
// date calculations on the next request), and syncs it to the user's profile
// in Supabase (for cross-device persistence).  Renders nothing.
export function TimezoneSyncer() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;

    // Cookie: read by server components / API routes on the next navigation.
    document.cookie = `${TZ_COOKIE}=${encodeURIComponent(tz)};path=/;max-age=31536000;SameSite=Lax`;

    // DB: only write when the timezone actually changed (avoids a write on every mount).
    if (localStorage.getItem(TZ_LS_KEY) === tz) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .update({ timezone: tz })
        .eq("id", user.id)
        .then(() => localStorage.setItem(TZ_LS_KEY, tz));
    });
  }, []);

  return null;
}
