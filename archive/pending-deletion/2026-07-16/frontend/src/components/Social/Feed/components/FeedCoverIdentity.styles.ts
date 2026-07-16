/**
 * ============================================================================
 * FILE: FeedCoverIdentity.styles.ts
 * PURPOSE: Identity strip styles for the Feed Cover Studio (merge M2).
 * AUTHOR: Claude Fable 5 | CREATED: 2026-06-11
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Avatar + name/@handle + tier/XP/streak chips that lead
 * the cover — the Observatory's creator-hero essence folded into the one hub.
 * Split from FeedCoverStudio.styles.ts which sits at the 300-line cap (rule 4).
 *
 * KEY DECISIONS:
 * - Deliberately motionless — identity is a fact, not a performance.
 * - Arctic Cyan is used for DATA values only (XP/streak numbers), per the
 *   palette discipline; tier stays Gilded Fern luxury.
 * - Wraps gracefully at 320px: chips flow under the name block.
 */

import styled from 'styled-components';

export const IdentityRow = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;

  @container (min-width: 720px) {
    grid-column: 1 / -1;
  }
`;

export const IdentityAvatar = styled.img`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 55%, transparent);
  flex-shrink: 0;
`;

export const IdentityAvatarFallback = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 55%, transparent);
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, var(--bg-base, #030712));
  color: var(--text-primary, #E0ECF4);
  font: 800 1.05rem/1 'Plus Jakarta Sans', sans-serif;
  flex-shrink: 0;
`;

export const IdentityText = styled.div`
  min-width: 0;
`;

export const IdentityName = styled.p`
  overflow: hidden;
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 800 1.05rem/1.2 'Plus Jakarta Sans', sans-serif;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const IdentityHandle = styled.p`
  overflow: hidden;
  margin: 2px 0 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 64%, transparent);
  font: 600 0.78rem/1 'Sora', sans-serif;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const IdentityChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-left: auto;

  @media (max-width: 540px) {
    margin-left: 0;
    width: 100%;
  }
`;

export const TierChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 7px 11px;
  color: var(--accent-gold, #C6A84B);
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 28%, transparent);
  font: 800 0.72rem/1 'Sora', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
`;

export const IdentityStat = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 7px 11px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-surface, #141419) 74%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 80%, transparent);
  font: 700 0.74rem/1 'Sora', sans-serif;
  white-space: nowrap;

  strong {
    color: var(--accent-data, #50A0F0);
    font: 800 0.84rem/1 'Fira Code', monospace;
  }
`;
