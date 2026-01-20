/**
 * Enhanced Overview Section - GEMINI'S ARCHITECTURAL REFACTOR
 * =========================================================
 * Demonstrates the new component architecture with:
 * - OverviewPanel for metrics display
 * - ProgressChart for data visualization
 * - useClientData hook for data management
 * - Clean separation of concerns
 */

import React from 'react';
import styled from 'styled-components';
import { OverviewPanel, ProgressChart, useClientData } from '../';

const SectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 1rem;
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #00ffff;
  font-size: 1.2rem;
`;

const ErrorMessage = styled.div`
  background: rgba(255, 65, 108, 0.1);
  border: 1px solid rgba(255, 65, 108, 0.3);
  border-radius: 10px;
  padding: 1rem;
  color: #ff416c;
  text-align: center;
`;

const RetryButton = styled.button`
  margin-left: 1rem;
  background: transparent;
  border: 1px solid #ff416c;
  color: #ff416c;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
`;

const EnhancedOverviewSection: React.FC = () => {
  const { data, loading, error, refetch } = useClientData();

  if (loading) {
    return (
      <SectionContainer>
        <LoadingSpinner>Loading your dashboard data...</LoadingSpinner>
      </SectionContainer>
    );
  }

  if (error) {
    return (
      <SectionContainer>
        <ErrorMessage>
          {error}
          <RetryButton type="button" onClick={refetch}>
            Retry
          </RetryButton>
        </ErrorMessage>
      </SectionContainer>
    );
  }

  if (!data) {
    return (
      <SectionContainer>
        <ErrorMessage>No data available</ErrorMessage>
      </SectionContainer>
    );
  }

  const overviewMetrics = [
    {
      label: 'Total Workouts',
      value: data.stats.totalWorkouts,
      icon: 'W',
      color: '#00ffff',
      change: { value: 12, type: 'increase' as const },
    },
    {
      label: 'Total Weight Lifted',
      value: `${(data.stats.totalWeight / 1000).toFixed(1)}k lbs`,
      icon: 'L',
      color: '#ff416c',
      change: { value: 8, type: 'increase' as const },
    },
    {
      label: 'Average Intensity',
      value: data.stats.averageIntensity.toFixed(1),
      icon: 'I',
      color: '#4776e6',
      change: { value: 3, type: 'increase' as const },
    },
    {
      label: 'Current Streak',
      value: `${data.stats.streakDays} days`,
      icon: 'S',
      color: '#2ebf91',
      change: { value: 5, type: 'increase' as const },
    },
  ];

  const progressData = [
    {
      label: 'Weight Loss',
      value: data.progress.weightLoss,
      color: '#ff416c',
    },
    {
      label: 'Strength Gain',
      value: data.progress.strengthGain,
      color: '#00ffff',
    },
    {
      label: 'Endurance',
      value: data.progress.enduranceImprovement,
      color: '#2ebf91',
    },
  ];

  const levelProgressData = [
    {
      label: 'Current Level',
      value: data.profile.experiencePoints,
      color: '#4776e6',
    },
  ];

  return (
    <SectionContainer>
      <OverviewPanel title={`Welcome back, ${data.profile.name}!`} metrics={overviewMetrics} />

      <GridContainer>
        <ProgressChart title="Fitness Progress (%)" data={progressData} type="bar" maxValue={100} />
        <ProgressChart
          title={`Level ${data.profile.level} Progress`}
          data={levelProgressData}
          type="circle"
          maxValue={3000}
        />
      </GridContainer>
    </SectionContainer>
  );
};

export default EnhancedOverviewSection;
