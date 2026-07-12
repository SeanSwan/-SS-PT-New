/**
 * UniversalDashboardLayout.stateStyles
 * ====================================
 * Loading + error state chrome for the dashboard shell, extracted from
 * UniversalDashboardLayout.styles.ts (2026-07-11).
 *
 * WHY: the parent styles file had grown to 301 lines against the 300-line section
 * cap enforced by UniversalDashboardLayout.retryContract.test.ts. The cap exists to
 * force EXTRACTION (Rule 4) — shaving two lines to make the test pass would have
 * gamed the gate rather than honoured it. These state styles are a self-contained
 * group (they depend only on styled + motion), so they lift out cleanly.
 *
 * The parent re-exports everything here, so no consumer import changed.
 */
import { motion } from 'framer-motion';
import styled from 'styled-components';

export const UniversalLoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  text-align: center;
`;

export const UniversalLoadingSpinner = styled(motion.div)`
  width: 60px;
  height: 60px;
  border: 4px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border-left: 4px solid var(--accent-primary, #60C0F0);
  border-radius: 50%;
  margin-bottom: 24px;
  animation: universal-dashboard-spin 1s linear infinite;

  @keyframes universal-dashboard-spin {
    to { transform: rotate(360deg); }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const LoadingTitle = styled.h2`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 65%, transparent));
  font-size: 1.25rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
`;
export const LoadingText = styled.p`
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 40%, transparent));
  font-size: 0.9rem;
`;
export const NutritionLoadingFallback = styled.div`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent));
  padding: 2rem;
  text-align: center;
`;
export const UniversalErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  text-align: center;
  padding: 32px;

  h2 {
    color: var(--danger, #C92A54);
    margin-bottom: 16px;
    font-size: 1.5rem;
    font-weight: 600;
  }

  p {
    color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 65%, transparent));
    margin-bottom: 24px;
    max-width: 600px;
    line-height: 1.6;
  }
`;

export const ErrorIcon = styled.div`
  color: var(--danger, #C92A54);
  font-size: 3rem;
  margin-bottom: 1.5rem;
`;

export const ErrorActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
`;
