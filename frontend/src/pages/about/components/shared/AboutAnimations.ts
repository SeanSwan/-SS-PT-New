/**
 * AboutAnimations — Shared animation variants for About page sections
 */

export const CINEMATIC_EASE = [0.16, 1, 0.3, 1] as const;

export const cinematicReveal = {
  hidden: { opacity: 0, y: 40, filter: 'blur(12px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 1.2, ease: CINEMATIC_EASE },
  },
};

export const reducedReveal = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

export const getReveal = (prefersReduced: boolean) =>
  prefersReduced ? reducedReveal : cinematicReveal;
