"use client";

import { useEffect } from "react";

// Pointer-following glass aura. Ported verbatim from the static site's footer
// bootstrap: tracks the cursor and eases CSS vars (--glass-x/y/opacity) that
// styles.css consumes. No-op on touch/coarse pointers or reduced-motion.
export function GlassAura() {
  useEffect(() => {
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canHover || reduceMotion) return;

    const root = document.documentElement;
    let frame = 0;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight * 0.22;
    let currentX = targetX;
    let currentY = targetY;

    const updateGlassPosition = () => {
      currentX += (targetX - currentX) * 0.14;
      currentY += (targetY - currentY) * 0.14;
      root.style.setProperty("--glass-x", `${currentX}px`);
      root.style.setProperty("--glass-y", `${currentY}px`);
      if (Math.abs(targetX - currentX) > 0.4 || Math.abs(targetY - currentY) > 0.4) {
        frame = window.requestAnimationFrame(updateGlassPosition);
      } else {
        frame = 0;
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      root.style.setProperty("--glass-opacity", "1");
      if (!frame) frame = window.requestAnimationFrame(updateGlassPosition);
    };

    const onPointerLeave = () => {
      root.style.setProperty("--glass-opacity", "0");
    };

    window.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerleave", onPointerLeave);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
