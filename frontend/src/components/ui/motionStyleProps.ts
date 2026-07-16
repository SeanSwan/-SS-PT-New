/**
 * UTILITY: motionStyleProps
 * OWNER: Shared UI infrastructure
 * PURPOSE: Pass Framer Motion MotionValues through its required `style` API
 *          without treating them as ordinary DOM inline-style objects.
 *
 * WHY: MotionValues such as `y` and `scaleX` are runtime animation signals;
 *      styled-components cannot serialize them into static CSS classes.
 * SAFETY: The helper is typed to MotionStyle and returns only the documented
 *         Framer Motion style prop.
 */

import type { MotionStyle } from 'framer-motion';

export const motionStyleProps = <T extends MotionStyle | undefined>(style: T) => ({
  style,
});
