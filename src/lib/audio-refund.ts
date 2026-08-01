import type { createClient } from "@/lib/supabase/server";

/**
 * Best-effort return of one audio credit after a claimed slot
 * (try_use_audio returned true) could not be fulfilled — Google TTS error,
 * empty audioContent, or a non-2xx response. Calls the refund_audio() RPC
 * (supabase/add-audio-limit.sql), which only decrements
 * audio_usage.audio_count and never touches usage_limits, correction_count
 * or translation_count.
 *
 * Never throws — a failed refund must not replace the error response the
 * user is already getting. Mirrors refundCorrection in correction-refund.ts.
 */
export async function refundAudio(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<void> {
  const { error } = await supabase.rpc("refund_audio", { p_user_id: userId });
  if (error) {
    console.error("[refund_audio] failed:", error.message);
  }
}
