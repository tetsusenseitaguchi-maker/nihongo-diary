import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Verifies an emailed token_hash and hands back a session.
 *
 * ⚠️ NOTHING LINKS HERE YET. This is Stage 0 of the password-reset repair: the
 * route ships first, unreachable, so it can be deployed and tested without any
 * learner's flow depending on it. The email templates still point at
 * /auth/callback and are switched only once this has been exercised on a real
 * device. /auth/callback stays exactly as it is — it serves every link already
 * sitting in an inbox, and it is the rollback.
 *
 * ── What this fixes ─────────────────────────────────────────────────────────
 * /auth/callback exchanges a PKCE `code`, and exchangeCodeForSession needs the
 * code_verifier that the requesting browser stored in a cookie on this domain.
 * Open the email somewhere else and that verifier does not exist, so the
 * exchange cannot succeed however fresh the link is. On iOS that is the normal
 * case, not the edge: the request happens inside the Capacitor WKWebView and
 * the mail app opens the link in Safari, which has its own cookie store. Two
 * App Store reviews and the maintainer all reproduce it.
 *
 * verifyOtp takes a different road. It POSTs { token_hash, type } to
 * /auth/v1/verify and reads the session out of the response body — no
 * code_verifier, nothing browser-bound, so any browser on any device works.
 * Confirmed by reading GoTrueClient.verifyOtp in @supabase/auth-js 2.108.2:
 * it touches no PKCE storage at all. This is also the shape Supabase's own
 * server-side-auth docs recommend.
 *
 * The session still lands in cookies, written by the server client below, so
 * middleware, server components and every API route keep reading it exactly as
 * they do today. Only a single-use hash ever appears in a URL — unlike the
 * implicit flow, which would put real tokens in the fragment and therefore in
 * browser history.
 */

/**
 * Types this route will verify, and where each one goes when it succeeds.
 *
 * A closed set on purpose: `type` arrives from a URL and is handed to Supabase,
 * so anything unrecognised is refused rather than forwarded. Magic-link and
 * phone OTP types are absent because this app has no such flow, and an auth
 * route should not offer doors the product does not have.
 *
 * `email` sits alongside `signup` because Supabase's own Confirm-signup
 * template emits `type=email` while its API calls the same thing `signup`.
 * Both spellings mean "this address is real"; accepting both is what keeps
 * Stage 3 from turning on a template this route would reject.
 */
const ALLOWED: Record<string, { type: EmailOtpType; fallback: string }> = {
  recovery: { type: "recovery", fallback: "/update-password" },
  signup: { type: "signup", fallback: "/profile-setup" },
  email: { type: "email", fallback: "/profile-setup" },
  email_change: { type: "email_change", fallback: "/profile" },
};

/**
 * Where a failure lands, matching what /auth/callback already does so the two
 * routes cannot drift into telling learners different stories. Both messages
 * exist in all eight loaded locales.
 */
function failureFor(origin: string, isRecovery: boolean): NextResponse {
  return NextResponse.redirect(
    isRecovery
      ? `${origin}/update-password?authError=recovery_link`
      : `${origin}/login?authError=confirm_link`,
  );
}

/**
 * The path to continue to, or `fallback` if the URL asked for anything else.
 *
 * `next` is attacker-controllable — it is a query parameter on a link that
 * arrives by email — so this is an open-redirect guard, not tidying up.
 * /auth/callback interpolates its own `next` unchecked; that route is frozen
 * for compatibility, which is all the more reason this one starts clean.
 *
 * Four checks, deliberately overlapping:
 *   - must begin with "/"          — no absolute URLs, no scheme
 *   - must not begin with "//"     — protocol-relative, i.e. another host
 *     (or "/\", which several browsers normalise to the same thing)
 *   - no control characters        — CR/LF are what a header-injection attempt
 *     is built from. URL parsing already strips them, so this is not the thing
 *     standing between us and an injected Location; it is here so that such an
 *     input falls back to a known page instead of redirecting to whatever
 *     same-origin garbage the stripping happens to leave behind.
 *   - must resolve to this origin  — the real guarantee. Everything the others
 *     miss, URL parsing catches, because it answers the question actually
 *     being asked: does this end up on our site?
 */
/** C0 controls and DEL, written as escapes so the source holds none of them. */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

function safeNext(raw: string | null, origin: string, fallback: string): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (CONTROL_CHARS.test(raw)) return fallback;

  let resolved: URL;
  try {
    resolved = new URL(raw, origin);
  } catch {
    return fallback;
  }
  if (resolved.origin !== origin) return fallback;

  // Rebuilt from the parsed URL rather than passed through, so control
  // characters and anything else odd cannot survive into a Location header.
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const tokenHash = searchParams.get("token_hash");
  const rawType = searchParams.get("type") ?? "";

  const allowed = ALLOWED[rawType];
  // Read before the guards below so a rejected request still lands somewhere
  // that makes sense to the person holding the link.
  const isRecovery = rawType === "recovery";

  if (!tokenHash || !allowed) {
    console.warn(
      `[auth/confirm] refusing request (hasToken=${!!tokenHash}, type=${JSON.stringify(rawType)})`,
    );
    return failureFor(origin, isRecovery);
  }

  const next = safeNext(searchParams.get("next"), origin, allowed.fallback);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: allowed.type,
  });

  if (error) {
    // Status and code only. token_hash is a single-use credential and does not
    // belong in a log line, the same rule /auth/callback follows for `code`.
    console.error(
      `[auth/confirm] verifyOtp failed (type=${rawType}):`,
      error.message,
      "status:",
      error.status,
      "code:",
      error.code,
    );
    return failureFor(origin, isRecovery);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
