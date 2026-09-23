/**
 * HomeAnimations — Shared animation variants for homepage sections
 *
 * A4: every numeric value below is now *derived* from
 * `core/perf/motionTokens`, which is the single authority. Previously this file
 * carried its own `staggerChildren: 0.12`, which disagreed with both
 * `motion-helpers.tsx` (0.1) and the contract (0.06).
 *
 * Do not reintroduce literal durations, easings, or stagger intervals here.
 */

import {
  MOTION_DURATION_MS,
  MOTION_EASING,
  MOTION_SECTION_REVEAL,
  SECTION_REVEAL_SECONDS,
  STAGGER_CHILDREN_SECONDS,
  msToSeconds,
} from '../../../../core/perf/motionTokens';

/** The canonical cinematic easing tuple. */
export const CINEMATIC_EASE = MOTION_EASING.outQuint;

/** Narrative response duration in Framer seconds. */
const NARRATIVE_SECONDS = msToSeconds(MOTION_DURATION_MS.narrative);

export const cinematicReveal = {
  hidden: { opacity: 0, y: 40, filter: 'blur(12px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: NARRATIVE_SECONDS, ease: CINEMATIC_EASE },
  },
};

export const reducedReveal = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: SECTION_REVEAL_SECONDS } },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: STAGGER_CHILDREN_SECONDS, delayChildren: 0 },
  },
};

export const slideInLeft = {
  hidden: { opacity: 0, x: -60, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { duration: NARRATIVE_SECONDS, ease: CINEMATIC_EASE },
  },
};

export const slideInRight = {
  hidden: { opacity: 0, x: 60, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { duration: NARRATIVE_SECONDS, ease: CINEMATIC_EASE },
  },
};

/** Pick the right reveal variant based on reduced motion preference */
export const getReveal = (prefersReduced: boolean) =>
  prefersReduced ? reducedReveal : cinematicReveal;

export const getLeftSlide = (prefersReduced: boolean) =>
  prefersReduced ? reducedReveal : slideInLeft;

export const getRightSlide = (prefersReduced: boolean) =>
  prefersReduced ? reducedReveal : slideInRight;

/**
 * Section-reveal variant honouring the home budget (200ms, ≤12px translation).
 *
 * The contract specifies that section reveals are 200ms with a maximum 12px
 * translation, which is deliberately smaller than the narrative reveal above.
 * Consumers that reveal whole sections should use this.
 */
export const sectionReveal = {
  hidden: { opacity: 0, y: MOTION_SECTION_REVEAL.maxTranslationPx },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: SECTION_REVEAL_SECONDS, ease: CINEMATIC_EASE },
  },
};

/**
 * A10 — per-character / per-word text splitting is DISABLED on Home.
 *
 * MEASURED 2026-09-22, not assumed. `tests/cinematic/motion-budget.spec.ts` sampled the settled
 * home viewport and found **41 concurrently animating targets** against a cap of 3, almost all of
 * them `span(filter+opacity+transform)` — the per-character spans `TextSplitter` emits. The hero
 * headline alone is 31 characters, each animating three properties, which also breaks the
 * two-properties-per-target cap.
 *
 * The contract is explicit on both counts:
 *   03-contracts.md:274  "At most these three home-controlled targets may animate together"
 *   03-contracts.md:282  "no simultaneous nested character, particle, counter, or card animations"
 *   03-contracts.md:243  "Maximum stagger group | 5 children"  (the CTA title is 7 words)
 *   06-bans.md:33        "No more than two animated properties per target or three animated
 *                         targets in a viewport."
 *
 * The call sites are LEFT IN PLACE and gated on this flag rather than deleted, for two reasons:
 * the restriction is home-specific (About and other surfaces are out of A10's scope and are
 * untouched), and a future decision to re-enable it should be one line, not an archaeology
 * exercise. The wrapper-level reveal each section already has is the "one wrapper" the contract
 * does permit, so headlines still animate IN — they simply do not animate per glyph.
 *
 * Flipping this to `true` reinstates the violation; `motion-budget.spec.ts` will fail, which is
 * the intended guard rather than a nuisance.
 */
export const HOME_TEXT_SPLIT_ENABLED = false;
