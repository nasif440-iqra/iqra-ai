/** Centralized motion timing and easing tokens for consistent, calm animations. */

// Spring presets for framer-motion
export const SPRING = {
  gentle: { type: "spring", stiffness: 200, damping: 24 },
  snappy: { type: "spring", stiffness: 320, damping: 28 },
  button: { type: "spring", stiffness: 400, damping: 25 },
  card:   { type: "spring", stiffness: 280, damping: 26 },
};

// CSS easing curves
export const EASE = {
  default: "cubic-bezier(0.4, 0, 0.2, 1)",
  enter:   "cubic-bezier(0, 0, 0.2, 1)",
  exit:    "cubic-bezier(0.4, 0, 1, 1)",
  bounce:  "cubic-bezier(0.34, 1.56, 0.64, 1)",
};

// Duration tokens (ms)
export const DURATION = {
  fast:   150,
  normal: 250,
  slow:   400,
  reveal: 500,
};

// Shared framer-motion variants
export const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
};

// Reduced motion helper
export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
