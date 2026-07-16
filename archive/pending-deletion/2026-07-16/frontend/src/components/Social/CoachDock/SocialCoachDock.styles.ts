/**
 * ============================================================================
 * FILE: SocialCoachDock.styles.ts
 * PURPOSE: Styled-components for the social-hub Swan Coach companion dock.
 * AUTHOR: Claude Fable 5 | CREATED: 2026-06-11
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Glass dock strip + chip rail for SocialCoachDock,
 * mirroring the user-dashboard SwanCoachDock visual language (chrome border,
 * tri-color accent bar, 44px pill chips) so Coach reads as one entity across
 * surfaces.
 *
 * KEY DECISIONS:
 * - Low-motion client/data card class: hover transitions only, NO animation
 *   loops (the dashboard dock's coachPulse is deliberately not reused here —
 *   this strip sits above the feed for every user on every visit).
 * - prefers-reduced-motion removes the remaining transitions.
 * - var(--token, #fallback) Crystalline tokens throughout (rule 6).
 * - Chips wrap on narrow viewports; font/padding step down at 375px/320px.
 */

import styled from 'styled-components';

export const DockShell = styled.section`
  position: relative;
  overflow: hidden;
  margin-bottom: 16px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  border-radius: 20px;
  background: var(--bg-elevated, rgba(0, 48, 128, 0.85));
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.03),
    0 8px 32px rgba(0, 0, 0, 0.2);

  @supports (backdrop-filter: blur(20px)) {
    background: var(--bg-elevated, rgba(0, 48, 128, 0.6));
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  @media (max-width: 414px) {
    border-radius: 16px;
  }
`;

/* Coach "presence" signature: same tri-color accent DNA as the dashboard
   dock's elite bar, so the Coach brand is continuous across surfaces. */
export const DockAccent = styled.div`
  height: 3px;
  background: linear-gradient(
    90deg,
    var(--accent-primary, #60C0F0) 0%,
    var(--accent-purple, #8B5CF6) 50%,
    var(--accent-gold, #C6A84B) 100%
  );
`;

export const DockInner = styled.div`
  padding: 1rem 1.25rem 1.125rem;

  @media (max-width: 414px) {
    padding: 0.875rem 0.875rem 1rem;
  }

  @media (max-width: 320px) {
    padding: 0.75rem 0.75rem 0.875rem;
  }
`;

export const DockHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.875rem;
`;

export const CoachAvatar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  min-width: 40px;
  border: 2px solid var(--accent-primary, #60C0F0);
  border-radius: 50%;
  background: radial-gradient(
    circle at 35% 35%,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent) 0%,
    var(--bg-base, #0A0A0F) 70%
  );
  color: var(--accent-primary, #60C0F0);
  flex-shrink: 0;
`;

export const Greeting = styled.div`
  flex: 1;
  min-width: 0;
`;

export const GreetingName = styled.p`
  overflow: hidden;
  margin: 0 0 0.15rem;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const GreetingSub = styled.p`
  margin: 0;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.775rem;
  line-height: 1.4;
`;

export const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

export const ActionChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 44px;
  height: 44px;
  padding: 0 0.875rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border-radius: 22px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 7%, transparent);
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.12s ease;
  white-space: nowrap;

  &:hover {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  svg {
    flex-shrink: 0;
  }

  @media (max-width: 375px) {
    padding: 0 0.75rem;
    font-size: 0.75rem;
  }

  @media (max-width: 320px) {
    padding: 0 0.625rem;
    font-size: 0.72rem;
    gap: 0.3rem;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;
