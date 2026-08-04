/**
 * FILE: ClientDashboardHome.railSections.tsx
 * PURPOSE: Right-rail widgets for the client dashboard Home redesign.
 */

import { Trophy } from 'lucide-react';
import {
  ActionButton,
  CardBody,
  CardTitle,
  Kicker,
  ListStack,
  MutedText,
  PanelCard,
  PanelHeader,
  ProgressFill,
  ProgressTrack,
  RowItem,
  StatusDot,
  TinyText,
} from './ClientDashboardHome.cardStyles';
import { TagGrid, TagPill } from './ClientDashboardHome.feedStyles';
import NextBestActionCard from '../../NextBestAction/NextBestActionCard';
import RecoveryBoardPanel from '../../RecoveryBoard/RecoveryBoardPanel';
import type { ClientDashboardHomeProps } from './ClientDashboardHome.types';

export function ClientRightRail({ activeChallenge, challengeLoading, badges, leaderboardRows, trendingTags, trendingLoading, onTarget, workoutHistorySettled, trainingProof }: Pick<ClientDashboardHomeProps,
  'activeChallenge' | 'challengeLoading' | 'badges' | 'leaderboardRows' | 'trendingTags' | 'trendingLoading' | 'onTarget' | 'workoutHistorySettled' | 'trainingProof'>) {
  // Zero-history clients get orientation, not community noise (panel Q5).
  const zeroHistory = !!workoutHistorySettled && !trainingProof.lastSession;
  return (
    <>
      <PanelCard>
        <PanelHeader><Kicker>Coach compass</Kicker></PanelHeader>
        <CardBody><NextBestActionCard bare hideHeader /></CardBody>
      </PanelCard>
      <PanelCard>
        <PanelHeader><Kicker>Today&apos;s recovery</Kicker></PanelHeader>
        <CardBody><RecoveryBoardPanel /></CardBody>
      </PanelCard>
      <RailChallenge activeChallenge={activeChallenge} challengeLoading={challengeLoading} onTarget={onTarget} />
      <RailList
        title="Recent unlocks"
        empty="No recent unlocks yet."
        items={badges.map((badge) => [badge.name, badge.icon])}
      />
      <RailList
        title="Community rank"
        empty="Leaderboard is not populated yet."
        items={leaderboardRows.map((row, index) => [`${index + 1}. ${row.name}`, row.points.toLocaleString()])}
      />
      {/* Real tags or nothing — a fabricated fallback tag is mock-data-as-truth
          (doctrine violation) and would show SwanStudios branding to
          white-labeled clients. Empty/error → the whole card hides. Also
          hidden for zero-history clients (community context comes after the
          first logged session). */}
      {!zeroHistory && (trendingLoading || trendingTags.length > 0) && (
        <PanelCard>
          <PanelHeader><Kicker>Trending tags</Kicker>{trendingLoading && <TinyText>Loading</TinyText>}</PanelHeader>
          <TagGrid>{trendingTags.map((tag) => <TagPill key={tag.name}>#{tag.name}</TagPill>)}</TagGrid>
        </PanelCard>
      )}
    </>
  );
}

function RailChallenge({ activeChallenge, challengeLoading, onTarget }: Pick<ClientDashboardHomeProps,
  'activeChallenge' | 'challengeLoading' | 'onTarget'>) {
  const progress = activeChallenge?.progress ?? 0;
  return (
    <PanelCard>
      <PanelHeader>
        <Kicker><Trophy size={13} /> Active challenge</Kicker>
        {challengeLoading && <TinyText>Loading</TinyText>}
      </PanelHeader>
      <CardBody>
        <CardTitle>{activeChallenge?.title || 'No active challenge'}</CardTitle>
        <MutedText>{activeChallenge?.reward || 'Join a challenge to start earning rewards.'}</MutedText>
        <ProgressTrack role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <ProgressFill $pct={progress} />
        </ProgressTrack>
        <ActionButton type="button" onClick={() => onTarget('challenges')}>View Challenges</ActionButton>
      </CardBody>
    </PanelCard>
  );
}

function RailList({ title, items, empty }: { title: string; items: string[][]; empty: string }) {
  return (
    <PanelCard>
      <PanelHeader><Kicker>{title}</Kicker></PanelHeader>
      <CardBody>
        <ListStack>
          {(items.length ? items : [[empty, '']]).map(([left, right]) => (
            <RowItem key={left}>
              <StatusDot />
              <span>{left}</span>
              <TinyText>{right}</TinyText>
            </RowItem>
          ))}
        </ListStack>
      </CardBody>
    </PanelCard>
  );
}
