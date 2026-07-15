import type { createClient } from "@/lib/supabase/server";

/**
 * Best-effort refund of one daily correction slot after a claimed slot
 * (try_use_correction returned true) could not be fulfilled — AI API
 * error, max_tokens truncation, or JSON parse failure. Calls the
 * refund_correction() RPC (supabase/add-correction-refund-fn.sql), which
 * only decrements usage_limits.correction_count and never touches
 * try_use_correction() itself. Never throws — a failed refund should not
 * break the error response already being sent to the user.
 */
export async function refundCorrection(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  date: string,
): Promise<void> {
  const { error } = await supabase.rpc("refund_correction", {
    p_user_id: userId,
    p_date: date,
  });
  if (error) {
    console.error("[refund_correction] failed:", error.message);
  }
}
