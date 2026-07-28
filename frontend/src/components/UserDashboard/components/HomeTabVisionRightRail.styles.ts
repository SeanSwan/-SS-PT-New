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
  gap: 0.65rem;
  margin-top: 0.8rem;
`;

export const TrendRank = styled.span`
  width: 2.05rem;
  height: 2.05rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: var(--accent-gold, #C6A84B);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 32%, transparent);
  font-size: 0.7rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
`;

export const TrendCopy = styled.div`
  min-width: 0;
  display: grid;
  gap: 0.28rem;
`;

export const TagName = styled.strong`
  min-width: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.84rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const TrendSignal = styled.span`
  color: var(--text-muted, rgba(224,236,244,0.64));
  font-size: 0.68rem;
  font-weight: 800;
`;

export const TrendMeter = styled.div`
  width: 100%;
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-muted, rgba(224,236,244,0.55)) 12%, transparent);
`;

export const TrendMeterFill = styled.span<{ $pct: number; $active: boolean }>`
  display: block;
  width: ${({ $pct }) => `${Math.min(Math.max($pct, 0), 100)}%`};
  height: 100%;
  border-radius: inherit;
  background: ${({ $active }) => ($active
    ? 'linear-gradient(90deg, var(--accent-gold, #C6A84B), var(--accent-primary, #60C0F0))'
    : 'transparent')};
  box-shadow: ${({ $active }) => ($active ? '0 0 14px color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent)' : 'none')};
  transition: width 180ms ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const TrendCount = styled.span`
  display: grid;
  justify-items: end;
  gap: 0.1rem;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.72rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;

  span {
    color: var(--text-muted, rgba(224,236,244,0.64));
    font-size: 0.62rem;
    font-weight: 800;
  }
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



