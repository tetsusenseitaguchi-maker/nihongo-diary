/**
 * Turn a Supabase auth error into something worth showing a learner.
 *
 * Pure function, no React, no network — it maps an error to an i18n KEY and
 * the caller translates. Returning a key rather than a string is what keeps
 * this callable from every one of the four auth forms without any of them
 * needing to agree on wording.
 *
 * ── Why this exists: the "{}" bug ───────────────────────────────────────────
 * All four forms did `setError(error.message)` and rendered it raw. An App
 * Store review from Germany reported the signup screen showing the error
 *
 *     {}
 *
 * which is not a typo and not a template that failed to fill in. It is
 * @supabase/auth-js printing a Response object. In lib/fetch.js:
 *
 *     const NETWORK_ERROR_CODES = [500,501,502,503,504,520,…,530]
 *
 *     if (NETWORK_ERROR_CODES.includes(error.status)) {
 *       throw new AuthRetryableFetchError(_getErrorMessage(error), error.status)
 *     }                                  //  ^^^^^ the Response, not its body
 *
 *     const _getErrorMessage = (err) => {
 *       …msg / message / error_description / error…
 *       return JSON.stringify(err)       //  <-- reached
 *     }
 *
 * A Response has none of those four properties and no enumerable own
 * properties at all, so JSON.stringify gives "{}". Every 5xx from Supabase
 * Auth — including the "Error sending confirmation email" that an SMTP failure
 * or a rate limit produces on signup — reached the learner as those two
 * characters. 77 of 703 accounts (11%) have never confirmed an email, at a
 * steady 6–11 a day rather than in one spike, which is the shape a delivery
 * problem makes rather than an outage.
 *
 * ── The rule ────────────────────────────────────────────────────────────────
 * Decide on `status` and `code`, which AuthError carries as real fields, and
 * never on the message text. Matching strings would break the moment Supabase
 * rewords anything, and it is the message we do not trust in the first place.
 *
 * A raw message is passed through only as a last resort, and only when it
 * looks like a sentence — never when it is JSON, which is exactly the case
 * this file was written for.
 */

/** The shape we need from @supabase/auth-js's AuthError, structurally. */
export type AuthErrorLike = {
  message?: string;
  status?: number;
  code?: string;
  name?: string;
};

/** Every key this can return, so the i18n files can be checked against it. */
export const AUTH_ERROR_KEYS = [
  "authError.network",
  "authError.serverBusy",
  "authError.tooMany",
  "authError.invalidCredentials",
  "authError.emailNotConfirmed",
  "authError.emailExists",
  "authError.weakPassword",
  "authError.generic",
] as const;

/**
 * Error codes Supabase returns that are worth their own sentence.
 *
 * Anything not listed falls through to the status checks and then to
 * authError.generic. Adding a code here is additive — no existing branch
 * changes — which is the point of keeping it as a table.
 */
const BY_CODE: Record<string, string> = {
  invalid_credentials: "authError.invalidCredentials",
  email_not_confirmed: "authError.emailNotConfirmed",
  email_exists: "authError.emailExists",
  user_already_exists: "authError.emailExists",
  weak_password: "authError.weakPassword",
  over_email_send_rate_limit: "authError.tooMany",
  over_request_rate_limit: "authError.tooMany",
};

/**
 * Does this message read like something written for a person?
 *
 * Guards the pass-through at the bottom. "{}" and any other JSON is rejected,
 * as is an empty string — those are the shapes that made this file necessary.
 */
function looksLikeSentence(message: string | undefined): message is string {
  const m = message?.trim();
  if (!m) return false;
  if (m.startsWith("{") || m.startsWith("[")) return false;
  return true;
}

/**
 * The i18n key to show for `error`.
 *
 * Order matters: a code is more specific than a status, and both are more
 * trustworthy than the message.
 */
export function authErrorKey(error: AuthErrorLike | null | undefined): string {
  if (!error) return "authError.generic";

  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code];

  const status = error.status;

  // AuthRetryableFetchError uses status 0 for a fetch that never landed —
  // no connection, DNS, a WebView that refused the request. Distinct from a
  // server that answered badly, and the advice differs too.
  if (status === 0 || error.name === "AuthRetryableFetchError") {
    return status && status >= 500 ? "authError.serverBusy" : "authError.network";
  }

  if (status === 429) return "authError.tooMany";
  if (status !== undefined && status >= 500) return "authError.serverBusy";

  // 400s that carried no code. Supabase has been steadily adding codes, so
  // this is mostly older deployments and unusual validation failures.
  if (looksLikeSentence(error.message)) return error.message;

  return "authError.generic";
}

/**
 * Convenience wrapper: key → translated string.
 *
 * `t` is the app's translator. A key that is not in the message files comes
 * back as the key itself (contexts/locale.tsx has no English fallback), which
 * is why AUTH_ERROR_KEYS above is checked in the build-time i18n test rather
 * than trusted by eye.
 *
 * The pass-through branch of authErrorKey returns a raw Supabase sentence
 * rather than a key. t() hands back anything it does not recognise unchanged,
 * so that sentence survives — which is the intended behaviour, not an
 * accident of the lookup.
 */
export function authErrorMessage(
  error: AuthErrorLike | null | undefined,
  t: (key: string) => string,
): string {
  return t(authErrorKey(error));
}
