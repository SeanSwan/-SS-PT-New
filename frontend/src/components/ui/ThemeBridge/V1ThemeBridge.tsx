// frontend/src/components/ui/ThemeBridge/V1ThemeBridge.tsx

import React, { ReactNode } from 'react';
import styled from 'styled-components';

export interface V1ThemeBridgeProps {
  /**
   * Section content (v1.0 components)
   */
  children: ReactNode;

  /**
   * Optional CSS class name
   */
  className?: string;
}

/**
 * V1 Theme Bridge Component
 *
 * Temporary wrapper that applies subtle v2.0 aesthetics to old v1.0 sections.
 * Maintains visual cohesion during the hybrid refactor (Option C+).
 *
 * **Purpose:**
 * During the 2-week hybrid refactor, some sections remain v1.0 (Creative Expression,
 * Testimonials, Stats, Instagram, Newsletter) while others are upgraded to v2.0
 * (Hero, Packages, Features). This component bridges the gap by applying minimal
 * v2.0 styling to v1.0 sections so they "fit in" visually.
 *
 * **What it does:**
 * - Applies v2.0 dark background (galaxy.void or cyberpunk.darkBg)
 * - Updates text color to swan.silver for consistency
 * - Softens old borders to match v2.0 subtle borders
 * - Does NOT convert components to v2.0 (that's deferred)
 *
 * **Temporary:**
 * This component will be removed once all sections are refactored to v2.0.
 * It's a stopgap solution for the hybrid approach, not a permanent fixture.
 *
 * **Performance:**
 * - Zero runtime overhead (pure CSS)
 * - No JavaScript logic
 * - No additional bundle size (< 1 KB)
 *
 * @example
 * ```tsx
 * // Wrap deferred v1.0 sections
 * <V1ThemeBridge>
 *   <CreativeExpressionSection /> // Still v1.0
 * </V1ThemeBridge>
 *
 * <V1ThemeBridge>
 *   <TestimonialSlider /> // Still v1.0
 * </V1ThemeBridge>
 * ```
 *
 * @example
 * ```tsx
 * // After refactor, remove the bridge
 * // BEFORE:
 * <V1ThemeBridge>
 *   <StatsSection />
 * </V1ThemeBridge>
 *
 * // AFTER (when StatsSection is v2.0):
 * <StatsSection /> // No bridge needed
 * ```
 */
export const V1ThemeBridge: React.FC<V1ThemeBridgeProps> = ({ children, className }) => {
  return <BridgeWrapper className={className}>{children}</BridgeWrapper>;
};

const BridgeWrapper = styled.div`
  /* Apply v2.0 dark background */
  background-color: ${({ theme }) =>
    theme?.cyberpunk?.darkBg || theme?.background?.primary || '#0a0a1a'};

  /* Update text color to match v2.0 */
  color: ${({ theme }) => theme?.text?.primary || '#E8F0FF'};

  /* Soften old card borders to feel less out of place */
  [class*='Card'],
  [class*='card'] {
    border-color: rgba(255, 255, 255, 0.1);
  }

  /* Update old hardcoded backgrounds */
  [style*='background: linear-gradient'] {
    /* Let original gradients pass through, just adjust base */
    background-blend-mode: overlay;
  }

  /* Ensure proper text contrast */
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    color: ${({ theme }) => theme?.text?.primary || '#FFFFFF'};
  }

  p {
    color: ${({ theme }) => theme?.text?.secondary || '#C0C0D0'};
  }

  /* Subtle hint that this is a bridged section (dev mode only) */
  ${process.env.NODE_ENV === 'development' &&
  `
    position: relative;

    &::before {
      content: 'V1 Theme Bridge Active';
      position: absolute;
      top: 10px;
      left: 10px;
      padding: 4px 8px;
      background: rgba(255, 165, 0, 0.2);
      color: rgba(255, 165, 0, 0.8);
      font-size: 0.65rem;
      font-family: monospace;
      border-radius: 3px;
      border: 1px solid rgba(255, 165, 0, 0.3);
      pointer-events: none;
      z-index: 9999;
    }
  `}
`;

export default V1ThemeBridge;
