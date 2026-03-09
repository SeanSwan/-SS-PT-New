/**
 * Theme Mixins — Reusable styled-component CSS snippets
 * ======================================================
 * Gemini 3.1 Pro Design Authority spec — "Swan Glass" system
 *
 * Usage:
 *   import { swanGlass, swanButton, responsivePadding } from '../theme/mixins';
 *   const Card = styled.div`${swanGlass}`;
 */

import { css } from 'styled-components';

/**
 * Swan Glass — Premium glassmorphism mixin
 * Uses theme.background.surface for glass fill, theme.borders.card for facet border.
 * Reduces blur on mobile (<768px) to 8px for performance.
 */
export const swanGlass = css`
  background: ${({ theme }) => theme.background?.surface ?? 'rgba(0, 32, 96, 0.45)'};
  backdrop-filter: blur(16px) saturate(120%);
  -webkit-backdrop-filter: blur(16px) saturate(120%);
  border: ${({ theme }) => theme.borders?.card ?? '1px solid rgba(96, 192, 240, 0.15)'};
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
  border-radius: 16px;

  @media (max-width: 768px) {
    backdrop-filter: blur(8px) saturate(120%);
    -webkit-backdrop-filter: blur(8px) saturate(120%);
  }
`;

/**
 * Swan Glass (compact) — Smaller border-radius for inline elements
 */
export const swanGlassCompact = css`
  background: ${({ theme }) => theme.background?.surface ?? 'rgba(0, 32, 96, 0.45)'};
  backdrop-filter: blur(12px) saturate(110%);
  -webkit-backdrop-filter: blur(12px) saturate(110%);
  border: ${({ theme }) => theme.borders?.card ?? '1px solid rgba(96, 192, 240, 0.15)'};
  box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.15);
  border-radius: 12px;

  @media (max-width: 768px) {
    backdrop-filter: blur(8px) saturate(110%);
    -webkit-backdrop-filter: blur(8px) saturate(110%);
  }
`;

/**
 * Swan Button — Refraction button per Gemini spec
 * Min 44px touch target, faceted gradient, refraction hover effect.
 */
export const swanButton = css`
  min-height: 44px;
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  color: ${({ theme }) => theme.text?.primary ?? '#F8FAFC'};
  background: ${({ theme }) => theme.colors?.primary ?? '#60C0F0'};
  box-shadow:
    ${({ theme }) => theme.shadows?.button ?? '0 4px 20px rgba(96, 192, 240, 0.3)'},
    inset 0 1px 1px rgba(255, 255, 255, 0.4);
  transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);

  &:hover {
    box-shadow:
      0 0 15px ${({ theme }) => (theme.colors?.primary ?? '#60C0F0') + '80'},
      inset 0 1px 1px rgba(255, 255, 255, 0.4);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(1px);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
  }
`;

/**
 * Responsive padding — scales with breakpoints per Gemini spec
 * 16px mobile, 24px tablet, 32px desktop
 */
export const responsivePadding = css`
  padding: 16px;

  @media (min-width: 768px) {
    padding: 24px;
  }

  @media (min-width: 1024px) {
    padding: 32px;
  }
`;

/**
 * Inner refraction shadow — crystalline facet effect for cards
 */
export const innerRefraction = css`
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    inset 0 -1px 0 rgba(0, 0, 0, 0.1),
    ${({ theme }) => theme.shadows?.glass ?? '0 8px 32px rgba(0, 0, 0, 0.2)'};
`;

export default {
  swanGlass,
  swanGlassCompact,
  swanButton,
  responsivePadding,
  innerRefraction,
};
