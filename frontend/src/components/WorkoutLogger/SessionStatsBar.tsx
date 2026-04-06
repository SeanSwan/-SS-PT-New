/**
 * ┌─── SUB-COMPONENT: SessionStatsBar ────────────────────────┐
 * │ PARENT: WorkoutLogger                                       │
 * │ PURPOSE: Sticky bar showing live session stats —             │
 * │ volume, completed sets, estimated calories.                  │
 * │ WIREFRAME:                                                  │
 * │ ┌────────────────────────────────────────────────────────┐  │
 * │ │ Volume: 12,450 lbs │ Sets: 18/24 │ ~185 cal           │  │
 * │ └────────────────────────────────────────────────────────┘  │
 * │ Props: { stats }                                            │
 * └─────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import styled from 'styled-components';
import { Activity, Dumbbell, Flame } from 'lucide-react';
import { CS, withAlpha, reducedMotionSafe } from './WorkoutLoggerCS';
import type { SessionStats } from './useSessionStats';

interface SessionStatsBarProps {
  stats: SessionStats;
}

const SessionStatsBar: React.FC<SessionStatsBarProps> = React.memo(({ stats }) => {
  if (stats.totalSets === 0) return null;

  return (
    <StatsContainer role="status" aria-label="Session statistics">
      <StatItem>
        <Activity size={14} />
        <StatLabel>Volume</StatLabel>
        <StatValue>{stats.formattedVolume}</StatValue>
      </StatItem>

      <Divider />

      <StatItem>
        <Dumbbell size={14} />
        <StatLabel>Sets</StatLabel>
        <StatValue>
          {stats.completedSets}
          <StatMuted>/{stats.totalSets}</StatMuted>
        </StatValue>
      </StatItem>

      <Divider />

      <StatItem>
        <Flame size={14} />
        <StatLabel>Est. Cal</StatLabel>
        <StatValue>~{stats.estimatedCalories}</StatValue>
      </StatItem>
    </StatsContainer>
  );
});

SessionStatsBar.displayName = 'SessionStatsBar';
export default SessionStatsBar;

// ── Styled Components ──

const StatsContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
  margin-bottom: 1.5rem;
  background: ${withAlpha(CS.cardDark, 0.9)};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid ${CS.glassBorder};
  border-radius: 1rem;
  position: sticky;
  top: 0.5rem;
  z-index: 20;

  ${reducedMotionSafe}

  @media (max-width: 430px) {
    gap: 0.5rem;
    padding: 0.625rem 0.75rem;
    flex-wrap: wrap;
  }
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;

  svg {
    color: ${CS.gaming};
    flex-shrink: 0;
  }
`;

const StatLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${CS.textMuted};

  @media (max-width: 430px) {
    display: none;
  }
`;

const StatValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  font-weight: 700;
  color: ${CS.text};
  font-variant-numeric: tabular-nums;
`;

const StatMuted = styled.span`
  color: ${CS.textMuted};
  font-weight: 400;
`;

const Divider = styled.div`
  width: 1px;
  height: 1.25rem;
  background: ${CS.glassBorder};
`;
