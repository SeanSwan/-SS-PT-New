/**
 * COMPONENT: ClientProgressDashboardPage.cards
 * OWNER: Client Dashboard / Progress
 * PURPOSE: Extracted presentational cards (weekly recap + personal records)
 *          for the canonical progress page — keeps the page under the
 *          300-line cap (Rule 4) without changing behavior or data flow.
 * DATA: pure props from ClientProgressDashboardPage; no fetching here.
 */

import React from 'react';
import { Calendar, Trophy } from 'lucide-react';
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
  weekWorkouts: number;
  weekBonuses: number;
  weekXp: number;
  streakDays: number;
}

export const WeeklyRecapCard: React.FC<WeeklyRecapCardProps> = ({
  hasRecap,
  settled,
  weekWorkouts,
  weekBonuses,
  weekXp,
  streakDays,
}) => (
  <Card>
    <CardTitle><Calendar size={16} /> This Week</CardTitle>
    {hasRecap ? (
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
