/**
 * FILE: HomeTabVisionRightRail.styles.ts
 * PURPOSE: Right-rail layout helpers for the Creator Observatory Home tab.
 */

import styled from 'styled-components';
import { ButtonRow, GlassButton } from './HomeTabVisionCards.styles';

export const RailHeader = styled(ButtonRow)<{ $spaced?: boolean }>`
  justify-content: space-between;
  margin-bottom: ${({ $spaced }) => ($spaced ? '0.8rem' : '0')};
`;

export const StoryImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const ActivityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 0.9rem;
`;

export const ActivityItem = styled.div`
  display: flex;
  gap: 0.55rem;
  min-width: 0;
`;

export const ActivityCopy = styled.div`
  min-width: 0;
  font-size: 0.76rem;
  color: var(--vision-soft);
`;

export const ActivityUser = styled.strong`
  color: var(--text-primary, #E0ECF4);
`;

export const EmptyState = styled.p`
  color: var(--vision-soft);
  margin: 0.8rem 0 0;
  line-height: 1.45;
`;

export const SoftParagraph = styled.p`
  margin: 0.6rem 0 0.8rem;
  color: var(--vision-soft);
  line-height: 1.45;
`;

export const MutedTiny = styled.div`
  color: var(--text-muted, rgba(224,236,244,0.55));
  font-size: 0.68rem;
`;

export const GoldMeta = styled.span`
  color: var(--accent-gold, #C6A84B);
  font-size: 0.75rem;
  font-weight: 900;
`;

export const ChallengeBody = styled(ButtonRow)`
  align-items: stretch;
  margin-top: 0.9rem;
`;

export const ChallengeCopy = styled.div`
  flex: 1;
  min-width: 0;
`;

export const ChallengeTitle = styled.strong`
  font-size: 1.05rem;
`;

export const ChallengeCrown = styled.div`
  display: grid;
  place-items: center;
  width: 86px;
`;

export const FullWidthAction = styled(GlassButton)`
  width: 100%;
  margin-top: 0.9rem;
`;

export const BadgeImage = styled.img`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
`;

export const TrendingGrid = styled.div`
  display: grid;
  gap: 0.6rem;
  margin-top: 0.8rem;
`;

export const TrendingRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.8rem;
  align-items: center;
`;

export const TagName = styled.strong`
  color: var(--accent-primary, #60C0F0);
  font-size: 0.82rem;
`;

export const MomentumLayout = styled.div`
  display: grid;
  grid-template-columns: 92px 1fr;
  gap: 1rem;
  align-items: center;
`;

export const MomentumRing = styled.div`
  position: relative;
  width: 92px;
  height: 92px;
`;

export const MomentumValue = styled.strong`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
`;

export const MomentumBars = styled.div`
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 4px;
  height: 76px;
`;

export const MomentumBar = styled.div<{ $height: number; $gold?: boolean }>`
  width: 18px;
  height: ${({ $height }) => `${$height}%`};
  border-radius: 5px;
  background: ${({ $gold }) => ($gold ? 'var(--accent-gold, #C6A84B)' : 'var(--accent-primary, #60C0F0)')};
`;

export const TransformationGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 34px 1fr;
  gap: 0.55rem;
  align-items: center;
  margin-top: 0.8rem;
`;

export const SceneFrame = styled.div`
  border-radius: 14px;
  overflow: hidden;
  aspect-ratio: 4 / 3;
`;

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
