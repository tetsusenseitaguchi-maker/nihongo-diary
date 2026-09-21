/**
 * What happens when a native push notification is tapped.
 *
 * Two pure pieces, kept out of PushRegistrar so they can be read (and
 * checked) without the Capacitor plugin around them:
 *
 *   pushTapHref()  — turns whatever the payload carried into a path this app
 *                    will navigate to. Same rule as safeUrl() in public/sw.js,
 *                    for the same reason: the payload is our own, and it is
 *                    still treated as input. Anything that is not a string,
 *                    or does not resolve to this origin, becomes /dashboard —
 *                    the app opens, nothing worse.
 *
 *   the draft flag — /write sets it while there is text in the editor, and
 *                    the tap handler refuses to navigate while it is set. A
 *                    banner tapped mid-sentence would otherwise router.push()
 *                    the learner off the page and the sentence with it; /write
 *                    keeps no draft anywhere. The notification is not lost:
 *                    the event it came from is still in the bell for the
 *                    social types, and the reminders point at /write, which
 *                    is where the learner already is.
 */

export const PUSH_TAP_FALLBACK = "/dashboard";

export function pushTapHref(raw: unknown, origin: string): string {
  if (typeof raw !== "string" || raw === "") return PUSH_TAP_FALLBACK;
  try {
    const url = new URL(raw, origin);
    return url.origin === origin ? url.pathname + url.search : PUSH_TAP_FALLBACK;
  } catch {
    return PUSH_TAP_FALLBACK;
  }
}

let draftInProgress = false;

/** Called by /write: true while the editor holds text, false otherwise and
 *  on unmount. Module state rather than context because the reader
 *  (PushRegistrar) sits in the layout, above every page. */
export function setDraftInProgress(value: boolean): void {
  draftInProgress = value;
}

export function isDraftInProgress(): boolean {
  return draftInProgress;
}
