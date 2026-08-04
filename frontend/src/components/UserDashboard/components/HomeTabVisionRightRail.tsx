/**
 * FILE: HomeTabVisionRightRail.tsx
 * PURPOSE: Claude Design-inspired right rail widgets for /user-dashboard Home.
 */

import React from 'react';
import styled from 'styled-components';
import {
  ArrowRight,
  Crown,
  Dumbbell,
  Heart,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { compactNumber, type VisionTarget } from './HomeTabVision.data';
import HomeTabFactionPanel from './HomeTabFactionPanel';
import HomeTabNextBestAction from './HomeTabNextBestAction';
import type { Faction } from '../../../hooks/social/useFaction';
import type {
  HomeBadgeItem,
  HomeChallengeSummary,
  HomeLeaderboardRow,
  HomeLiveActivityItem,
  TrendingTagSummary,
} from './HomeTabViewModel';
import { Eyebrow, Panel, RightRail } from './HomeTabVision.styles';
import {
  Bar,
  ButtonRow,
  Chip,
  Fill,
} from './HomeTabVisionCards.styles';
import {
  ActivityCopy,
  ActivityGrid,
  ActivityItem,
  ActivityUser,
  BadgeImage,
  ChallengeBody,
  ChallengeCopy,
  ChallengeCrown,
  ChallengeTitle,
  EmptyState,
  FullWidthAction,
  GoldMeta,
  LeaderboardList,
  LeaderboardName,
  LeaderboardPoints,
  LeaderboardRank,
  LeaderboardRow,
  MomentumLayout,
  MomentumRing,
  MomentumValue,
  MutedTiny,
  RailHeader,
  SceneFrame,
  SoftParagraph,
  TransformationGrid,
} from './HomeTabVisionRightRail.styles';
import HomeTabTrendingPanel from './HomeTabTrendingPanel';
import './HomePhotoLibraryPreview';

const TransformationImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
`;

interface HomeTabVisionRightRailProps {
  progressPercent: number;
  liveActivityItems: HomeLiveActivityItem[];
  liveActivityConnected: boolean;
  activeChallenge: HomeChallengeSummary | null;
  challengeLoading: boolean;
  badges: HomeBadgeItem[];
  leaderboardRows: HomeLeaderboardRow[];
  trendingTags: TrendingTagSummary[];
  trendingLoading: boolean;
  /** Real faction totals (workstream O) — empty renders no panel at all. */
  factions: Faction[];
  /** Real transformation photo URLs from the profile — empty renders a CTA. */
  transformationPhotoUrls: string[];
  /** O3 streak rescue — real signal from logged sessions + the live streak. */
  streakAtRisk: boolean;
  streakDays: number;
  onAction: (target: VisionTarget) => void;
  onLogWorkout: () => void;
  /** Whether the gamification record is known; false hides the momentum ring. */
  gamificationKnown: boolean;
}

function iconForActivity(item: HomeLiveActivityItem): React.ElementType {
  const text = item.action.toLowerCase();
  if (text.includes('challenge')) return Trophy;
  if (text.includes('badge')) return Sparkles;
  if (text.includes('workout')) return Dumbbell;
  if (text.includes('reel')) return Users;
  return Heart;
}

const HomeTabVisionRightRail: React.FC<HomeTabVisionRightRailProps> = ({
  progressPercent,
  gamificationKnown,
  liveActivityItems,
  liveActivityConnected,
  activeChallenge,
  challengeLoading,
  badges,
  leaderboardRows,
  trendingTags,
  trendingLoading,
  factions,
  transformationPhotoUrls,
  streakAtRisk,
  streakDays,
  onAction,
  onLogWorkout,
}) => {
  const challengeButtonTarget: VisionTarget = 'challenges';
  const challengeButtonLabel = activeChallenge
    ? 'Open Challenges'
    : 'Explore Challenges';

  return (
  <RightRail aria-label="Creator observatory widgets">
    <HomeTabNextBestAction
      streakAtRisk={streakAtRisk}
      streakDays={streakDays}
      onLogWorkout={onLogWorkout}
    />

    <Panel>
      <RailHeader>
        <Eyebrow>Live Activity</Eyebrow>
        <Chip $tone={liveActivityConnected ? 'cyan' : 'violet'}>
          {liveActivityConnected ? 'Live' : 'Recent'}
        </Chip>
      </RailHeader>
      {liveActivityItems.length ? (
        <ActivityGrid>
          {liveActivityItems.map((item) => {
            const Icon = iconForActivity(item);
            return (
              <ActivityItem key={item.id}>
                <Chip>
                  <Icon size={13} aria-hidden="true" />
                </Chip>
                <ActivityCopy>
                  <ActivityUser>{item.user}</ActivityUser> {item.action}
                  <MutedTiny>{item.time}</MutedTiny>
                </ActivityCopy>
              </ActivityItem>
            );
          })}
        </ActivityGrid>
      ) : (
        <EmptyState>No community activity has landed yet.</EmptyState>
      )}
    </Panel>

    <Panel $tone="gold">
      <RailHeader>
        <Eyebrow $tone="gold">Active Challenge</Eyebrow>
        <GoldMeta>
          {activeChallenge ? `${activeChallenge.daysLeft}D left` : challengeLoading ? 'Syncing' : 'Ready'}
        </GoldMeta>
      </RailHeader>
      {activeChallenge ? (
        <ChallengeBody>
          <ChallengeCopy>
            <ButtonRow>
              <Chip $tone="gold">
                <Dumbbell size={14} aria-hidden="true" />
              </Chip>
              <ChallengeTitle>{activeChallenge.title}</ChallengeTitle>
            </ButtonRow>
            <SoftParagraph>
              {compactNumber(activeChallenge.participants)} creators are in. Reward: {activeChallenge.reward}.
            </SoftParagraph>
            <Bar>
              <Fill $pct={activeChallenge.progress} $gold />
            </Bar>
          </ChallengeCopy>
          <ChallengeCrown>
            <Chip $tone="gold">
              <Crown size={30} aria-hidden="true" />
            </Chip>
          </ChallengeCrown>
        </ChallengeBody>
      ) : (
        <EmptyState>
          {challengeLoading ? 'Checking the challenge board.' : 'No real active challenge is live yet.'}
        </EmptyState>
      )}
      <FullWidthAction type="button" $variant="accent" onClick={() => onAction(challengeButtonTarget)}>
        {challengeButtonLabel}
      </FullWidthAction>
    </Panel>

    <Panel>
      <RailHeader $spaced>
        <Eyebrow>Badges</Eyebrow>
        <Eyebrow>Leaderboard</Eyebrow>
      </RailHeader>
      {badges.length ? (
        <ButtonRow>
          {badges.map((badge, index) => (
            <Chip key={badge.id} $tone={index === 1 ? 'gold' : index === 2 ? 'violet' : 'cyan'} title={badge.name}>
              {badge.imageUrl ? <BadgeImage src={badge.imageUrl} alt="" aria-hidden="true" /> : badge.icon}
            </Chip>
          ))}
        </ButtonRow>
      ) : (
        <EmptyState>
          {gamificationKnown
            ? 'Earn a badge to fill this showcase.'
            : "We couldn't load your badges just now."}
        </EmptyState>
      )}
      {leaderboardRows.length ? (
        <LeaderboardList>
          {leaderboardRows.map((row, index) => (
            <LeaderboardRow key={row.id}>
              <LeaderboardRank $gold={index === 0}>{index + 1}</LeaderboardRank>
              <LeaderboardName>{row.name}</LeaderboardName>
              <LeaderboardPoints>{compactNumber(row.points)} XP</LeaderboardPoints>
            </LeaderboardRow>
          ))}
        </LeaderboardList>
      ) : (
        <EmptyState>
          {gamificationKnown
            ? 'The leaderboard is still filling up.'
            : "We couldn't load the leaderboard just now."}
        </EmptyState>
      )}
    </Panel>

    {/* Workstream O: the Faction War race moved here from the retired Feed
        tab — renders nothing while no factions exist (honest gate). */}
    <HomeTabFactionPanel factions={factions} />

    <HomeTabTrendingPanel
      trendingTags={trendingTags}
      trendingLoading={trendingLoading}
    />

    {/* `progressPercent` resolves through `?? 0`, so an outage drew a 0% ring
        and labelled it the member's weekly momentum. */}
    {gamificationKnown ? (
    <Panel>
      <RailHeader $spaced>
        <Eyebrow>Weekly Momentum</Eyebrow>
        <Chip>{progressPercent}%</Chip>
      </RailHeader>
      {/* Workstream N2: the fake 7-bar chart is gone — the ring is the real
          level-progress signal; the left rail already owns the streak week. */}
      <MomentumLayout>
        <MomentumRing>
          <svg width="92" height="92" viewBox="0 0 92 92" aria-hidden="true">
            <circle cx="46" cy="46" r="36" stroke="color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent)" strokeWidth="7" fill="none" />
            <circle cx="46" cy="46" r="36" stroke="var(--accent-primary, #60C0F0)" strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray="226" strokeDashoffset={226 * (1 - progressPercent / 100)} transform="rotate(-90 46 46)" />
          </svg>
          <MomentumValue>{progressPercent}%</MomentumValue>
        </MomentumRing>
      </MomentumLayout>
    </Panel>
    ) : null}

    <Panel>
      <Eyebrow>Transformation</Eyebrow>
      {transformationPhotoUrls.length >= 2 ? (
        <TransformationGrid>
          <SceneFrame><TransformationImage src={transformationPhotoUrls[0]} alt="Before" /></SceneFrame>
          <Chip><ArrowRight size={16} aria-hidden="true" /></Chip>
          <SceneFrame><TransformationImage src={transformationPhotoUrls[transformationPhotoUrls.length - 1]} alt="After" /></SceneFrame>
        </TransformationGrid>
      ) : (
        <>
          <EmptyState>Add progress photos to unlock your before/after.</EmptyState>
          <FullWidthAction type="button" $variant="accent" onClick={() => onAction('photos')}>
            Add Photos
          </FullWidthAction>
        </>
      )}
    </Panel>

  </RightRail>
  );
};

export default HomeTabVisionRightRail;
