/**
 * ClientProgress Component - PRODUCTION SIMPLIFIED
 * ===============================================
 * Displays a client's progress and workout statistics without extra chart dependencies.
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import type { ClientProgressData, WorkoutStatistics } from '../types/progress.types';
import {
  extractClientProgress,
  extractWorkoutStatistics,
  getApiErrorMessage,
  getClientProgressUrl,
  getProgressDateRange,
  getTopExercises,
  getWorkoutStatisticsUrl,
  WEEKDAY_NAMES,
} from './ClientProgress.logic';
import {
  DataTable,
  FilterContainer,
  FilterSelect,
  HeaderSection,
  MetricCard,
  MetricLabel,
  MetricsGrid,
  MetricValue,
  ProgressContainer,
  SkillBar,
  SkillLabel,
  SkillLevelCard,
  SkillLevelTitle,
  TableLabel,
  TableRow,
  TableTitle,
  TableValue,
  Title,
  TwoColumnGrid,
} from '../styles/ClientProgress.styles';

interface ClientProgressProps {
  userId?: string | null;
  userRole?: string;
}

const ClientProgress: React.FC<ClientProgressProps> = ({ userId, userRole = 'client' }) => {
  const { userId: routeUserId } = useParams<{ userId: string }>();
  const { user, authAxios } = useAuth();
  const selectedUserId = userId || routeUserId || user?.id;
  const [timeRange, setTimeRange] = useState<string>('30days');
  const [loading, setLoading] = useState<boolean>(true);
  const [progress, setProgress] = useState<ClientProgressData | null>(null);
  const [statistics, setStatistics] = useState<WorkoutStatistics | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch progress and statistics data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const targetUserId = selectedUserId;
        
        if (!targetUserId) {
          setError('No user specified');
          setLoading(false);
          return;
        }
        
        const { startDate, endDate } = getProgressDateRange(timeRange);
        
        const progressResponse = await authAxios.get(
          getClientProgressUrl(targetUserId, userRole, user?.id)
        );

        const statisticsResponse = await authAxios.get(getWorkoutStatisticsUrl(targetUserId, userRole, user?.id), {
          params: {
            startDate,
            endDate,
            includeExerciseBreakdown: true,
            includeMuscleGroupBreakdown: true,
            includeWeekdayBreakdown: true,
            includeIntensityTrends: true
          }
        });
        
        setProgress(extractClientProgress(progressResponse.data));
        setStatistics(extractWorkoutStatistics(statisticsResponse.data));
      } catch (err: unknown) {
        console.error('Error fetching progress data:', err);
        setError(getApiErrorMessage(err, 'Failed to load progress data'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedUserId, authAxios, timeRange, userRole, user?.id]);
  
  // Render loading state
  if (loading) {
    return (
      <ProgressContainer>
        <Title>Loading progress data...</Title>
      </ProgressContainer>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <ProgressContainer>
        <Title>Error Loading Data</Title>
        <p>{error}</p>
      </ProgressContainer>
    );
  }
  
  // Render no data state
  if (!progress || !statistics) {
    return (
      <ProgressContainer>
        <Title>No Progress Data Available</Title>
        <p>Start tracking your workouts to see progress data here.</p>
      </ProgressContainer>
    );
  }
  const topExercises = getTopExercises(statistics);

  return (
    <ProgressContainer>
      <HeaderSection>
        <Title>Workout Progress</Title>
        
        <FilterContainer>
          <FilterSelect 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="year">Last Year</option>
            <option value="all">All Time</option>
          </FilterSelect>
        </FilterContainer>
      </HeaderSection>
      
      {/* Summary Metrics */}
      <MetricsGrid>
        <MetricCard>
          <MetricValue>{statistics.totalWorkouts}</MetricValue>
          <MetricLabel>Total Workouts</MetricLabel>
        </MetricCard>
        
        <MetricCard>
          <MetricValue>{Math.round(statistics.totalDuration / 60)}</MetricValue>
          <MetricLabel>Total Hours</MetricLabel>
        </MetricCard>
        
        <MetricCard>
          <MetricValue>{statistics.totalSets.toLocaleString()}</MetricValue>
          <MetricLabel>Total Sets</MetricLabel>
        </MetricCard>
        
        <MetricCard>
          <MetricValue>{statistics.totalReps.toLocaleString()}</MetricValue>
          <MetricLabel>Total Reps</MetricLabel>
        </MetricCard>
        
        <MetricCard>
          <MetricValue>{Math.round(statistics.totalWeight).toLocaleString()}</MetricValue>
          <MetricLabel>Total Weight (lbs)</MetricLabel>
        </MetricCard>
        
        <MetricCard>
          <MetricValue>{progress.currentStreak}</MetricValue>
          <MetricLabel>Current Streak</MetricLabel>
        </MetricCard>
      </MetricsGrid>
      
      {/* Skill Levels */}
      <SkillLevelCard>
        <SkillLevelTitle>Skill Levels</SkillLevelTitle>
        
        <SkillLabel>
          <span>Strength</span>
          <span>Level {progress.strengthLevel}</span>
        </SkillLabel>
        <SkillBar $percentage={progress.strengthLevel * 10} $color="var(--danger, #ff6b7a)" />
        
        <SkillLabel>
          <span>Cardio</span>
          <span>Level {progress.cardioLevel}</span>
        </SkillLabel>
        <SkillBar $percentage={progress.cardioLevel * 10} $color="var(--accent-primary, #60c0f0)" />
        
        <SkillLabel>
          <span>Flexibility</span>
          <span>Level {progress.flexibilityLevel}</span>
        </SkillLabel>
        <SkillBar $percentage={progress.flexibilityLevel * 10} $color="var(--accent-gold, #c6a84b)" />
        
        <SkillLabel>
          <span>Balance</span>
          <span>Level {progress.balanceLevel}</span>
        </SkillLabel>
        <SkillBar $percentage={progress.balanceLevel * 10} $color="var(--success, #72d6a0)" />
        
        <SkillLabel>
          <span>Core</span>
          <span>Level {progress.coreLevel}</span>
        </SkillLabel>
        <SkillBar $percentage={progress.coreLevel * 10} $color="var(--accent-secondary, #8b5cf6)" />
      </SkillLevelCard>
      
      {/* Data Tables */}
      <TwoColumnGrid>
        {/* Top Exercises */}
        <DataTable>
          <TableTitle>Top Exercises</TableTitle>
          {topExercises.length > 0 ? (
            topExercises.map((exercise) => (
              <TableRow key={exercise.id}>
                <TableLabel>{exercise.name}</TableLabel>
                <TableValue>{exercise.count} times</TableValue>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableLabel>No exercise data available</TableLabel>
              <TableValue>-</TableValue>
            </TableRow>
          )}
        </DataTable>
        
        {/* Workout Frequency by Day */}
        <DataTable>
          <TableTitle>Workout Frequency by Day</TableTitle>
          {statistics.weekdayBreakdown && statistics.weekdayBreakdown.length > 0 ? (
            WEEKDAY_NAMES.map((day, index) => (
              <TableRow key={day}>
                <TableLabel>{day}</TableLabel>
                <TableValue>{statistics.weekdayBreakdown[index] || 0} workouts</TableValue>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableLabel>No frequency data available</TableLabel>
              <TableValue>-</TableValue>
            </TableRow>
          )}
        </DataTable>
      </TwoColumnGrid>
    </ProgressContainer>
  );
};

export default ClientProgress;
