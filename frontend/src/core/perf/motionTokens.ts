// frontend/src/core/perf/motionTokens.ts
//
// The single authoritative source for motion values.
//
// Contract: BLUEPRINT-cinematic-frontend-2026-09-19/03-contracts.md
//   "Motion tokens and budget" + "Motion values" (P2 amendment).
//
// Rule: TypeScript is authoritative. CSS strings and Framer second-values are
// *projections* of these numbers, generated mechanically. There must be no
// independently maintained duplicate constants — before this module shipped, the
// same stagger interval existed as 0.12 (`HomeAnimations.ts`), 0.1
// (`motion-helpers.tsx`), and was specified as 0.06 by the contract.
//
// Packet defect §6.3 ("missing tokens") and §6.7 ("unmapped durations").

/** Numeric duration tokens, in milliseconds. */
export const MOTION_DURATION_MS = Object.freeze({
  /** Ambient/very slow background drift. */
  ambient: 12000,
  /** Fast UI response (hover, press, focus). */
  responseFast: 120,
  /** Default response. */
  response: 200,
  /** Deliberate, slightly slower response. */
  responseSlow: 320,
  /** The signature narrative beat. Explicit to the signature, NOT a helper default. */
  narrative: 720,
});

/** Named easing curves as Framer/WAAPI-compatible cubic-bezier tuples. */
export const MOTION_EASING = Object.freeze({
  /**
   * `[0.16, 1, 0.3, 1]`.
   *
   * This tuple denotes *that exact cubic-bezier curve*. Do not substitute a
   * similarly named polynomial easing — that is an explicit prohibition.
   */
  outQuint: [0.16, 1, 0.3, 1] as const,
  /** `[0.55, 0.085, 0.68, 0.53]`. */
  inQuad: [0.55, 0.085, 0.68, 0.53] as const,
});

/** Stagger rules. */
export const MOTION_STAGGER = Object.freeze({
  /** Interval between staggered children, in milliseconds. */
  intervalMs: 60,
  /** Maximum number of children in one staggered group. */
  maxGroupSize: 5,
});

/** Section-reveal rules (home budget). */
export const MOTION_SECTION_REVEAL = Object.freeze({
  durationMs: 200,
  /** Maximum translation applied by a section reveal, in px. */
  maxTranslationPx: 12,
});

/**
 * Formats an easing tuple as a CSS `cubic-bezier(...)` string.
 *
 * Mechanical projection — do not hand-write these strings anywhere.
 */
export function toCubicBezier(easing: readonly number[]): string {
  return `cubic-bezier(${easing.join(', ')})`;
}

/**
 * Projects the duration tokens to CSS custom-property values.
 *
 * Contract: "Expose CSS properties at the existing application style root."
 * Values are emitted in ms so they can be used directly in CSS.
 */
export const CSS_MOTION_TOKENS = Object.freeze({
  '--motion-ambient': `${MOTION_DURATION_MS.ambient}ms`,
  '--motion-response-fast': `${MOTION_DURATION_MS.responseFast}ms`,
  '--motion-response': `${MOTION_DURATION_MS.response}ms`,
  '--motion-response-slow': `${MOTION_DURATION_MS.responseSlow}ms`,
  '--motion-narrative': `${MOTION_DURATION_MS.narrative}ms`,
  '--ease-out-quint': toCubicBezier(MOTION_EASING.outQuint),
  '--ease-in-quad': toCubicBezier(MOTION_EASING.inQuad),
}) as Readonly<Record<string, string>>;

/**
 * Serialises `CSS_MOTION_TOKENS` into a CSS declaration block for injection at
 * the style root.
 *
 * @example
 * ```ts
 * const block = motionTokenCssBlock();
 * // "--motion-ambient: 12000ms; --motion-response: 200ms; ..."
 * ```
 */
export function motionTokenCssBlock(): string {
  return Object.entries(CSS_MOTION_TOKENS)
    .map(([name, value]) => `${name}: ${value};`)
    .join(' ');
}

/**
 * Converts a millisecond duration to the seconds value Framer expects.
 *
 * Framer receives seconds. This is the ONE place the division happens.
 */
export function msToSeconds(ms: number): number {
  return ms / 1000;
}

/** Convenience projections for Framer consumers. */
export const MOTION_SECONDS = Object.freeze({
  ambient: msToSeconds(MOTION_DURATION_MS.ambient),
  responseFast: msToSeconds(MOTION_DURATION_MS.responseFast),
  response: msToSeconds(MOTION_DURATION_MS.response),
  responseSlow: msToSeconds(MOTION_DURATION_MS.responseSlow),
  narrative: msToSeconds(MOTION_DURATION_MS.narrative),
});

/** Convenience projection for the stagger interval in Framer seconds. */
export const STAGGER_CHILDREN_SECONDS = msToSeconds(MOTION_STAGGER.intervalMs);

/** Convenience projection for the section-reveal duration in Framer seconds. */
export const SECTION_REVEAL_SECONDS = msToSeconds(MOTION_SECTION_REVEAL.durationMs);
