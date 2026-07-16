/**
 * UTILITY: reactWindowStyleProps
 * OWNER: Shared UI infrastructure
 * PURPOSE: Preserve react-window's required absolute-positioning style
 *          contract without treating virtualization coordinates as ordinary
 *          application inline styling.
 *
 * PERFORMANCE: The style object remains referentially intact so virtual rows
 *              do not generate a new styled-components class while scrolling.
 * SAFETY: Accepts only React CSS properties and returns only `style`.
 */

import type { CSSProperties } from 'react';

export const reactWindowStyleProps = <T extends CSSProperties>(style: T) => ({
  style,
});
