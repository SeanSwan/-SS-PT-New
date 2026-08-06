/**
 * ============================================================================
 * FILE: adminWaivers.styles.alerts.ts
 * PURPOSE: Inline, dismissible alert-banner styles for the admin waiver surface.
 * AUTHOR: Claude Opus 5 | LAST MODIFIED: 2026-08-05
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Styles the persistent failure banners rendered by
 * `AdminWaiverAlerts.tsx`. Failures stay on screen until the admin dismisses
 * them — an approve/reject/attach failure demands a decision, so it must not
 * evaporate on a 4-second toast timer the way a success confirmation can.
 *
 * TOKEN CONTRACT: colours resolve via Crystalline Swan tokens with a literal
 * fallback (CLAUDE.md rule 6).
 */

import styled from 'styled-components';

/**
 * Rendered unconditionally so it is a stable live region (see
 * AdminWaiverAlerts.tsx A11Y note); `:empty` keeps it from adding stray
 * vertical rhythm when there is nothing to announce.
 */
export const AlertRegion = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;

  &:empty {
    display: none;
  }
`;

export const AlertBanner = styled.div<{ $tone: 'error' | 'success' }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 12px 12px 14px;
  border-radius: 12px;
  border: 1px solid ${({ $tone }) => ($tone === 'error'
    ? 'color-mix(in srgb, var(--danger, #ff6b6b) 38%, transparent)'
    : 'color-mix(in srgb, var(--success, #00ff88) 38%, transparent)')};
  background: ${({ $tone }) => ($tone === 'error'
    ? 'color-mix(in srgb, var(--danger, #ff6b6b) 10%, transparent)'
    : 'color-mix(in srgb, var(--success, #00ff88) 10%, transparent)')};
  color: var(--text-primary, rgba(255, 255, 255, 0.92));
`;

export const AlertIcon = styled.div<{ $tone: 'error' | 'success' }>`
  flex: 0 0 auto;
  margin-top: 2px;
  display: grid;
  place-items: center;
  color: ${({ $tone }) => ($tone === 'error'
    ? 'var(--danger, #ff6b6b)'
    : 'var(--success, #00ff88)')};
`;

export const AlertBody = styled.div`
  flex: 1;
  min-width: 0;
`;

export const AlertTitle = styled.p`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--text-primary, #E0ECF4);
`;

export const AlertMessage = styled.p`
  margin: 4px 0 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--text-secondary, rgba(255, 255, 255, 0.75));
  word-break: break-word;
`;

export const AlertDismiss = styled.button`
  flex: 0 0 auto;
  min-width: var(--min-touch-target, 44px);
  min-height: var(--min-touch-target, 44px);
  display: grid;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary, rgba(255, 255, 255, 0.7));
  cursor: pointer;

  &:hover {
    color: var(--text-primary, #E0ECF4);
    background: rgba(var(--frost-white-rgb, 255, 255, 255), 0.08);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;
