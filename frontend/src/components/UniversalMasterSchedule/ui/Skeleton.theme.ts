/**
 * UniversalMasterSchedule skeleton loading theme bridge.
 *
 * Keeps active loading placeholders on Crystalline Swan dashboard tokens while
 * preserving the existing shimmer behavior and reduced-motion fallback.
 */
import { css, keyframes } from 'styled-components';

export const SCHEDULE_SKELETON_THEME = {
  shimmerStart: 'var(--skeleton-shimmer-start, rgba(96, 192, 240, 0.04))',
  shimmerPeak: 'var(--skeleton-shimmer-peak, rgba(139, 92, 246, 0.12))',
  shimmerRest: 'var(--skeleton-shimmer-rest, rgba(224, 236, 244, 0.06))',
  border: 'var(--border-soft, rgba(96, 192, 240, 0.18))',
} as const;

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

export const shimmerStyles = css`
  background: linear-gradient(
    90deg,
    ${SCHEDULE_SKELETON_THEME.shimmerStart} 0%,
    ${SCHEDULE_SKELETON_THEME.shimmerPeak} 50%,
    ${SCHEDULE_SKELETON_THEME.shimmerRest} 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background: ${SCHEDULE_SKELETON_THEME.shimmerRest};
  }
`;
