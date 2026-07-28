/**
 * "Has this browser already been shown the word-order diagram?"
 *
 * The diagram (TrainDiagram) auto-expands the first time someone opens the
 * Write page, then stays collapsed once they close it. This flag records that
 * "they closed it at least once", so it has to outlive the tab → localStorage,
 * same as @/lib/tour/seen.
 *
 * Per browser rather than per account: the alternative is a column on
 * profiles, and re-expanding once on a second device is a much cheaper failure
 * than touching that table.
 *
 * Every access is wrapped — Safari private mode throws on storage access
 * rather than returning null, and a storage failure must never take the Write
 * page down. Failing either way degrades to "not seen yet", i.e. the diagram
 * expands once more. Harmless.
 */

export const WORD_ORDER_SEEN_KEY = "nihongo-diary-word-order-seen";

export function hasSeenWordOrder(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(WORD_ORDER_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markWordOrderSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WORD_ORDER_SEEN_KEY, "1");
  } catch {
    // Storage unavailable — the diagram may auto-expand again on a later visit.
  }
}
