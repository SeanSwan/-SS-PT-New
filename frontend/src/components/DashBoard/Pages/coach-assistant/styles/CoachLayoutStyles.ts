/**
 * ============================================================================
 * FILE: CoachLayoutStyles.ts
 * PURPOSE: Page layout, header, welcome state, and container styles
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-30
 * ============================================================================
 */

import styled from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Page Layout
// ─────────────────────────────────────────────────────────────
export const CoachPage = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
  overflow: hidden;
`;

export const CoachHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  flex-shrink: 0;

  @media (max-width: 375px) {
    padding: 10px 10px;
    gap: 8px;
  }

  @media (min-width: 1024px) {
    padding: 16px 24px;
  }

  @media (min-width: 2560px) {
    padding: 20px 32px;
  }
`;

export const CoachTitle = styled.h1`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 375px) {
    font-size: 1rem;
  }

  @media (min-width: 768px) {
    font-size: 1.25rem;
  }

  @media (min-width: 2560px) {
    font-size: 1.5rem;
  }

  @media (min-width: 3840px) {
    font-size: 1.75rem;
  }
`;

export const CoachHeaderIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
  color: var(--accent-secondary, #8B5CF6);
  flex-shrink: 0;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Empty / Welcome State
// ─────────────────────────────────────────────────────────────
export const WelcomeWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px 24px;
  gap: 16px;
  flex: 1;
`;

export const WelcomeIcon = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent);
  color: var(--accent-secondary, #8B5CF6);
  margin-bottom: 8px;
`;

export const WelcomeTitle = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
  margin: 0;
`;

export const WelcomeSubtitle = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 15px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  margin: 0;
  max-width: 360px;
  line-height: 1.5;
`;
