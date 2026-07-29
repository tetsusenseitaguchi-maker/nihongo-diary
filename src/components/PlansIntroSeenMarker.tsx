"use client";

import { useEffect } from "react";
import { markPlansIntroSeen } from "@/lib/plans-intro/seen";

/**
 * Records that the plan intro has been shown, on mount. Renders nothing.
 *
 * Marking on the way out of the screen was not enough. Leaving by buying a
 * plan skips the "Start writing for free" control entirely, so the flag stayed
 * unwritten and a user who subscribed and then edited their profile inside the
 * new-account window met the pitch a second time — as a subscriber.
 *
 * Same rule the tour uses: TourGuide calls markTourSeen() when the tour
 * starts, not when it finishes, precisely so that abandoning it does not bring
 * it back on every visit. Shown once is the promise, not dismissed once.
 *
 * The write is idempotent and wrapped, so a second call from the skip control
 * or a storage failure in private mode costs nothing.
 */
export function PlansIntroSeenMarker() {
  useEffect(() => {
    markPlansIntroSeen();
  }, []);

  return null;
}
