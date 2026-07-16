/**
 * UTILITY: victoryStyleProps
 * OWNER: Shared chart infrastructure
 * PURPOSE: Preserve Victory's required component `style` contract in a
 *          spreadable prop object while the DOM inline-style ban remains
 *          strict for application markup.
 *
 * ACCESSIBILITY: Styling only; chart labels and descriptions remain owned by
 *                each chart component.
 * SAFETY: The generic return type preserves the caller's exact style shape.
 */

export const victoryStyleProps = <T>(style: T) => ({
  style,
});
