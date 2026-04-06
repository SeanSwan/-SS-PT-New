/**
 * HomeAnimations — Shared animation variants for homepage sections
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

export const slideInLeft = {
  hidden: { opacity: 0, x: -60, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { duration: 1, ease: CINEMATIC_EASE },
  },
};

export const slideInRight = {
  hidden: { opacity: 0, x: 60, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { duration: 1, ease: CINEMATIC_EASE },
  },
};

/** Pick the right reveal variant based on reduced motion preference */
export const getReveal = (prefersReduced: boolean) =>
  prefersReduced ? reducedReveal : cinematicReveal;

export const getLeftSlide = (prefersReduced: boolean) =>
  prefersReduced ? reducedReveal : slideInLeft;

export const getRightSlide = (prefersReduced: boolean) =>
  prefersReduced ? reducedReveal : slideInRight;
