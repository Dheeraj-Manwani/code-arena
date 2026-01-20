import type { Variants } from "motion/react";

const DURATION = 0.35;
const STAGGER_DELAY = 0.06;

export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: {
      duration: DURATION * 0.6,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

export const fadeIn: Variants = {
  initial: {
    opacity: 0,
    y: 6,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

export const cardHoverScale = 1.01;
export const cardHoverY = -2;

export { STAGGER_DELAY };
