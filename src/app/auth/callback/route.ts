import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles the PKCE code exchange after Supabase email confirmation and after a
 * password-reset link.
 *
 * The link in the email redirects here with ?code=… (and, for a reset,
 * ?next=/update-password). We exchange the code for a session, then send the
 * user onwards.
 *
 * ── Why the failure path is not just "/login" any more ──────────────────────
 * It used to be. Every failure — no code in the URL, an expired code, a code
 * that could not be exchanged — redirected to /login?error=email_confirmation_failed,
 * and /login never read that parameter. So the learner tapped "reset my
 * password" in their inbox and arrived at a bare login screen with no
 * explanation and nothing to do. Two App Store reviews described exactly that,
 * one of them ending in an uninstall, and it reproduces on the web as well.
 *
 * Two things changed here, both about telling the truth:
 *
 *   1. A reset that fails goes to /update-password, which is the page the
 *      learner was trying to reach. It already knows how to say "this link is
 *      invalid or has expired" and already offers a way to request another —
 *      it was simply never being reached. Only a failed CONFIRMATION still
 *      lands on /login, which is where that flow was going anyway.
 *
 *   2. The reason travels as ?authError=, and both pages render it.
 *
 * ⚠️ The exchange itself is untouched. This route still calls
 * exchangeCodeForSession exactly once, with exactly the same code, and a
 * SUCCESSFUL exchange still redirects to `next` as before. Everything added
 * here is on the failure path.
 *
 * ── Why exchanges fail even when the link is fresh ──────────────────────────
 * @supabase/ssr uses the PKCE flow, so exchangeCodeForSession needs the
 * code_verifier that was stored — in a cookie, on this domain — by the browser
 * that ASKED for the link. Open the email on a different browser and the
 * verifier is not there, and the exchange cannot succeed no matter how valid
 * the code is. On iOS that is the normal case rather than the exception: the
 * request is made inside the Capacitor WKWebView and the mail app opens the
 * link in Safari, which has a separate cookie store.
 *
 * That is a real defect and this route does not fix it — it makes it visible
 * and recoverable instead of silent. The fix belongs in the flow itself and is
 * being designed separately.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/profile-setup";

  // A reset is worth telling apart from a confirmation: the two failures need
  // different words and different places to land. Anything else is treated as
  // a confirmation, which is what every other caller of this route is.
  const isRecovery = next.startsWith("/update-password");

  /**
   * Where a failure goes, and with what.
   *
   * `reason` is deliberately coarse — the learner is shown one of two
   * sentences, and the URL says nothing about the internals. The detail goes
   * to the server log below instead, where it is useful and not on display.
   */
  const failure = (reason: "recovery_link" | "confirm_link") =>
    NextResponse.redirect(
      isRecovery
        ? `${origin}/update-password?authError=${reason}`
        : `${origin}/login?authError=${reason}`,
    );

  if (!code) {
    // Supabase redirects here without a code when the link was already used,
    // when it expired before being opened, or when the implicit flow put the
    // token in the URL fragment — which the server never receives.
    console.warn(
      `[auth/callback] no code in callback (recovery=${isRecovery}, next=${next})`,
    );
    return failure(isRecovery ? "recovery_link" : "confirm_link");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Logged with status and code, never with the `code` query parameter —
    // that is a single-use credential and does not belong in a log line.
    console.error(
      `[auth/callback] exchange failed (recovery=${isRecovery}):`,
      error.message,
      "status:",
      error.status,
      "code:",
      error.code,
    );
    return failure(isRecovery ? "recovery_link" : "confirm_link");
  }

  return NextResponse.redirect(`${origin}${next}`);
}
