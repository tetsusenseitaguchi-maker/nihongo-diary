"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ElementType, ReactNode } from "react";

/**
 * Scroll-triggered reveal for the landing page: fade in, twelve pixels up, once.
 *
 * These REPLACE the element they animate rather than wrapping it — <Reveal
 * as="h2"> renders the h2 itself, <RevealGroup className="… grid …"> renders
 * the grid div itself. That is not tidiness, it is the only shape that works
 * here: Card takes className, accent, id and children and forwards neither ref
 * nor arbitrary props, so a hook cannot be spread onto it, and a wrapper div
 * around a Card would become the grid item and stop the Card stretching to the
 * row height. Cards in a row would stop matching. Replacing adds no node, so
 * the layout is bit-for-bit what it was.
 *
 * The three states exist for the same reason the hero is not animated at all.
 * Sending data-reveal="out" — opacity: 0 — down in the server HTML means the
 * page is blank to anyone whose JS does not arrive, which on a landing page is
 * indistinguishable from it being broken. So:
 *
 *   idle  server render, and up to hydration. No attribute, nothing styled,
 *         everything visible. This is what a reader with no JS keeps.
 *   out   set at hydration, only for elements below the fold. Never seen,
 *         because by definition it is off screen when it is applied.
 *   in    the observer fired. Fades up, then the observer is disconnected.
 *
 * Anything already on screen at hydration goes straight to "in" and never
 * passes through "out", so nothing that has been painted is un-painted. That
 * covers a reload partway down the page as well as the first screen.
 *
 * There is no path back to "out". Scrolling up and down again replays nothing.
 */

type RevealState = "idle" | "out" | "in";

/** useLayoutEffect warns during SSR; on the client it is what keeps the "out"
 *  state from landing after a paint and flashing on a slow hydration. */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * "Anything above the screen is always intersecting; anything below it has to
 * come 10% inside before it counts." That sentence is the whole intent, and
 * the two halves of this string are the two halves of it.
 *
 * BOTTOM (-10%): the trigger line. An element's top has to be properly inside
 * the screen, not grazing the edge, before it moves.
 *
 * TOP (100000px): not a tuned number and not a guess at any real distance —
 * it is "infinity, expressed in the only unit rootMargin accepts". Percentages
 * here resolve against the viewport, so no percentage can express it: 200% is
 * 1600px on this screen, and the page is 8595px. Read it as a flag, not a
 * measurement. Any value past the tallest page the site can produce behaves
 * identically; if a page ever got longer than 100000px this would need to grow,
 * which is the one thing that could make it wrong.
 *
 * Why it is needed at all: an observer only calls back when the intersection
 * state CHANGES. A jump — End, an anchor, a restored scroll position, a hard
 * flick — can carry an element from below the screen to above it inside a
 * single frame. It is not intersecting at either end, so nothing changes,
 * nothing fires, and the element sits at opacity 0 for the rest of the visit.
 * Measured before this margin existed: a jump straight to the foot of the page
 * left 12 of 13 permanently invisible, and a fast flick left 3.
 *
 * Extending the root upward puts every element that has been scrolled past
 * inside it, so the jump is a real false → true change and the callback fires.
 * It cannot reveal anything early: the root's BOTTOM edge is untouched, and
 * that is the edge an element approaches on the way in.
 */
const ROOT_MARGIN = "100000px 0px -10% 0px";

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [state, setState] = useState<RevealState>("idle");

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Safari 12.1 and up, so this is a formality — but the failure mode of
    // guessing wrong is invisible content, which is worth one line to avoid.
    if (!("IntersectionObserver" in window)) {
      setState("in");
      return;
    }

    if (el.getBoundingClientRect().top < window.innerHeight) {
      setState("in");
      return;
    }

    setState("out");
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        setState("in");
        io.disconnect();
      },
      { rootMargin: ROOT_MARGIN, threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, attr: state === "idle" ? undefined : state };
}

/** One element, revealed on its own. `as` is the tag it renders as. */
export function Reveal({
  as = "div",
  className,
  children,
}: {
  as?: "div" | "h2" | "p" | "ul";
  className?: string;
  children: ReactNode;
}) {
  const { ref, attr } = useReveal<HTMLElement>();
  const Tag = as as ElementType;
  return (
    <Tag ref={ref} className={className} data-reveal={attr}>
      {children}
    </Tag>
  );
}

/**
 * A row of cards, revealed one after another. One observer for the group, and
 * the 80ms stagger is CSS on nth-child — the same division of labour the
 * activity grid's wave used, with no JS loop and no per-frame work.
 *
 * Only direct children stagger, so nothing inside a card is affected.
 */
export function RevealGroup({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { ref, attr } = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={className} data-reveal-group={attr}>
      {children}
    </div>
  );
}
