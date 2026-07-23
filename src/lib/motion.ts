import type { Transition } from "framer-motion";

/** Shared organic spring for the liquid feel — snappy but never mechanical. */
export const spring: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 32,
  mass: 0.9,
};

/** Softer spring for large surfaces (modals, hero cards). */
export const softSpring: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 28,
  mass: 1,
};
