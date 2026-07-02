"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Skips the marketing landing page when the app is opened inside the
// Capacitor iOS shell (Guideline 4.2 — native apps shouldn't just show
// a website). Web visitors are unaffected: this renders nothing and
// does nothing unless window.Capacitor reports a native platform.
export function NativeHomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    type CapWindow = Window & { Capacitor?: { isNativePlatform?: () => boolean } };
    const isNative = (window as CapWindow).Capacitor?.isNativePlatform?.();
    if (!isNative) return;

    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      router.replace(user ? "/dashboard" : "/login");
    })();
  }, [router]);

  return null;
}
