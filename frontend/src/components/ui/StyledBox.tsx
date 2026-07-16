/**
 * COMPONENT: StyledBox
 * OWNER: Shared UI infrastructure
 * PURPOSE: Preserve an element's semantics while converting a flat React
 *          style object into a styled-components class. This is the bounded
 *          migration bridge for legacy inline styles; `$style` is transient
 *          and never reaches the DOM.
 *
 * SECURITY: Accepts CSS properties only; it does not render HTML or URLs.
 * ACCESSIBILITY: The polymorphic `as` prop preserves the caller's native
 *                element semantics and existing ARIA/event props.
 */

import type { CSSProperties } from 'react';
import styled, { css, type CSSObject } from 'styled-components';

export interface StyledBoxProps {
  $style?: CSSProperties | CSSObject;
}

export const StyledBox = styled.div<StyledBoxProps>`
  && {
    ${({ $style }) => (
      $style ? css($style as CSSObject) : ''
    )}
  }
`;
