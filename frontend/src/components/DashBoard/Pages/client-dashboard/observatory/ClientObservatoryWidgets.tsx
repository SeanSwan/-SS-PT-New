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
} from './ClientObservatoryData';
import ClientCurrentWorkoutCard from './ClientCurrentWorkoutCard';
import ClientTrainingPlanVaultCard from './ClientTrainingPlanVaultCard';
import {
  normalizeAchievementRows,
  normalizeChallengeWidget,
  normalizeLeaderboardRows,
  normalizeTagRows,
  type AchievementPreview,
} from './ClientObservatoryWidgets.preview';
import type {
  ClientTrainingPlanSlot,
  ClientTrainingPlanVault,
  CurrentClientWorkout,
} from './useCurrentClientWorkout';
import {
  CardInner,
  DesktopWidgetOnly,
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
  showCurrentWorkoutCard?: boolean;
  streakDays: number;
  tags: string[];
  onNavigate: (path: string) => void;
  onViewPlanPdf: (slot: ClientTrainingPlanSlot) => void;
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
  showCurrentWorkoutCard = true,
  streakDays,
  tags,
  onNavigate,
  onViewPlanPdf,
}) => {
  const challengeWidget = normalizeChallengeWidget(challenge);
  const achievementRows = normalizeAchievementRows(achievements);
  const leaderboardRows = normalizeLeaderboardRows(leaderboard);
  const tagRows = normalizeTagRows(tags);

  return (
    <>
      {showCurrentWorkoutCard && (
        <DesktopWidgetOnly>
          <ClientCurrentWorkoutCard
            currentWorkout={currentWorkout}
            currentWorkoutError={currentWorkoutError}
            currentWorkoutLoading={currentWorkoutLoading}
            onNavigate={onNavigate}
          />
        </DesktopWidgetOnly>
      )}

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
              <SectionTitle>{challengeWidget.title}</SectionTitle>
            </div>
            <WidgetValue>{challengeWidget.progress}%</WidgetValue>
          </WidgetHeader>
          <ProgressTrack role="progressbar" aria-label="Challenge progress" aria-valuenow={challengeWidget.progress} aria-valuemin={0} aria-valuemax={100}>
            <ProgressFill $pct={challengeWidget.progress} />
          </ProgressTrack>
          <MutedText $top="0.75rem">
            {challengeWidget.description}
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
            {achievementRows.map((item) => (
              <WidgetRow key={item.key}>
                <WidgetLabel>{item.label}</WidgetLabel>
                <WidgetValue>{item.value}</WidgetValue>
              </WidgetRow>
            ))}
            {achievementRows.length === 0 && (
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
            {leaderboardRows.map((entry) => (
              <WidgetRow key={entry.key}>
                <WidgetLabel>{entry.label}</WidgetLabel>
                <WidgetValue>{entry.value}</WidgetValue>
              </WidgetRow>
            ))}
            {leaderboardRows.length === 0 && (
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
            {tagRows.map((tag) => (
              <WidgetRow key={tag.key}>
                <WidgetLabel>{tag.label}</WidgetLabel>
                <WidgetValue>{tag.value}</WidgetValue>
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
