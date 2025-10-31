/**
 * Client Dashboard View V2
 * =========================
 * Clean rewrite using ui-kit components (MUI-free)
 * 
 * Strangler Fig Pattern - V2 Version
 * Main dashboard for clients to view progress, achievements, and exercises
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../../context/AuthContext';
import { Exercise as ExerciseType, RecommendedExercisesResponse } from '../../../../services/exercise-service';
import { ClientProgressData } from '../../../../services/client-progress-service';
import { useToast } from '../../../../hooks/use-toast';

// Import icons
import {
  Activity,
  Award,
  BarChart2,
  Calendar,
  Dumbbell,
  Flame,
  Heart,
  PlayCircle,
  Repeat,
  Star,
  Target,
  TrendingUp,
  Trophy,
  UserCheck,
  Zap,
  Shield,
  RefreshCw,
  FastForward,
  Anchor,
  Grid as GridIcon,
  CheckCircle,
  Plus,
  X
} from 'lucide-react';

// Import UI Kit components
import { PageTitle, SectionTitle, BodyText, SmallText, Caption } from '../../../ui-kit/Typography';
import { PrimaryButton, OutlinedButton, IconButton as StyledIconButton } from '../../../ui-kit/Button';
import { Card, CardHeader, CardBody, GridContainer, FlexBox, Box } from '../../../ui-kit/Card';
import Badge from '../../../ui-kit/Badge';
import { EmptyState, LoadingState } from '../../../ui-kit/EmptyState';

// Import existing styled components (should be MUI-free already)
import {
  PageContainer,
  ContentContainer,
  DashboardGrid,
  StyledCard,
  CardTitle,
  CardContent,
  ProgressBarContainer,
  ProgressBarLabel,
  ProgressBarName,
  ProgressBarValue,
  StyledLinearProgress,
  LevelBadge,
  LevelInfo,
  LevelName,
  LevelDescription,
  LevelProgress,
  NextLevelContainer,
  AchievementGrid,
  AchievementItem,
  ExerciseRow,
  ExerciseIcon,
  ExerciseInfo,
  ExerciseName,
  ExerciseDetails,
  ExerciseLevel,
  StatsGrid,
  StatCard,
  StatValue,
  StatLabel,
  containerVariants,
  itemVariants,
  staggeredItemVariants
} from './styled-client-dashboard';

// Custom styled components for this view
import styled from 'styled-components';

// Custom Modal (simple version without portal for now)
const ModalBackdrop = styled.div<{ isOpen: boolean }>`
  display: ${props => props.isOpen ? 'flex' : 'none'};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 9999;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

const ModalContainer = styled.div`
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

const ModalHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ModalBody = styled.div`
  padding: 1.5rem;
`;

const ModalFooter = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
`;

// Tooltip wrapper
const TooltipWrapper = styled.div`
  position: relative;
  display: inline-block;
  
  &:hover .tooltip-content {
    opacity: 1;
    visibility: visible;
  }
`;

const TooltipContent = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #1e293b;
  color: #ffffff;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  pointer-events: none;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: #1e293b;
  }
`;

// Define types
interface ProgressLevel {
  level: number;
  name: string;
  description: string;
  progress: number;
  totalNeeded: number;
}

interface Achievement {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
}

/**
 * Client Dashboard View Component V2
 * 
 * Features:
 * - Progress tracking across all fitness categories
 * - Achievement system
 * - Recommended exercises
 * - Level progression
 * - MUI-free implementation
 */
const ClientDashboardView: React.FC = () => {
  const { authAxios, user, services } = useAuth();
  const { toast } = useToast();

  // State
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ClientProgressData | null>(null);
  const [recommendedExercises, setRecommendedExercises] = useState<ExerciseType[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType | null>(null);
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    if (user?.id) {
      fetchProgress();
      fetchRecommendedExercises();
    }
  }, [user?.id]);

  // Fetch progress data
  const fetchProgress = async () => {
    setLoading(true);
    try {
      const result = await services.clientProgress.getClientProgressById(user!.id);
      if (result && result.success) {
        setProgress(result.progress);
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
      toast({
        title: 'Error',
        description: 'Failed to load progress data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch recommended exercises
  const fetchRecommendedExercises = async () => {
    try {
      const result = await services.exercise.getRecommendedExercises(user!.id);
      if (result && result.success) {
        setRecommendedExercises(result.recommendedExercises || []);
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
    }
  };

  // Handle exercise click
  const handleExerciseClick = (exercise: ExerciseType) => {
    setSelectedExercise(exercise);
    setExerciseModalOpen(true);
  };

  // Get icon for exercise type
  const getExerciseTypeIcon = (type: string) => {
    switch (type) {
      case 'core': return Shield;
      case 'balance': return Activity;
      case 'stability': return Anchor;
      case 'flexibility': return RefreshCw;
      case 'calisthenics': return Dumbbell;
      default: return Activity;
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <ContentContainer>
          <LoadingState message="Loading your progress..." />
        </ContentContainer>
      </PageContainer>
    );
  }

  if (!progress) {
    return (
      <PageContainer>
        <ContentContainer>
          <EmptyState 
            icon={<BarChart2 size={48} />}
            title="No Progress Data Available"
            message="Start your fitness journey to track your progress across all categories"
          />
        </ContentContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ContentContainer>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Header */}
          <FlexBox justify="space-between" align="center" margin="0 0 2rem 0">
            <div>
              <PageTitle>My Fitness Journey</PageTitle>
              <BodyText secondary style={{ marginTop: '0.5rem' }}>
                Track your progress across all fitness categories
              </BodyText>
            </div>
            <Badge variant="primary">
              Level {progress.overallLevel}
            </Badge>
          </FlexBox>

          {/* Stats Grid */}
          <StatsGrid>
            <StatCard as={motion.div} variants={itemVariants}>
              <Trophy size={32} color="#fbbf24" />
              <StatValue>{progress.workoutsCompleted}</StatValue>
              <StatLabel>Workouts</StatLabel>
            </StatCard>
            
            <StatCard as={motion.div} variants={itemVariants}>
              <Flame size={32} color="#ef4444" />
              <StatValue>{progress.streakDays}</StatValue>
              <StatLabel>Day Streak</StatLabel>
            </StatCard>
            
            <StatCard as={motion.div} variants={itemVariants}>
              <Dumbbell size={32} color="#3b82f6" />
              <StatValue>{progress.totalExercisesPerformed}</StatValue>
              <StatLabel>Exercises</StatLabel>
            </StatCard>
            
            <StatCard as={motion.div} variants={itemVariants}>
              <Star size={32} color="#10b981" />
              <StatValue>{progress.achievements?.length || 0}</StatValue>
              <StatLabel>Achievements</StatLabel>
            </StatCard>
          </StatsGrid>

          {/* Recommended Exercises */}
          <StyledCard as={motion.div} variants={itemVariants}>
            <CardHeader>
              <CardTitle>
                <Dumbbell size={24} />
                Recommended Exercises
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recommendedExercises.length === 0 ? (
                <EmptyState 
                  icon={<Dumbbell size={32} />}
                  title="No Recommended Exercises"
                  message="Complete more workouts to get personalized exercise recommendations"
                  variant="minimal"
                  iconSize="sm"
                />
              ) : (
                <div>
                  {recommendedExercises.slice(0, 5).map((exercise, index) => {
                    const Icon = getExerciseTypeIcon(exercise.exerciseType);
                    return (
                      <ExerciseRow
                        key={exercise.id}
                        as={motion.div}
                        custom={index}
                        variants={staggeredItemVariants}
                        onClick={() => handleExerciseClick(exercise)}
                      >
                        <ExerciseIcon>
                          <Icon size={24} />
                        </ExerciseIcon>
                        <ExerciseInfo>
                          <ExerciseName>{exercise.name}</ExerciseName>
                          <ExerciseDetails>{exercise.description}</ExerciseDetails>
                        </ExerciseInfo>
                        <ExerciseLevel>
                          <Badge variant="primary">Level {exercise.difficulty}</Badge>
                        </ExerciseLevel>
                      </ExerciseRow>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </StyledCard>
        </motion.div>
      </ContentContainer>

      {/* Exercise Detail Modal */}
      <ModalBackdrop 
        isOpen={exerciseModalOpen}
        onClick={() => setExerciseModalOpen(false)}
      >
        <ModalContainer onClick={(e) => e.stopPropagation()}>
          <ModalHeader>
            <SectionTitle>{selectedExercise?.name}</SectionTitle>
            <StyledIconButton
              onClick={() => setExerciseModalOpen(false)}
              aria-label="Close modal"
              size="medium"
            >
              <X size={20} />
            </StyledIconButton>
          </ModalHeader>
          <ModalBody>
            <BodyText style={{ marginBottom: '1rem' }}>
              {selectedExercise?.description}
            </BodyText>
            <SectionTitle style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
              Instructions:
            </SectionTitle>
            <ul style={{ marginLeft: '1.5rem', color: '#e2e8f0' }}>
              {selectedExercise?.instructions?.map((instruction, i) => (
                <li key={i} style={{ marginBottom: '0.5rem' }}>
                  <SmallText>{instruction}</SmallText>
                </li>
              ))}
            </ul>
          </ModalBody>
          <ModalFooter>
            <OutlinedButton onClick={() => setExerciseModalOpen(false)}>
              Close
            </OutlinedButton>
            <PrimaryButton>
              <PlayCircle size={18} />
              Start Exercise
            </PrimaryButton>
          </ModalFooter>
        </ModalContainer>
      </ModalBackdrop>
    </PageContainer>
  );
};

export default ClientDashboardView;
