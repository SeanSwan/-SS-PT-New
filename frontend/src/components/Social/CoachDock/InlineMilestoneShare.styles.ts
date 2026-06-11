/**
 * ============================================================================
 * FILE: InlineMilestoneShare.styles.ts
 * PURPOSE: Styled-components for the dock's inline milestone share (D2c).
 * AUTHOR: Claude Fable 5 | CREATED: 2026-06-11
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Draft-preview card + confirm rail for the share panel.
 * Panel container, status line, gold receipt, and retry line are imported
 * from InlineChallengeFinder.styles by the component (shared dock-panel
 * vocabulary — no duplication). Same low-motion C12 discipline: no loops,
 * prefers-reduced-motion strips transitions.
 *
 * KEY DECISIONS:
 * - Share button is the purple primary pill (Dual-Button Glow: purple bg →
 *   cyan glow/focus ring). Cancel is a quiet text pill.
 * - The draft card uses Cormorant-free plain text — it previews exactly the
 *   string that will be posted, no decoration that won't survive the feed.
 */

import styled from 'styled-components';

export const DraftCard = styled.figure`
  margin: 0;
  padding: 0.75rem 0.875rem;
  border: 1px solid color-mix(in srgb, var(--accent-purple, #8B5CF6) 25%, transparent);
  border-left: 3px solid var(--accent-purple, #8B5CF6);
  border-radius: 12px;
  background: color-mix(in srgb, var(--surface-dark, #1A1A24) 55%, transparent);
`;

export const DraftLabel = styled.figcaption`
  margin: 0 0 0.35rem;
  color: var(--accent-purple, #8B5CF6);
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

export const DraftText = styled.blockquote`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.85rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
`;

export const ConfirmRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
`;

export const ShareButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 44px;
  height: 44px;
  padding: 0 1rem;
  border: 1px solid color-mix(in srgb, var(--accent-purple, #8B5CF6) 45%, transparent);
  border-radius: 22px;
  background: color-mix(in srgb, var(--accent-purple, #8B5CF6) 18%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  transition: background 0.18s ease, border-color 0.18s ease;

  &:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--accent-purple, #8B5CF6) 70%, transparent);
    background: color-mix(in srgb, var(--accent-purple, #8B5CF6) 28%, transparent);
  }

  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  /* Dual-Button Glow: purple surface → cyan glow on focus. */
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
    box-shadow: 0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const CancelButton = styled.button`
  display: inline-flex;
  align-items: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0 0.875rem;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--text-secondary, #94a3b8);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  transition: color 0.18s ease;

  &:hover {
    color: var(--text-primary, #E0ECF4);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
