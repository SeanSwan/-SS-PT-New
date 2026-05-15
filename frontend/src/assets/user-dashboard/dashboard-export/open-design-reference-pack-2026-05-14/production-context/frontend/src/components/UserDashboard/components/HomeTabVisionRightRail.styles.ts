/**
 * FILE: HomeTabVisionRightRail.styles.ts
 * PURPOSE: Right-rail layout helpers for the Creator Observatory Home tab.
 */

import styled from 'styled-components';

export const LeaderboardList = styled.div`
  margin-top: 0.9rem;
  display: grid;
  gap: 0.45rem;
`;

export const LeaderboardRow = styled.div`
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) max-content;
  gap: 0.55rem;
  align-items: center;
`;

export const LeaderboardRank = styled.span<{ $gold?: boolean }>`
  color: ${({ $gold }) => ($gold ? 'var(--accent-gold, #C6A84B)' : 'var(--vision-soft)')};
  font-weight: 900;
`;

export const LeaderboardName = styled.strong`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const LeaderboardPoints = styled.span`
  color: var(--text-muted, rgba(224,236,244,0.55));
  font-size: 0.68rem;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`;
