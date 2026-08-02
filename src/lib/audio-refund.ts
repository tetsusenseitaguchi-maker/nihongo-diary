import type { createClient } from "@/lib/supabase/server";

/**
 * Best-effort return of one audio credit after a claimed slot
 * (try_use_audio_daily returned true) could not be fulfilled — Google TTS
 * error, empty audioContent, or a non-2xx response. Calls the
 * refund_audio_daily() RPC (supabase/add-audio-daily.sql), which only
 * decrements audio_usage_daily.audio_count and never touches usage_limits,
 * correction_count or translation_count.
 *
 * ⚠️ `date` is not optional and must be the SAME string that was passed to
 * try_use_audio_daily. The counter is one row per day now, so a refund has to
 * name the row it is putting the credit back into. Recomputing "today" here
 * would be a second reading of the clock: a request that claims a slot at
 * 23:59:59 and fails at 00:00:01 would credit tomorrow and leave today's row
 * short. Compute the date once in the route and hand the same value to both.
 *
 * Never throws — a failed refund must not replace the error response the user
 * is already getting. Mirrors refundCorrection in correction-refund.ts.
 */
export async function refundAudio(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  date: string,
): Promise<void> {
  const { error } = await supabase.rpc("refund_audio_daily", {
    p_user_id: userId,
    p_date: date,
  });
  if (error) {
    console.error("[refund_audio_daily] failed:", error.message);
  }
}
