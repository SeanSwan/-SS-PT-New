/**
 * cinematic-animations.ts — Shared Framer Motion animation variants.
 *
 * All animations respect `prefers-reduced-motion` via Framer Motion's built-in
 * `reducedMotion="user"` on AnimatePresence/motion components. The `weighted`
 * variants scale duration and distance by motion intensity level.
 */

import type { Variants, Transition } from 'framer-motion';
import type { MotionIntensity } from './cinematic-tokens';

// ─── Motion Intensity Multipliers ────────────────────────────────────

const INTENSITY_SCALE: Record<MotionIntensity, number> = {
  high: 1,
  'medium-high': 0.7,
  low: 0.35,
};

const INTENSITY_DURATION: Record<MotionIntensity, number> = {
  high: 0.8,
  'medium-high': 0.6,
  low: 0.4,
};

// ─── Helper: Weighted Transition ─────────────────────────────────────

export const weightedTransition = (intensity: MotionIntensity, base?: Partial<Transition>): Transition => ({
  duration: INTENSITY_DURATION[intensity],
  ease: [0.25, 0.46, 0.45, 0.94], // cubic-bezier (smooth deceleration)
  ...base,
});

// ─── Fade Up (sections, cards) ───────────────────────────────────────

export const fadeUpVariants = (intensity: MotionIntensity): Variants => ({
  hidden: {
    opacity: 0,
    y: 40 * INTENSITY_SCALE[intensity],
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: weightedTransition(intensity),
  },
});

// ─── Stagger Container ──────────────────────────────────────────────

export const staggerContainer = (intensity: MotionIntensity): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08 * INTENSITY_SCALE[intensity],
      delayChildren: 0.1,
    },
  },
});

// ─── Stagger Item (children of stagger container) ───────────────────

export const staggerItem = (intensity: MotionIntensity): Variants => ({
  hidden: {
    opacity: 0,
    y: 30 * INTENSITY_SCALE[intensity],
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: weightedTransition(intensity),
  },
});

// ─── Scale In (badges, icons) ───────────────────────────────────────

export const scaleInVariants = (intensity: MotionIntensity): Variants => ({
  hidden: {
    opacity: 0,
    scale: 0.8 + (0.2 * (1 - INTENSITY_SCALE[intensity])),
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: weightedTransition(intensity, {
      type: 'spring',
      stiffness: 200,
      damping: 20,
    }),
  },
});

// ─── Slide In From Left ─────────────────────────────────────────────

export const slideInLeftVariants = (intensity: MotionIntensity): Variants => ({
  hidden: {
    opacity: 0,
    x: -60 * INTENSITY_SCALE[intensity],
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: weightedTransition(intensity),
  },
});

// ─── Slide In From Right ────────────────────────────────────────────

export const slideInRightVariants = (intensity: MotionIntensity): Variants => ({
  hidden: {
    opacity: 0,
    x: 60 * INTENSITY_SCALE[intensity],
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: weightedTransition(intensity),
  },
});

// ─── Navbar Morph (transparent → solid on scroll) ───────────────────

export const navbarMorphVariants: Variants = {
  transparent: {
    backgroundColor: 'rgba(0, 0, 0, 0)',
    backdropFilter: 'blur(0px)',
    boxShadow: '0 0 0 rgba(0, 0, 0, 0)',
  },
  solid: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
  },
};

// ─── Magnetic Hover (buttons) ───────────────────────────────────────

export const magneticHover = {
  scale: 1.03,
  transition: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 25,
  },
};

export const magneticTap = {
  scale: 0.97,
};

// ─── Hero Text Animation (weighted stagger) ─────────────────────────

export const heroTextContainer = (intensity: MotionIntensity): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15 * INTENSITY_SCALE[intensity],
      delayChildren: 0.3,
    },
  },
});

export const heroTextItem = (intensity: MotionIntensity): Variants => ({
  hidden: {
    opacity: 0,
    y: 60 * INTENSITY_SCALE[intensity],
    filter: intensity === 'low' ? 'none' : 'blur(10px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: INTENSITY_DURATION[intensity] * 1.2,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
});

// ─── Viewport Settings ──────────────────────────────────────────────

export const defaultViewport = {
  once: true,
  amount: 0.3,
} as const;

export const heroViewport = {
  once: true,
  amount: 0.1,
} as const;
