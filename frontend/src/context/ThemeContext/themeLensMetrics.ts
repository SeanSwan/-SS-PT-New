/**
 * themeLensMetrics.ts
 * ===================
 *
 * The lens's two design metrics, in one place because more than one style module
 * needs them. Extracted from ThemeLensPopover.styles.ts under Rule 4's own remedy
 * list ("extract hooks, utils, styles, types") when that file reached 308 lines —
 * the AA contrast fix for `PanelTitle` pushed it past the cap, and the cap's answer
 * is to extract a concern, not to delete the comment explaining the fix.
 *
 * These are geometry, not colour: colour comes from `getThemeSwatch`.
 */

/** Minimum option width. Below this the labels wrap badly. */
export const OPTION_MIN_WIDTH = 66;

/** The 44px minimum touch target, named so the intent is greppable. */
export const TOUCH_TARGET_PX = 44;
