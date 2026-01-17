/**
 * OnboardingStatusCard.tsx
 * =========================
 *
 * Real-time onboarding status display with Phase 1.1 data integration
 * Shows questionnaire completion, NASM movement screen, and baseline measurements
 *
 * Features:
 * - Real API data from Phase 1.1 endpoints
 * - NASM assessment score visualization
 * - Corrective exercise strategy display
 * - Progress tracking
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
  TrendingUp,
  FileText,
  Heart,
  ArrowRight
} from 'lucide-react';
import { useClientOnboardingData } from '../../hooks/useClientOnboardingData';

// === KEYFRAMES ===
const pulse = keyframes`
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
`;

const shimmer = keyframes`
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
`;

// === STYLED COMPONENTS ===
const Card = styled(motion.div)`
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(15px);
  border-radius: 20px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
      ellipse at 20% 20%,
      rgba(0, 255, 255, 0.1) 0%,
      transparent 50%
    );
    pointer-events: none;
    z-index: 1;
  }

  &:hover {
    border-color: rgba(0, 255, 255, 0.4);
    box-shadow: 0 20px 40px rgba(0, 255, 255, 0.1);
  }
`;

const CardTitle = styled.h3`
  position: relative;
  z-index: 2;
  color: #00ffff;
  font-size: 1.5rem;
  font-weight: 300;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);

  &::before {
    content: '✦';
    color: #ffd700;
    animation: ${pulse} 3s ease-in-out infinite;
  }
`;

const StatusGrid = styled.div`
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const StatusItem = styled.div<{ $status: 'complete' | 'pending' | 'incomplete' }>`
  background: ${(props) => {
    switch (props.$status) {
      case 'complete':
        return 'rgba(34, 197, 94, 0.1)';
      case 'pending':
        return 'rgba(234, 179, 8, 0.1)';
      default:
        return 'rgba(239, 68, 68, 0.1)';
    }
  }};
  border: 1px solid
    ${(props) => {
      switch (props.$status) {
        case 'complete':
          return 'rgba(34, 197, 94, 0.3)';
        case 'pending':
          return 'rgba(234, 179, 8, 0.3)';
        default:
          return 'rgba(239, 68, 68, 0.3)';
      }
    }};
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  align-items: start;
  gap: 0.75rem;
`;

const StatusIcon = styled.div<{ $status: 'complete' | 'pending' | 'incomplete' }>`
  color: ${(props) => {
    switch (props.$status) {
      case 'complete':
        return '#22c55e';
      case 'pending':
        return '#eab308';
      default:
        return '#ef4444';
    }
  }};
  flex-shrink: 0;
`;

const StatusContent = styled.div`
  flex: 1;
`;

const StatusLabel = styled.div`
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
`;

const StatusValue = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
`;

const StatusLink = styled.a`
  color: rgba(59, 130, 246, 1);
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: rgba(59, 130, 246, 0.8);
    text-decoration: underline;
  }
`;

const NAM_ScoreDisplay = styled.div`
  position: relative;
  z-index: 2;
  background: rgba(0, 255, 255, 0.05);
  border: 2px solid rgba(0, 255, 255, 0.3);
  border-radius: 15px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const ScoreCircle = styled.div<{ $score: number }>`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    ${(props) => (props.$score >= 80 ? '#22c55e' : props.$score >= 60 ? '#eab308' : '#ef4444')} 0deg,
    ${(props) => (props.$score >= 80 ? '#22c55e' : props.$score >= 60 ? '#eab308' : '#ef4444')}
      ${(props) => props.$score * 3.6}deg,
    rgba(100, 100, 100, 0.2) ${(props) => props.$score * 3.6}deg,
    rgba(100, 100, 100, 0.2) 360deg
  );
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;

  &::before {
    content: '';
    width: 80%;
    height: 80%;
    background: #0a0a0f;
    border-radius: 50%;
    position: absolute;
  }

  .score-value {
    position: relative;
    z-index: 1;
    color: ${(props) =>
      props.$score >= 80 ? '#22c55e' : props.$score >= 60 ? '#eab308' : '#ef4444'};
    font-weight: 700;
    font-size: 1.5rem;
    text-shadow: 0 0 10px currentColor;
  }
`;

const ScoreDetails = styled.div`
  flex: 1;
`;

const ScoreTitle = styled.div`
  color: #00ffff;
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const ScoreDescription = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  line-height: 1.5;
`;

const CompensationsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const CompensationBadge = styled.li`
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  color: #ef4444;
  text-transform: capitalize;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: rgba(255, 255, 255, 0.6);
  gap: 1rem;
`;

const LoadingBar = styled.div`
  width: 200px;
  height: 4px;
  background: rgba(100, 100, 100, 0.2);
  border-radius: 2px;
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    width: 50%;
    height: 100%;
    background: linear-gradient(90deg, transparent, #00ffff, transparent);
    animation: ${shimmer} 1.5s infinite;
  }
`;

const ErrorState = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  color: #ef4444;
`;

// === COMPONENT ===
const OnboardingStatusCard: React.FC = () => {
  const { data, loading, error } = useClientOnboardingData();

  if (loading) {
    return (
      <Card
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <LoadingState>
          <Activity size={32} className="animate-pulse" />
          <div>Loading your onboarding status...</div>
          <LoadingBar />
        </LoadingState>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <ErrorState>
          <AlertCircle size={20} />
          <div>{error}</div>
        </ErrorState>
      </Card>
    );
  }

  if (!data) return null;

  const getOnboardingStatus = (): 'complete' | 'pending' | 'incomplete' => {
    if (data.onboardingStatus.completed) return 'complete';
    if (data.onboardingStatus.completionPercentage > 0) return 'pending';
    return 'incomplete';
  };

  const getMovementScreenStatus = (): 'complete' | 'pending' | 'incomplete' => {
    if (data.movementScreen.completed) return 'complete';
    if (data.onboardingStatus.completed) return 'pending';
    return 'incomplete';
  };

  const getActionLink = (status: string, type: 'questionnaire' | 'movement') => {
    if (status === 'complete') return null;

    const links = {
      questionnaire: '/onboarding/questionnaire',
      movement: '/onboarding/movement-screen'
    };

    return (
      <StatusLink href={links[type]}>
        Complete Now <ArrowRight size={14} />
      </StatusLink>
    );
  };

  return (
    <Card
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <CardTitle>
        <FileText size={24} />
        Your Onboarding Journey
      </CardTitle>

      <StatusGrid>
        <StatusItem $status={getOnboardingStatus()}>
          <StatusIcon $status={getOnboardingStatus()}>
            {getOnboardingStatus() === 'complete' ? (
              <CheckCircle size={24} />
            ) : getOnboardingStatus() === 'pending' ? (
              <Clock size={24} />
            ) : (
              <AlertCircle size={24} />
            )}
          </StatusIcon>
          <StatusContent>
            <StatusLabel>Onboarding Questionnaire</StatusLabel>
            <StatusValue>
              {data.onboardingStatus.completionPercentage}% Complete
              {data.onboardingStatus.primaryGoal && (
                <>
                  {' '}
                  • Goal: {data.onboardingStatus.primaryGoal.replace('_', ' ')}
                </>
              )}
              {getOnboardingStatus() !== 'complete' && (
                <div style={{ marginTop: '0.25rem' }}>{getActionLink('pending', 'questionnaire')}</div>
              )}
            </StatusValue>
          </StatusContent>
        </StatusItem>

        <StatusItem $status={getMovementScreenStatus()}>
          <StatusIcon $status={getMovementScreenStatus()}>
            {getMovementScreenStatus() === 'complete' ? (
              <CheckCircle size={24} />
            ) : getMovementScreenStatus() === 'pending' ? (
              <Clock size={24} />
            ) : (
              <AlertCircle size={24} />
            )}
          </StatusIcon>
          <StatusContent>
            <StatusLabel>NASM Movement Screen</StatusLabel>
            <StatusValue>
              {data.movementScreen.completed
                ? `Completed • Score: ${data.movementScreen.nasmAssessmentScore}/100`
                : data.onboardingStatus.completed
                ? 'Ready to schedule'
                : 'Complete questionnaire first'}
              {getMovementScreenStatus() !== 'complete' && data.onboardingStatus.completed && (
                <div style={{ marginTop: '0.25rem' }}>{getActionLink('pending', 'movement')}</div>
              )}
            </StatusValue>
          </StatusContent>
        </StatusItem>

        {data.baselineMeasurements && (
          <StatusItem $status="complete">
            <StatusIcon $status="complete">
              <TrendingUp size={24} />
            </StatusIcon>
            <StatusContent>
              <StatusLabel>Baseline Measurements</StatusLabel>
              <StatusValue>
                {data.baselineMeasurements.bodyWeight && `${data.baselineMeasurements.bodyWeight} lbs`}
                {data.baselineMeasurements.restingHeartRate &&
                  ` • ${data.baselineMeasurements.restingHeartRate} bpm`}
              </StatusValue>
            </StatusContent>
          </StatusItem>
        )}

        {data.nutritionPlan?.active && (
          <StatusItem $status="complete">
            <StatusIcon $status="complete">
              <Heart size={24} />
            </StatusIcon>
            <StatusContent>
              <StatusLabel>Nutrition Plan</StatusLabel>
              <StatusValue>
                {data.nutritionPlan.dailyCalories} cal/day
                {data.nutritionPlan.macros &&
                  ` • ${data.nutritionPlan.macros.protein}P / ${data.nutritionPlan.macros.carbs}C / ${data.nutritionPlan.macros.fat}F`}
              </StatusValue>
            </StatusContent>
          </StatusItem>
        )}
      </StatusGrid>

      {data.movementScreen.completed && data.movementScreen.nasmAssessmentScore !== undefined && (
        <NAM_ScoreDisplay>
          <ScoreCircle $score={data.movementScreen.nasmAssessmentScore}>
            <span className="score-value">{data.movementScreen.nasmAssessmentScore}</span>
          </ScoreCircle>
          <ScoreDetails>
            <ScoreTitle>NASM Assessment Score</ScoreTitle>
            <ScoreDescription>
              {data.movementScreen.nasmAssessmentScore >= 80
                ? 'Excellent movement quality! You have minimal compensations and are ready for advanced training.'
                : data.movementScreen.nasmAssessmentScore >= 60
                ? 'Good movement quality with some areas to improve. Your trainer will provide corrective exercises.'
                : 'Movement compensations detected. Focus on corrective exercises before progressing to advanced training.'}
            </ScoreDescription>
            {data.movementScreen.compensationsIdentified &&
              data.movementScreen.compensationsIdentified.length > 0 && (
                <>
                  <ScoreDescription style={{ marginTop: '0.75rem', fontWeight: 600 }}>
                    Compensations Identified:
                  </ScoreDescription>
                  <CompensationsList>
                    {data.movementScreen.compensationsIdentified.map((comp, idx) => (
                      <CompensationBadge key={idx}>{comp.replace('_', ' ')}</CompensationBadge>
                    ))}
                  </CompensationsList>
                </>
              )}
          </ScoreDetails>
        </NAM_ScoreDisplay>
      )}
    </Card>
  );
};

export default OnboardingStatusCard;
