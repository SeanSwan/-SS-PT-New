/**
 * FILE: ClientDashboardHome.railSections.tsx
 * PURPOSE: Right-rail widgets for the client dashboard Home redesign.
 */
import React from 'react';
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
import type { ClientDashboardHomeProps } from './ClientDashboardHome.types';

export function ClientRightRail({ activeChallenge, challengeLoading, badges, leaderboardRows, trendingTags, trendingLoading, onTarget }: Pick<ClientDashboardHomeProps,
  'activeChallenge' | 'challengeLoading' | 'badges' | 'leaderboardRows' | 'trendingTags' | 'trendingLoading' | 'onTarget'>) {
  return (
    <>
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
      <PanelCard>
        <PanelHeader><Kicker>Trending tags</Kicker>{trendingLoading && <TinyText>Loading</TinyText>}</PanelHeader>
        <TagGrid>{(trendingTags.length ? trendingTags : [{ name: 'SwanStudios', count: 0 }]).map((tag) => <TagPill key={tag.name}>#{tag.name}</TagPill>)}</TagGrid>
      </PanelCard>
    </>
  );
}

const formatCount = (value: number): string => Math.max(0, Math.round(value)).toLocaleString();

const formatDaysLeft = (daysLeft: number): string => {
  const safeDaysLeft = Math.max(0, Math.round(daysLeft));
  if (safeDaysLeft === 0) return 'Today';
  if (safeDaysLeft === 1) return '1 day left';
  return `${formatCount(safeDaysLeft)} days left`;
};

const buildChallengeMetaRows = (activeChallenge: ClientDashboardHomeProps['activeChallenge']): string[] => {
  if (!activeChallenge) return [];

  const rows: string[] = [];
  const participantCount = Math.max(0, Math.round(activeChallenge.participants));
  const checkInsCount = Math.max(0, Math.round(activeChallenge.checkInsCount ?? 0));

  if (activeChallenge.impactLabel) rows.push(activeChallenge.impactLabel);

  const progressParts = [
    activeChallenge.progressLabel ? `Progress: ${activeChallenge.progressLabel}` : '',
    checkInsCount > 0 ? `${formatCount(checkInsCount)} ${checkInsCount === 1 ? 'check-in' : 'check-ins'}` : '',
  ].filter(Boolean);
  if (progressParts.length) rows.push(progressParts.join(' | '));

  const communityParts = [
    `${formatCount(participantCount)} ${participantCount === 1 ? 'participant in' : 'participants in'}`,
    formatDaysLeft(activeChallenge.daysLeft),
    activeChallenge.reward ? `Reward: ${activeChallenge.reward}` : '',
  ].filter(Boolean);
  if (communityParts.length) rows.push(communityParts.join(' | '));

  return rows;
};

function RailChallenge({ activeChallenge, challengeLoading, onTarget }: Pick<ClientDashboardHomeProps,
  'activeChallenge' | 'challengeLoading' | 'onTarget'>) {
  const progress = activeChallenge?.progress ?? 0;
  const challengeTitle = activeChallenge?.title || 'No active challenge';
  const challengeCopy = activeChallenge?.nextAction || activeChallenge?.reward || 'Join a challenge to start earning rewards.';
  const challengeCopyLabel = activeChallenge?.nextAction ? 'Next action' : activeChallenge ? 'Reward' : 'Next action';
  const challengeMetaRows = buildChallengeMetaRows(activeChallenge);
  const ctaLabel = activeChallenge ? 'Open Challenge Board' : 'Explore Challenges';
  const ctaAriaLabel = activeChallenge ? `Open challenge board for ${activeChallenge.title}` : 'Explore the challenge board';

  return (
    <PanelCard>
      <PanelHeader>
        <Kicker><Trophy size={13} /> Active challenge</Kicker>
        {challengeLoading && <TinyText>Loading</TinyText>}
      </PanelHeader>
      <CardBody>
        <CardTitle>{challengeTitle}</CardTitle>
        <TinyText>{challengeCopyLabel}</TinyText>
        <MutedText>{challengeCopy}</MutedText>
        {challengeMetaRows.map((row) => <TinyText key={row}>{row}</TinyText>)}
        <ProgressTrack aria-label={`${challengeTitle} progress`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <ProgressFill $pct={progress} />
        </ProgressTrack>
        <ActionButton type="button" aria-label={ctaAriaLabel} onClick={() => onTarget('challenges')}>{ctaLabel}</ActionButton>
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
