import React from 'react';
import { motion } from 'framer-motion';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
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
  // Calculate progress percentage for next level
  const overallProgressPercentage = Math.floor((overallLevel.progress / overallLevel.totalNeeded) * 100);
  
  // Format date for display (used in tooltip)
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
        <Tooltip title="Based on your cumulative progress across all exercise categories">
          <IconButton size="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            <Info size={18} />
          </IconButton>
        </Tooltip>
      </CardHeader>
      <CardContent>
        <Box display="flex" alignItems="flex-start" mb={2}>
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
        </Box>
        
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
        <Box mt={3}>
          <Typography variant="subtitle2" mb={1}>Activity - Last 30 Days</Typography>
          <HeatmapContainer>
            {activitySummary.map((day, index) => (
              <Tooltip 
                key={day.date} 
                title={
                  day.workouts > 0 
                    ? `${formatDate(day.date)}: ${day.workouts} workout${day.workouts > 1 ? 's' : ''}, ${day.exercises} exercise${day.exercises > 1 ? 's' : ''}, ${day.duration} min`
                    : `${formatDate(day.date)}: No activity`
                }
              >
                <HeatmapDay intensity={day.intensity} />
              </Tooltip>
            ))}
          </HeatmapContainer>
        </Box>
      </CardContent>
    </StyledCard>
  );
};

export default OverallProgressCard;
