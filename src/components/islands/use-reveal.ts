import { useEffect, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * Eases `target` up from zero whenever it changes while `run` is set, so a live
 * price update re-runs the count. While `run` is false the value tracks the
 * target exactly — otherwise a figure that arrives before the reveal starts
 * would be stuck at its initial zero.
 *
 * Returns the target immediately when the reader has asked for reduced motion.
 */
export function useCountUp(target: number, run: boolean, ms = 900): number {
  const [value, setValue] = useState(target);
  useEffect(() => {
    if (!run || prefersReducedMotion()) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setValue(target * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);
  return value;
}
