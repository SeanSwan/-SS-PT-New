/**
 * COMPONENT: ClientProgressDashboardPage.cards
 * OWNER: Client Dashboard / Progress
 * PURPOSE: Extracted presentational cards (weekly recap + personal records)
 *          for the canonical progress page — keeps the page under the
 *          300-line cap (Rule 4) without changing behavior or data flow.
 * DATA: pure props from ClientProgressDashboardPage; no fetching here.
 */

import React from 'react';
import styled from 'styled-components';
import { Calendar, Trophy } from 'lucide-react';
import ErrorCard from '../../../ui/ErrorCard';
import {
  Card,
  CardTitle,
  RecapEmptyState,
  RecapGrid,
  RecapItem,
  RecapLabel,
  RecapValue,
  Skeleton,
  StatCard,
  StatLabel,
  StatsStrip,
  StatSub,
  StatValue,
} from './ClientProgressDashboardPage.styles';
import type { PersonalRecordView } from './ClientProgressDashboardPage.records';

interface WeeklyRecapCardProps {
  hasRecap: boolean;
  settled: boolean;
  /** The fetch FAILED. Distinct from "settled with no recap" — a failure must
   *  never render as an empty week (Blueprint v2 S3 / D2). */
  error?: boolean;
  onRetry?: () => void;
  weekWorkouts: number;
  weekBonuses: number;
  weekXp: number;
  streakDays: number;
}

export const WeeklyRecapCard: React.FC<WeeklyRecapCardProps> = ({
  hasRecap,
  settled,
  error = false,
  onRetry,
  weekWorkouts,
  weekBonuses,
  weekXp,
  streakDays,
}) => (
  <Card>
    <CardTitle><Calendar size={16} /> This Week</CardTitle>
    {error ? (
      <ErrorCard
        message="We couldn't load this week's recap."
        onRetry={onRetry}
        testId="recap-error"
      />
    ) : hasRecap ? (
      <RecapGrid>
        <RecapItem>
          <RecapValue>{weekWorkouts}</RecapValue>
          <RecapLabel>Workouts</RecapLabel>
        </RecapItem>
        <RecapItem>
          <RecapValue>{weekBonuses}</RecapValue>
          <RecapLabel>Bonuses</RecapLabel>
        </RecapItem>
        <RecapItem>
          <RecapValue>{weekXp}</RecapValue>
          <RecapLabel>XP Earned</RecapLabel>
        </RecapItem>
        <RecapItem>
          <RecapValue>{streakDays}</RecapValue>
          <RecapLabel>Streak Days</RecapLabel>
        </RecapItem>
      </RecapGrid>
    ) : settled ? (
      <RecapEmptyState
        role="status"
        aria-live="polite"
        aria-label="Weekly recap unavailable"
      >
        No weekly recap available yet.
      </RecapEmptyState>
    ) : (
      <RecapGrid>
        {[1, 2, 3, 4].map(i => (
          <RecapItem key={i}>
            <Skeleton $h="28px" $w="60px" />
            <Skeleton $h="10px" $w="50px" />
          </RecapItem>
        ))}
      </RecapGrid>
    )}
  </Card>
);

/* Colocated here: the main styles sheet sits at its 300-line cap (Rule 4).
   Dual-Button Glow: blue gradient bg -> purple hover glow. */
const FirstWorkoutButton = styled.button`
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 1.15rem;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  background: linear-gradient(135deg,
    var(--surface-primary, #002060),
    color-mix(in srgb, var(--surface-primary, #002060) 60%, var(--accent-primary, #60C0F0)));
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;

  &:hover {
    box-shadow: 0 0 18px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 55%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

/**
 * Slice 13 — first-workout CTA for brand-new clients (zero logged history).
 * Rendered only when the account has no PRs AND no workouts this week AND
 * the Guardian Coach Compass is not present to carry the nudge (Slice 8.2
 * already tells entitled users to log their first workout).
 */
export const FirstWorkoutCta: React.FC<{ onLog: () => void }> = ({ onLog }) => (
  <Card $bottom="1.25rem" data-testid="first-workout-cta">
    <CardTitle>Start your progress story</CardTitle>
    <RecapEmptyState as="p" role="note">
      Everything on this page comes alive from real workouts. Log your first
      session and your charts, streaks, and records start building today.
    </RecapEmptyState>
    <FirstWorkoutButton type="button" onClick={onLog}>
      Log your first workout
    </FirstWorkoutButton>
  </Card>
);

export const PersonalRecordsCard: React.FC<{ records: PersonalRecordView[] }> = ({ records }) => (
  <Card $bottom="1.25rem">
    <CardTitle><Trophy size={16} /> Personal Records</CardTitle>
    <StatsStrip $bottom="0">
      {records.slice(0, 4).map((pr: PersonalRecordView, i: number) => (
        <StatCard key={pr.key} $delay={i} $accent="var(--accent-gold, #C6A84B)">
          <StatLabel>{pr.exerciseName}</StatLabel>
          <StatValue $color="var(--accent-gold, #C6A84B)">
            {pr.valueText}
          </StatValue>
          <StatSub>{pr.detailText}</StatSub>
        </StatCard>
      ))}
    </StatsStrip>
  </Card>
);
