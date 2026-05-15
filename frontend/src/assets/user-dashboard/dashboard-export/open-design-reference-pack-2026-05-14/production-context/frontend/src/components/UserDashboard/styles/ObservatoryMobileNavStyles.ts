/*
 * ============================================================================
 * STYLES: ObservatoryMobileNavStyles
 * PURPOSE: Phase 19B Observatory shell - mobile bottom navigation bar.
 *          Hidden at >= 1024px. Used only at mobile/tablet widths.
 * OWNER:   Claude Opus 4.7
 * UPDATED: 2026-04-29
 * ----------------------------------------------------------------------------
 * Token-driven (var(--token, #fallback)) per Rule 6.
 * Reduced-motion respected per Rule 25.
 * 48px minimum touch targets (each item slightly above the 44px floor)
 * per Rule 2.
 * Split from ObservatoryShellStyles.ts to satisfy Rule 4 300-line cap.
 * ============================================================================
 */

import styled from 'styled-components';

export const MobileBottomNav = styled.nav`
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  position: sticky;
  bottom: 0;
  margin-top: 1rem;
  padding: 0.5rem 0.75rem env(safe-area-inset-bottom, 0.5rem);
  background: color-mix(in srgb, var(--bg-elevated, #141419) 92%, transparent);
  border-top: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  border-radius: 16px 16px 0 0;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  z-index: 10001;
  contain: layout;

  @supports not (backdrop-filter: blur(14px)) {
    background: var(--bg-elevated, #141419);
  }

  @media (min-width: 1024px) {
    display: none;
  }
`;

export const MobileBottomNavItem = styled.button<{ $active?: boolean; $primary?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  flex: 1;
  min-height: 48px;
  min-width: 44px;
  padding: 0.375rem 0.25rem;
  border: none;
  background: transparent;
  color: ${p => p.$active
    ? 'var(--accent-primary, #60C0F0)'
    : 'var(--text-secondary, rgba(224, 236, 244, 0.6))'};
  font-family: inherit;
  font-size: 0.6875rem;
  font-weight: ${p => p.$active ? 600 : 500};
  cursor: pointer;
  transition: color 0.2s ease;
  position: relative;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  &:hover {
    color: var(--text-primary, #E0ECF4);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -2px;
    border-radius: 8px;
  }

  ${p => p.$primary && `
    & > span:first-child {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg,
        var(--accent-primary, #60C0F0),
        var(--accent-secondary, #8B5CF6)
      );
      color: var(--color-white, #E0ECF4);
      box-shadow: 0 4px 16px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 35%, transparent);
    }
  `}
`;
