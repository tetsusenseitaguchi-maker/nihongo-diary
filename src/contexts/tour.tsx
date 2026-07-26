"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  type TourState,
  TOUR_VERSION,
  TOUR_STEP_COUNT,
  readTourState,
  writeTourState,
  clearTourState,
} from "@/lib/tour/state";

interface TourContextValue {
  /** False until the saved state has been read on mount (one frame). */
  hydrated: boolean;
  isActive: boolean;
  /** Zero-based step index; 0 while inactive. */
  step: number;
  /** Begin a tour. Always starts at step 0 — there is no resume-from-middle. */
  start: () => void;
  /** Advance; calling this on the last step ends the tour. */
  next: () => void;
  prev: () => void;
  /** Skip, finish, or abandon. Clears the saved state so the next run is fresh. */
  stop: () => void;
}

// null rather than a no-op default: reaching for the tour from outside the
// provider is a wiring mistake, and a tour that silently does nothing is much
// harder to notice than one that fails loudly. Everything rendered under the
// (app) layout is inside the provider.
const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  // Starts null on both server and client so the first client render matches
  // the server output. The saved state is read in the effect below instead.
  const [state, setState] = useState<TourState | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(readTourState());
    setHydrated(true);
  }, []);

  // Mirror to sessionStorage so a full document load mid-tour (hard refresh,
  // plain <a href>, middleware redirect) can pick the tour back up.
  const commit = useCallback((next: TourState | null) => {
    setState(next);
    if (next) writeTourState(next);
    else clearTourState();
  }, []);

  const start = useCallback(() => {
    commit({ v: TOUR_VERSION, step: 0, startedAt: Date.now() });
  }, [commit]);

  const stop = useCallback(() => {
    commit(null);
  }, [commit]);

  const next = useCallback(() => {
    setState((cur) => {
      if (!cur) return cur;
      const step = cur.step + 1;
      if (step >= TOUR_STEP_COUNT) {
        clearTourState();
        return null;
      }
      const updated = { ...cur, step };
      writeTourState(updated);
      return updated;
    });
  }, []);

  const prev = useCallback(() => {
    setState((cur) => {
      if (!cur || cur.step === 0) return cur;
      const updated = { ...cur, step: cur.step - 1 };
      writeTourState(updated);
      return updated;
    });
  }, []);

  return (
    <TourContext.Provider
      value={{
        hydrated,
        isActive: state !== null,
        step: state?.step ?? 0,
        start,
        next,
        prev,
        stop,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("useTour() must be used inside a <TourProvider>.");
  }
  return ctx;
}
