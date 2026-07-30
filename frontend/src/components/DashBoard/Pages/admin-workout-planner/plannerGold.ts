/**
 * plannerGold.ts — planner gold accent, single source (Workout-OS C7d).
 *
 * Every gold usage in admin-workout-planner resolves through this module so a
 * palette change is one edit. Swan Lens can retheme via the --accent-gold
 * custom property. Before this hoist, the same hex was declared under five
 * different aliases (--accent-gold, --accent-warning, --accent-luxury,
 * --warning, and one bare literal) — all resolved to the same hex.
 */

export const PLANNER_GOLD = 'var(--accent-gold, #C6A84B)';

/**
 * Gold at a given opacity over transparent, expressed with color-mix so the
 * CSS custom property still resolves at paint time. Clamps opacity to [0, 1].
 */
export const plannerGoldAlpha = (opacity: number): string =>
  `color-mix(in srgb, ${PLANNER_GOLD} ${Math.round(Math.min(1, Math.max(0, opacity)) * 100)}%, transparent)`;
