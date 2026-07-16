/**
 * ============================================================================
 * FILE: SocialRightRail.styles.ts
 * PURPOSE: Styled-components for the /social feed-tab right rail (merge M3).
 * AUTHOR: Claude Fable 5 | CREATED: 2026-06-11
 * ============================================================================
 *
 * WHAT THIS FILE DOES: The desktop third column on the social feed — Live
 * Activity, Active Challenge, Leaderboard top-3, Next Best Action. Low-motion
 * C12 glass cards, Crystalline tokens, Arctic Cyan for DATA values only.
 * Split from SocialPage.V3 to respect the 300-line cap (rule 4).
 */

import styled from 'styled-components';

export const RailColumn = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: fit-content;
  position: sticky;
  top: 80px;
`;

export const RailCard = styled.div`
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  border-radius: 1.25rem;
  padding: 16px;
  background: var(--bg-surface, rgba(0, 32, 96, 0.5));

  @supports (backdrop-filter: blur(8px)) {
    background: var(--bg-surface, rgba(0, 32, 96, 0.3));
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
`;

export const RailHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: var(--accent-purple, #8B5CF6);

  svg {
    flex-shrink: 0;
  }
`;

export const RailTitle = styled.h4`
  margin: 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary, #94a3b8);
`;

export const LiveDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--success, #22C55E);
  margin-left: auto;
`;

export const RailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 0;
  font-size: 0.82rem;
  color: var(--text-primary, #E0ECF4);
  line-height: 1.35;

  & + & {
    border-top: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 6%, transparent);
  }
`;

export const RailRank = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  min-width: 22px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 14%, transparent);
  color: var(--accent-gold, #C6A84B);
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
  font-weight: 700;
`;

export const RailName = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const RailMeta = styled.span`
  color: var(--accent-data, #50A0F0);
  font-family: 'Fira Code', monospace;
  font-size: 0.74rem;
  white-space: nowrap;
`;

export const RailEmpty = styled.p`
  margin: 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 55%, transparent);
  font-size: 0.8rem;
  line-height: 1.5;
`;

export const RailLink = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  align-self: flex-start;
  margin-top: 10px;
  min-height: 44px;
  padding: 0 4px;
  border: none;
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  transition: color 0.18s ease;

  &:hover {
    color: var(--accent-purple, #8B5CF6);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/* Next Best Action — the one card with a primary CTA (purple bg → cyan glow). */
export const NbaText = styled.p`
  margin: 0 0 12px;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.85rem;
  line-height: 1.5;
`;

export const NbaButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid color-mix(in srgb, var(--accent-purple, #8B5CF6) 45%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent-purple, #8B5CF6) 18%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  transition: background 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-purple, #8B5CF6) 28%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
    box-shadow: 0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
