import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client using the service role key.
 * Bypasses RLS — use ONLY in trusted server-side contexts (webhooks, crons).
 * Never expose this client to the browser.
 *
 * Requires env var: SUPABASE_SERVICE_ROLE_KEY
 * (Supabase Dashboard → Settings → API → service_role secret)
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
