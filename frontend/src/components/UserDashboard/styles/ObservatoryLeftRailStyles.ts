/*
 * ============================================================================
 * STYLES: ObservatoryLeftRailStyles
 * PURPOSE: Phase 19B Observatory shell - left rail brand block, nav items,
 *          nav items and momentum cards (level + creator streak).
 * OWNER:   Claude Opus 4.7
 * UPDATED: 2026-04-29
 * ----------------------------------------------------------------------------
 * Token-driven (var(--token, #fallback)) per Rule 6.
 * Reduced-motion respected per Rule 25.
 * 44px minimum touch targets per Rule 2.
 * Split from ObservatoryShellStyles.ts to satisfy Rule 4 300-line cap.
 * ============================================================================
 */

import styled from 'styled-components';
import { ObservatoryGlassPanel } from './ObservatoryShellLayoutStyles';

export const LeftRailBrand = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.5rem 0.75rem;
`;

export const LeftRailBrandMark = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent),
    color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary, #60C0F0);
  flex-shrink: 0;

  & img {
    width: 28px;
    height: 28px;
    object-fit: contain;
    filter: drop-shadow(0 0 8px color-mix(in srgb, var(--accent-primary, #60C0F0) 55%, transparent));
  }
`;

export const LeftRailBrandText = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

export const LeftRailBrandTitle = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  letter-spacing: -0.01em;
`;

export const LeftRailBrandSubtitle = styled.span`
  font-size: 0.6875rem;
  color: var(--accent-primary, #60C0F0);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-weight: 500;
`;

export const LeftRailNavList = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.25rem 0;
`;

export const LeftRailNavItem = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-height: 44px;
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  border: 1px solid ${p => p.$active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent)'
    : 'transparent'};
  background: ${p => p.$active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'
    : 'transparent'};
  color: ${p => p.$active
    ? 'var(--text-primary, #E0ECF4)'
    : 'var(--text-secondary, rgba(224, 236, 244, 0.6))'};
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: ${p => p.$active ? 600 : 500};
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
    color: var(--text-primary, #E0ECF4);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  & svg {
    flex-shrink: 0;
    color: ${p => p.$active
      ? 'var(--accent-primary, #60C0F0)'
      : 'currentColor'};
  }
`;

export const LeftRailMomentumCard = styled(ObservatoryGlassPanel)`
  padding: 1rem;
`;

export const LeftRailMomentumHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 0.625rem;
`;

export const LeftRailMomentumLabel = styled.span`
  font-size: 0.6875rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  font-weight: 600;
`;

export const LeftRailMomentumValue = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
`;

export const LeftRailMomentumUnit = styled.span`
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  letter-spacing: 0.05em;
`;

export const LeftRailMomentumProgress = styled.div`
  margin-top: 0.625rem;
  height: 6px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  border-radius: 3px;
  overflow: hidden;
`;

export const LeftRailMomentumProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${p => Math.max(0, Math.min(100, p.$pct))}%;
  background: linear-gradient(90deg,
    var(--accent-primary, #60C0F0),
    var(--accent-secondary, #8B5CF6)
  );
  border-radius: 3px;
  transition: width 0.6s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const LeftRailMomentumMeta = styled.span`
  display: block;
  margin-top: 0.5rem;
  font-size: 0.6875rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
`;
