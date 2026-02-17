import React, { useState } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Trophy, Info } from 'lucide-react';

import {
  StyledCard,
  CardHeader,
  CardTitle,
  CardContent,
  LevelBadge,
  LevelInfo,
  LevelName,
  LevelDescription,
  LevelProgress,
  NextLevelContainer,
  StyledLinearProgress,
  StatsGrid,
  StatCard,
  StatValue,
  StatLabel,
  HeatmapContainer,
  HeatmapDay,
  itemVariants
} from '../styled-components';

import { ProgressLevel, UserStats, ActivitySummary } from '../../types';

const InfoButton = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  border-radius: 50%;
  min-height: 44px;
  min-width: 44px;
  justify-content: center;
  position: relative;

  &:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
  }
`;

const TooltipWrapper = styled.div`
  position: relative;
  display: inline-flex;
`;

const TooltipPopup = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  background: rgba(20, 20, 40, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 8px 12px;
  min-width: 200px;
  z-index: 100;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  pointer-events: none;
`;

const FlexRow = styled.div`
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const SectionLabel = styled.p`
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 8px;
`;

const HeatmapTooltipWrapper = styled.div`
  position: relative;
  display: inline-flex;
`;

interface OverallProgressCardProps {
  overallLevel: ProgressLevel;
  userStats: UserStats;
  activitySummary: ActivitySummary[];
}

/**
 * Card component displaying overall fitness progress, level, stats and activity heatmap
 */
const OverallProgressCard: React.FC<OverallProgressCardProps> = ({
  overallLevel,
  userStats,
  activitySummary
}) => {
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const overallProgressPercentage = Math.floor((overallLevel.progress / overallLevel.totalNeeded) * 100);

  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  return (
    <StyledCard component={motion.div} variants={itemVariants}>
      <CardHeader>
        <CardTitle>
          <Trophy size={22} />
          Overall Progress
        </CardTitle>
        <TooltipWrapper
          onMouseEnter={() => setShowInfoTooltip(true)}
          onMouseLeave={() => setShowInfoTooltip(false)}
        >
          <InfoButton aria-label="Progress info">
            <Info size={18} />
          </InfoButton>
          {showInfoTooltip && (
            <TooltipPopup>
              Based on your cumulative progress across all exercise categories
            </TooltipPopup>
          )}
        </TooltipWrapper>
      </CardHeader>
      <CardContent>
        <FlexRow>
          <LevelBadge level={overallLevel.level}>
            {overallLevel.level}
            <span>LEVEL</span>
          </LevelBadge>
          <LevelInfo>
            <LevelName>{overallLevel.name}</LevelName>
            <LevelDescription>{overallLevel.description}</LevelDescription>
            <LevelProgress>
              <StyledLinearProgress
                variant="determinate"
                value={overallProgressPercentage}
                color="primary"
              />
              <NextLevelContainer>
                <span>{overallLevel.progress} / {overallLevel.totalNeeded} XP</span>
                <span>Next Level: {overallLevel.level + 1}</span>
              </NextLevelContainer>
            </LevelProgress>
          </LevelInfo>
        </FlexRow>

        {/* Quick Stats */}
        <StatsGrid>
          <StatCard color="primary">
            <StatValue color="primary">{userStats.workoutsCompleted}</StatValue>
            <StatLabel>Workouts</StatLabel>
          </StatCard>
          <StatCard color="success">
            <StatValue color="success">{userStats.streakDays}</StatValue>
            <StatLabel>Day Streak</StatLabel>
          </StatCard>
          <StatCard color="info">
            <StatValue color="info">{userStats.totalExercisesPerformed}</StatValue>
            <StatLabel>Exercises</StatLabel>
          </StatCard>
          <StatCard color="warning">
            <StatValue color="warning">{userStats.totalMinutes}</StatValue>
            <StatLabel>Minutes</StatLabel>
          </StatCard>
        </StatsGrid>

        {/* Activity Heatmap - Last 30 Days */}
        <div style={{ marginTop: 24 }}>
          <SectionLabel>Activity - Last 30 Days</SectionLabel>
          <HeatmapContainer>
            {activitySummary.map((day) => (
              <HeatmapDay
                key={day.date}
                intensity={day.intensity}
                title={
                  day.workouts > 0
                    ? `${formatDate(day.date)}: ${day.workouts} workout${day.workouts > 1 ? 's' : ''}, ${day.exercises} exercise${day.exercises > 1 ? 's' : ''}, ${day.duration} min`
                    : `${formatDate(day.date)}: No activity`
                }
              />
            ))}
          </HeatmapContainer>
        </div>
      </CardContent>
    </StyledCard>
  );
};

export default OverallProgressCard;
