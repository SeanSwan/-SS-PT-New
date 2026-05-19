/*
 * ============================================================================
 * STYLES: ObservatoryRightRailStyles
 * PURPOSE: Phase 19B Observatory shell - right rail tier card, badges grid,
 *          and empty states.
 * OWNER:   Claude Opus 4.7
 * UPDATED: 2026-04-29
 * ----------------------------------------------------------------------------
 * Token-driven (var(--token, #fallback)) per Rule 6.
 * Reduced-motion respected per Rule 25.
 * 44px minimum touch targets per Rule 2.
 * Split from ObservatoryShellStyles.ts to satisfy Rule 4 300-line cap.
 * Per Codex P2: tier card inline styles replaced with named styled
 * components (RightRailTierRow / RightRailTierIcon / RightRailTierName).
 * ============================================================================
 */

import styled from 'styled-components';

export const RightRailTierRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
`;

export const RightRailTierIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-gold, #C6A84B);
  flex-shrink: 0;
`;

export const RightRailTierName = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

export const RightRailBadgeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
  gap: 0.5rem;
`;

export const RightRailBadgeCell = styled.div`
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  font-size: 1.25rem;
  color: var(--accent-primary, #60C0F0);
`;

export const RightRailEmptyState = styled.p`
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  text-align: center;
  padding: 0.75rem 0.5rem;
`;
