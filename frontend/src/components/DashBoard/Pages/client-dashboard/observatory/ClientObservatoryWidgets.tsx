/**
 * FILE: ClientObservatoryWidgets.tsx
 * PURPOSE: Right-rail widgets and mobile action dock for the client overview.
 */

import React from 'react';
import { Award, Calendar, Flame, Hash, Trophy, Users } from 'lucide-react';
import {
  ChallengePreview,
  LeaderboardPreview,
  type QuickAction,
  clampPercent,
  compactNumber,
  iconLabel,
} from './ClientObservatoryData';
import ClientCurrentWorkoutCard from './ClientCurrentWorkoutCard';
import ClientTrainingPlanVaultCard from './ClientTrainingPlanVaultCard';
import type {
  ClientTrainingPlanSlot,
  ClientTrainingPlanVault,
  CurrentClientWorkout,
} from './useCurrentClientWorkout';
import {
  CardInner,
  GhostButton,
  MobileDock,
  MutedText,
  ProgressFill,
  ProgressTrack,
  SectionKicker,
  SectionTitle,
} from './ClientObservatoryShell.styles';
import {
  SmallButton,
  WidgetCard,
  WidgetHeader,
  WidgetLabel,
  WidgetList,
  WidgetRow,
  WidgetValue,
} from './ClientObservatoryFeed.styles';

interface AchievementPreview {
  id?: string | number;
  progress?: number;
  isCompleted?: boolean;
  achievement?: {
    name?: string;
    title?: string;
    icon?: string;
    iconEmoji?: string;
    pointValue?: number;
    xpReward?: number;
  };
}

interface ClientObservatoryWidgetsProps {
  achievements: AchievementPreview[];
  challenge?: ChallengePreview;
  currentWorkout?: CurrentClientWorkout | null;
  planVault?: ClientTrainingPlanVault | null;
  currentWorkoutError?: boolean;
  currentWorkoutLoading?: boolean;
  canBookSessions: boolean;
  leaderboard: LeaderboardPreview[];
  progress: number;
  quickActions: QuickAction[];
  streakDays: number;
  tags: string[];
  onNavigate: (path: string) => void;
  onViewPlanPdf: (slot: ClientTrainingPlanSlot) => void;
}

function challengeProgress(challenge?: ChallengePreview): number {
  if (!challenge) return 0;
  if (typeof challenge.progress === 'number') return clampPercent(challenge.progress);
  if (typeof challenge.currentProgress === 'number' && typeof challenge.target === 'number' && challenge.target > 0) {
    return clampPercent((challenge.currentProgress / challenge.target) * 100);
  }
  return 0;
}

function leaderName(entry: LeaderboardPreview): string {
  const first = entry.client?.firstName;
  const last = entry.client?.lastName;
  const username = entry.client?.username;
  return [first, last].filter(Boolean).join(' ') || username || 'Athlete';
}

const ClientObservatoryWidgets: React.FC<ClientObservatoryWidgetsProps> = ({
  achievements,
  challenge,
  currentWorkout,
  planVault,
  currentWorkoutError,
  currentWorkoutLoading,
  canBookSessions,
  leaderboard,
  progress,
  quickActions,
  streakDays,
  tags,
  onNavigate,
  onViewPlanPdf,
}) => {
  const challengePct = challengeProgress(challenge);
  const challengeTitle = challenge?.title || challenge?.name || 'No active challenge yet';

  return (
    <>
      <ClientCurrentWorkoutCard
        currentWorkout={currentWorkout}
        currentWorkoutError={currentWorkoutError}
        currentWorkoutLoading={currentWorkoutLoading}
        onNavigate={onNavigate}
      />

      <ClientTrainingPlanVaultCard
        planVault={planVault}
        currentWorkout={currentWorkout}
        loading={currentWorkoutLoading}
        error={currentWorkoutError}
        canLogToday={currentWorkout?.isLoggable === true}
        onNavigate={onNavigate}
        onViewPdf={onViewPlanPdf}
      />

      {canBookSessions && (
        <WidgetCard data-testid="next-session-card">
          <CardInner>
            <WidgetHeader>
              <div>
                <SectionKicker>
                  <Calendar size={14} aria-hidden="true" />
                  Next Session
                </SectionKicker>
                <SectionTitle>Not booked yet</SectionTitle>
              </div>
              <SmallButton
                type="button"
                aria-label="Book a session"
                onClick={() => onNavigate('/dashboard/client/schedule')}
              >
                Book
              </SmallButton>
            </WidgetHeader>
            <MutedText>Not booked yet. Tap below to schedule your next training session.</MutedText>
          </CardInner>
        </WidgetCard>
      )}

      <WidgetCard>
        <CardInner>
          <WidgetHeader>
            <div>
              <SectionKicker>
                <Trophy size={14} aria-hidden="true" />
                Active Challenge
              </SectionKicker>
              <SectionTitle>{challengeTitle}</SectionTitle>
            </div>
            <WidgetValue>{challengePct}%</WidgetValue>
          </WidgetHeader>
          <ProgressTrack role="progressbar" aria-label="Challenge progress" aria-valuenow={challengePct} aria-valuemin={0} aria-valuemax={100}>
            <ProgressFill $pct={challengePct} />
          </ProgressTrack>
          <MutedText $top="0.75rem">
            {challenge?.description || 'Join a community challenge when you are ready to compete.'}
          </MutedText>
        </CardInner>
      </WidgetCard>

      <WidgetCard>
        <CardInner>
          <WidgetHeader>
            <div>
              <SectionKicker>
                <Flame size={14} aria-hidden="true" />
                Momentum
              </SectionKicker>
              <SectionTitle>{streakDays} day streak</SectionTitle>
            </div>
            <WidgetValue>{progress}%</WidgetValue>
          </WidgetHeader>
          <ProgressTrack role="progressbar" aria-label="Level progress" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <ProgressFill $pct={progress} />
          </ProgressTrack>
        </CardInner>
      </WidgetCard>

      <WidgetCard>
        <CardInner>
          <WidgetHeader>
            <div>
              <SectionKicker>
                <Award size={14} aria-hidden="true" />
                Badges
              </SectionKicker>
              <SectionTitle>Recent unlocks</SectionTitle>
            </div>
            <GhostButton type="button" onClick={() => onNavigate('/dashboard/client/rewards')}>
              Rewards
            </GhostButton>
          </WidgetHeader>
          <WidgetList>
            {achievements.slice(0, 3).map((item, index) => (
              <WidgetRow key={item.id || index}>
                <WidgetLabel>{item.achievement?.name || item.achievement?.title || 'Achievement'}</WidgetLabel>
                <WidgetValue>{iconLabel(item.achievement?.icon || item.achievement?.iconEmoji)}</WidgetValue>
              </WidgetRow>
            ))}
            {achievements.length === 0 && (
              <WidgetRow>
                <WidgetLabel>Complete workouts to unlock badges</WidgetLabel>
                <WidgetValue>0</WidgetValue>
              </WidgetRow>
            )}
          </WidgetList>
        </CardInner>
      </WidgetCard>

      <WidgetCard>
        <CardInner>
          <WidgetHeader>
            <div>
              <SectionKicker>
                <Users size={14} aria-hidden="true" />
                Leaderboard
              </SectionKicker>
              <SectionTitle>Community rank</SectionTitle>
            </div>
          </WidgetHeader>
          <WidgetList>
            {leaderboard.slice(0, 3).map((entry, index) => (
              <WidgetRow key={entry.userId || index}>
                <WidgetLabel>{index + 1}. {leaderName(entry)}</WidgetLabel>
                <WidgetValue>{compactNumber(entry.points || entry.overallLevel || entry.level || 0)}</WidgetValue>
              </WidgetRow>
            ))}
            {leaderboard.length === 0 && (
              <WidgetRow>
                <WidgetLabel>No leaderboard entries yet</WidgetLabel>
                <WidgetValue>--</WidgetValue>
              </WidgetRow>
            )}
          </WidgetList>
        </CardInner>
      </WidgetCard>

      <WidgetCard>
        <CardInner>
          <WidgetHeader>
            <div>
              <SectionKicker>
                <Hash size={14} aria-hidden="true" />
                Trending
              </SectionKicker>
              <SectionTitle>Feed tags</SectionTitle>
            </div>
          </WidgetHeader>
          <WidgetList>
            {(tags.length ? tags : ['No tags yet']).map((tag) => (
              <WidgetRow key={tag}>
                <WidgetLabel>{tag}</WidgetLabel>
                <WidgetValue>{tag.startsWith('#') ? 'tag' : '--'}</WidgetValue>
              </WidgetRow>
            ))}
          </WidgetList>
        </CardInner>
      </WidgetCard>

      <MobileDock aria-label="Mobile dashboard actions">
        {quickActions.map(({ label, Icon, path }) => (
          <SmallButton key={path} type="button" onClick={() => onNavigate(path)} aria-label={label}>
            <Icon size={16} aria-hidden="true" />
          </SmallButton>
        ))}
      </MobileDock>
    </>
  );
};

export default ClientObservatoryWidgets;
