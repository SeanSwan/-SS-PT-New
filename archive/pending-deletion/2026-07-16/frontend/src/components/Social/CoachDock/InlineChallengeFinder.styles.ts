/**
 * ============================================================================
 * FILE: InlineChallengeFinder.styles.ts
 * PURPOSE: Styled-components for the dock's inline challenge finder (D2b).
 * AUTHOR: Claude Fable 5 | CREATED: 2026-06-11
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Compact match rows + join controls that expand inside
 * SocialCoachDock below the chip rail. Same low-motion C12 glass language as
 * the dock shell: no animation loops, prefers-reduced-motion strips the
 * remaining hover/color transitions.
 */

import styled from 'styled-components';

export const FinderPanel = styled.div`
  margin-top: 0.875rem;
  padding-top: 0.875rem;
  border-top: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const StatusLine = styled.p`
  margin: 0;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.8rem;
  line-height: 1.4;
`;

export const MatchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface-dark, #1A1A24) 55%, transparent);

  @media (max-width: 414px) {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
`;

export const CategoryDot = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  min-width: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`;

export const MatchInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const MatchTitle = styled.p`
  overflow: hidden;
  margin: 0 0 0.1rem;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const MatchMeta = styled.span`
  display: block;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.72rem;
  font-family: 'Fira Code', monospace;
`;

export const JoinButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 44px;
  height: 44px;
  padding: 0 0.875rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
  border-radius: 22px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
  transition: background 0.18s ease, border-color 0.18s ease;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  }

  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/* Join receipt — the micro-win: restrained Gilded Fern, no motion. */
export const JoinedReceipt = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  height: 44px;
  padding: 0 0.875rem;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 35%, transparent);
  border-radius: 22px;
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 10%, transparent);
  color: var(--accent-gold, #C6A84B);
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
`;

export const RetryLine = styled.span`
  display: block;
  width: 100%;
  color: var(--accent-gold, #C6A84B);
  font-size: 0.72rem;
  line-height: 1.4;
`;

export const BrowseAllButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  align-self: flex-start;
  min-width: 44px;
  min-height: 44px;
  padding: 0 0.875rem;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--accent-purple, #8B5CF6);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  transition: color 0.18s ease;

  &:hover {
    color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
