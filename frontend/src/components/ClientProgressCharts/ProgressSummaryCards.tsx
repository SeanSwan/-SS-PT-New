/**
 * ProgressSummaryCards.tsx
 * =======================
 * Summary metric cards displayed above progress charts.
 * Shows: Total Workouts, Current Streak, Strongest Lift, Most Improved,
 *        Avg Form Score, Weight Change, Weekly Frequency, Goal Progress
 *
 * Crystalline Swan themed with animated counters.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  Dumbbell, Flame, Trophy, TrendingUp,
  Target, Scale, Calendar, Award,
} from 'lucide-react';

// ==================== TYPES ====================

interface ProgressSummary {
  totalWorkouts: number;
  currentStreak: number;
  bestStreak?: number;
  strongestLift?: { exercise: string; max: number };
  mostImproved?: { exercise: string; improvement: number };
  averageFormScore?: number;
  weightChange?: number;
  weeklyAverage?: number;
  goalProgress?: number;
}

interface ProgressSummaryCardsProps {
  summary: ProgressSummary | null;
}

// ==================== STYLED COMPONENTS ====================

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const SummaryCard = styled(motion.div)<{ $accentColor: string }>`
  background: linear-gradient(
    135deg,
    rgba(0, 32, 96, 0.9) 0%,
    rgba(0, 48, 128, 0.8) 100%
  );
  border: 1px solid ${p => p.$accentColor}33;
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  min-height: 90px;
  transition: all 0.3s ease;

  &:hover {
    border-color: ${p => p.$accentColor}66;
    box-shadow: 0 8px 24px ${p => p.$accentColor}1A;
    transform: translateY(-2px);
  }
`;

const IconBox = styled.div<{ $bg: string }>`
  width: 48px;
  height: 48px;
  min-width: 48px;
  border-radius: 12px;
  background: ${p => p.$bg}1A;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${p => p.$bg};
`;

const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const CardValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 1.5rem;
  font-weight: 700;
  color: #E0ECF4;
  line-height: 1;
`;

const CardLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 500;
  color: #b8c9db;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const CardSublabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  color: rgba(184, 201, 219, 0.6);
`;

// ==================== COMPONENT ====================

const ProgressSummaryCards: React.FC<ProgressSummaryCardsProps> = ({ summary }) => {
  const cards = useMemo(() => {
    if (!summary) return [];

    return [
      {
        icon: <Dumbbell size={22} />,
        value: `${summary.totalWorkouts}`,
        label: 'Total Workouts',
        sublabel: summary.weeklyAverage ? `${summary.weeklyAverage.toFixed(1)}/week avg` : undefined,
        color: '#60C0F0',
      },
      {
        icon: <Flame size={22} />,
        value: `${summary.currentStreak}d`,
        label: 'Current Streak',
        sublabel: summary.bestStreak ? `Best: ${summary.bestStreak}d` : undefined,
        color: '#C6A84B',
      },
      {
        icon: <Trophy size={22} />,
        value: summary.strongestLift ? `${summary.strongestLift.max}` : '--',
        label: summary.strongestLift ? summary.strongestLift.exercise : 'Strongest Lift',
        sublabel: summary.strongestLift ? 'lbs (est. 1RM)' : 'No data yet',
        color: '#8B5CF6',
      },
      {
        icon: <TrendingUp size={22} />,
        value: summary.mostImproved ? `+${summary.mostImproved.improvement}%` : '--',
        label: summary.mostImproved ? summary.mostImproved.exercise : 'Most Improved',
        sublabel: 'vs. previous period',
        color: '#50A0F0',
      },
      {
        icon: <Target size={22} />,
        value: summary.averageFormScore != null ? `${summary.averageFormScore.toFixed(0)}` : '--',
        label: 'Avg Form Score',
        sublabel: 'out of 100',
        color: '#60C0F0',
      },
      {
        icon: <Scale size={22} />,
        value: summary.weightChange != null
          ? `${summary.weightChange > 0 ? '+' : ''}${summary.weightChange.toFixed(1)}`
          : '--',
        label: 'Weight Change',
        sublabel: 'lbs this month',
        color: summary.weightChange && summary.weightChange < 0 ? '#C6A84B' : '#60C0F0',
      },
      {
        icon: <Calendar size={22} />,
        value: summary.weeklyAverage != null ? `${summary.weeklyAverage.toFixed(1)}` : '--',
        label: 'Weekly Avg',
        sublabel: 'sessions/week',
        color: '#8B5CF6',
      },
      {
        icon: <Award size={22} />,
        value: summary.goalProgress != null ? `${summary.goalProgress}%` : '--',
        label: 'Goal Progress',
        sublabel: 'primary goal',
        color: '#C6A84B',
      },
    ];
  }, [summary]);

  if (!summary || cards.length === 0) return null;

  return (
    <CardsGrid>
      {cards.map((card, i) => (
        <SummaryCard
          key={card.label}
          $accentColor={card.color}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
        >
          <IconBox $bg={card.color}>{card.icon}</IconBox>
          <CardContent>
            <CardValue>{card.value}</CardValue>
            <CardLabel>{card.label}</CardLabel>
            {card.sublabel && <CardSublabel>{card.sublabel}</CardSublabel>}
          </CardContent>
        </SummaryCard>
      ))}
    </CardsGrid>
  );
};

export default ProgressSummaryCards;
