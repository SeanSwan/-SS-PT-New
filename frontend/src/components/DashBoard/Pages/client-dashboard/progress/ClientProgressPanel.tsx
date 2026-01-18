import React, { useMemo } from 'react';
import styled from 'styled-components';
import { TrendingUp, Target, Activity, Calendar } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import {
  useClientProgress,
  ClientProgressSummary,
  ProgressMeasurement,
  ProgressGoal
} from '../../../../UniversalMasterSchedule/hooks/useClientProgress';

const PanelWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const PanelCard = styled.div`
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  padding: 1.5rem;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #00ffff;
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1rem;
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
`;

const StatCard = styled.div`
  background: rgba(0, 255, 255, 0.08);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 12px;
  padding: 1rem;
`;

const StatValue = styled.div`
  color: #00ffff;
  font-size: 1.6rem;
  font-weight: 700;
`;

const StatLabel = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  margin-top: 0.5rem;
`;

const ChartContainer = styled.div`
  background: rgba(10, 10, 20, 0.6);
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid rgba(0, 255, 255, 0.15);
`;

const ChartLabel = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  margin-top: 0.75rem;
  text-align: center;
`;

const MetaLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  margin-top: 0.75rem;
`;

const EmptyState = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.95rem;
  text-align: center;
  padding: 1rem 0;
`;

const GoalList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const GoalRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const GoalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.9rem;
`;

const GoalBar = styled.div`
  height: 8px;
  border-radius: 999px;
  background: rgba(0, 255, 255, 0.15);
  overflow: hidden;
`;

const GoalBarFill = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${(props) => Math.min(100, Math.max(0, props.$progress))}%;
  background: linear-gradient(90deg, #00ffff, #7851a9);
`;

const MeasurementList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const MeasurementRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: rgba(120, 81, 169, 0.1);
`;

const MeasurementDate = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
`;

const MeasurementValue = styled.div`
  color: #00ffff;
  font-weight: 600;
`;

const formatNumber = (value: number | null, digits = 1) => {
  if (value === null || Number.isNaN(value)) {
    return 'N/A';
  }
  return value.toFixed(digits);
};

const formatDate = (value: string | null) => {
  if (!value) {
    return 'N/A';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }
  return date.toLocaleDateString();
};

const buildSparklinePath = (points: number[], width: number, height: number) => {
  if (points.length < 2) {
    return '';
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  return points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
};

const Sparkline: React.FC<{ measurements: ProgressMeasurement[] }> = ({ measurements }) => {
  const points = measurements
    .map((measurement) => measurement.weight)
    .filter((value): value is number => typeof value === 'number');

  const path = useMemo(() => buildSparklinePath(points, 240, 80), [points]);

  if (points.length < 2) {
    return <EmptyState>No weight trend data yet.</EmptyState>;
  }

  return (
    <svg width="100%" height="90" viewBox="0 0 240 90" preserveAspectRatio="none">
      <path d={path} fill="none" stroke="#00ffff" strokeWidth="3" />
    </svg>
  );
};

const calculateGoalProgress = (
  goal: ProgressGoal,
  summary: ClientProgressSummary | null
) => {
  if (!summary) {
    return 0;
  }

  const { startingWeight, currentWeight } = summary;
  if (
    goal.name === 'Target Weight' &&
    startingWeight !== null &&
    currentWeight !== null &&
    goal.target !== null &&
    startingWeight !== goal.target
  ) {
    const total = Math.abs(startingWeight - goal.target);
    const achieved = Math.abs(startingWeight - currentWeight);
    return (achieved / total) * 100;
  }

  if (goal.target !== null && goal.current !== null && goal.target !== 0) {
    return (goal.current / goal.target) * 100;
  }

  return 0;
};

const ClientProgressPanel: React.FC<{ userId?: number }> = ({ userId }) => {
  const { user } = useAuth();
  const resolvedUserId = userId ?? Number(user?.id);

  const { data, isLoading, error } = useClientProgress(resolvedUserId);

  if (!resolvedUserId) {
    return <EmptyState>Log in to view progress.</EmptyState>;
  }

  if (isLoading) {
    return <EmptyState>Loading progress data...</EmptyState>;
  }

  if (error) {
    return <EmptyState>Unable to load progress data.</EmptyState>;
  }

  if (!data) {
    return <EmptyState>No progress data yet. Complete your first session.</EmptyState>;
  }

  return (
    <PanelWrapper>
      <PanelCard>
        <SectionHeader>
          <TrendingUp size={20} /> Progress Summary
        </SectionHeader>
        <StatGrid>
          <StatCard>
            <StatValue>
              {data.currentWeight === null ? 'N/A' : `${formatNumber(data.currentWeight, 1)} lbs`}
            </StatValue>
            <StatLabel>Current Weight</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>
              {data.weightChange === null
                ? 'N/A'
                : `${data.weightChange >= 0 ? '+' : ''}${formatNumber(data.weightChange, 1)} lbs`}
            </StatValue>
            <StatLabel>Weight Change</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{formatNumber(data.nasmScore, 0)}</StatValue>
            <StatLabel>NASM Score</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{data.sessionsCompleted}</StatValue>
            <StatLabel>Sessions Completed</StatLabel>
          </StatCard>
        </StatGrid>
        <ChartContainer>
          <Sparkline measurements={data.recentMeasurements} />
          <ChartLabel>Weight trend (last 30 days)</ChartLabel>
        </ChartContainer>
        <MetaLine>
          <Calendar size={14} />
          <span>Last session: {formatDate(data.lastSessionDate)}</span>
        </MetaLine>
      </PanelCard>

      <PanelCard>
        <SectionHeader>
          <Target size={20} /> Goal Tracking
        </SectionHeader>
        {data.goals.length === 0 ? (
          <EmptyState>No goals set yet.</EmptyState>
        ) : (
          <GoalList>
            {data.goals.map((goal, index) => {
              const progress = calculateGoalProgress(goal, data);
              return (
                <GoalRow key={`${goal.name}-${index}`}>
                  <GoalHeader>
                    <span>{goal.name}</span>
                    <span>
                      {goal.current !== null ? formatNumber(goal.current, 1) : 'N/A'}
                      {goal.unit ? ` ${goal.unit}` : ''}
                      {goal.target !== null ? ` / ${formatNumber(goal.target, 1)}` : ''}
                    </span>
                  </GoalHeader>
                  <GoalBar>
                    <GoalBarFill $progress={progress} />
                  </GoalBar>
                </GoalRow>
              );
            })}
          </GoalList>
        )}
      </PanelCard>

      <PanelCard>
        <SectionHeader>
          <Activity size={20} /> Recent Measurements
        </SectionHeader>
        {data.recentMeasurements.length === 0 ? (
          <EmptyState>No measurements recorded yet.</EmptyState>
        ) : (
          <MeasurementList>
            {data.recentMeasurements.slice(-5).reverse().map((measurement) => (
              <MeasurementRow key={measurement.date}>
                <MeasurementDate>{formatDate(measurement.date)}</MeasurementDate>
                <MeasurementValue>
                  {measurement.weight !== null ? `${formatNumber(measurement.weight, 1)} lbs` : 'N/A'}
                </MeasurementValue>
              </MeasurementRow>
            ))}
          </MeasurementList>
        )}
      </PanelCard>
    </PanelWrapper>
  );
};

export default ClientProgressPanel;
