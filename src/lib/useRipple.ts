"use client";

import { useCallback, useRef } from "react";

/**
 * Lightweight Material-style tap ripple. On pointerdown, spawns a
 * short-lived <span> at the pointer position that animates only
 * transform/opacity (GPU-compositable, no layout/paint cost) and removes
 * itself when the animation ends — no state, no re-render.
 * Pair with the `ripple-container` CSS class (position:relative;
 * overflow:hidden) on the element holding the ref.
 */
export function useRipple<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent<T>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.6;
    const span = document.createElement("span");
    span.className = "ripple-effect";
    span.style.width = `${size}px`;
    span.style.height = `${size}px`;
    span.style.left = `${e.clientX - rect.left - size / 2}px`;
    span.style.top = `${e.clientY - rect.top - size / 2}px`;
    el.appendChild(span);
    span.addEventListener("animationend", () => span.remove(), { once: true });
  }, []);

  return { ref, onPointerDown };
}
