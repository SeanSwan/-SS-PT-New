import React from 'react';
import { Star, Target, TrendingUp, Trophy } from 'lucide-react';
import type { GoalData, GoalTrackingData } from '../../../../services/enhanced-progress-analytics-service';
import {
  goalAccentTone,
  GoalFilter,
  NewGoalDraft,
} from './GoalProgressTracker.logic';
import GoalProgressTrackerAchievements from './GoalProgressTrackerAchievements';
import GoalProgressTrackerAddGoalModal from './GoalProgressTrackerAddGoalModal';
import GoalProgressTrackerGoalDetails from './GoalProgressTrackerGoalDetails';
import GoalProgressTrackerGoalList from './GoalProgressTrackerGoalList';
import {
  BodyText,
  Container,
  EmptyState,
  GlassPanel,
  PanelTitle,
  StatLabel,
  StatValue,
  SummaryCard,
  SummaryGrid,
} from './GoalProgressTracker.styles';

interface GoalProgressTrackerViewProps {
  data: GoalTrackingData | null;
  filteredGoals: GoalData[];
  goalFilter: GoalFilter;
  selectedGoalId: string | null;
  showAddGoal: boolean;
  isLoadingGoals: boolean;
  goalError: string | null;
  isSavingGoal: boolean;
  goalActionError: string | null;
  progressDraft: string;
  newGoalDraft: NewGoalDraft;
  onFilterChange: (filter: GoalFilter) => void;
  onOpenAddGoal: () => void;
  onCloseAddGoal: () => void;
  onOpenGoal: (goal: GoalData) => void;
  onCloseGoal: () => void;
  onCreateGoal: () => void;
  onUpdateProgress: (goal: GoalData) => void;
  onProgressDraftChange: (value: string) => void;
  onGoalDraftChange: (draft: NewGoalDraft) => void;
}

const GoalProgressTrackerView: React.FC<GoalProgressTrackerViewProps> = ({
  data,
  filteredGoals,
  goalFilter,
  selectedGoalId,
  showAddGoal,
  isLoadingGoals,
  goalError,
  isSavingGoal,
  goalActionError,
  progressDraft,
  newGoalDraft,
  onFilterChange,
  onOpenAddGoal,
  onCloseAddGoal,
  onOpenGoal,
  onCloseGoal,
  onCreateGoal,
  onUpdateProgress,
  onProgressDraftChange,
  onGoalDraftChange,
}) => {
  const selectedGoal = selectedGoalId && data
    ? data.goals.find((goal) => goal.id === selectedGoalId) ?? null
    : null;

  const renderGoalState = () => {
    if (isLoadingGoals) {
      return (
        <GlassPanel>
          <EmptyState>
            <PanelTitle>Loading Goal Tracking</PanelTitle>
            <BodyText>Reading this client's saved goal history.</BodyText>
          </EmptyState>
        </GlassPanel>
      );
    }

    if (goalError) {
      return (
        <GlassPanel>
          <EmptyState>
            <PanelTitle>Goal Tracking Unavailable</PanelTitle>
            <BodyText>{goalError}</BodyText>
          </EmptyState>
        </GlassPanel>
      );
    }

    if (!data) {
      return (
        <GlassPanel>
          <EmptyState>
            <PanelTitle>No Goal Data Loaded</PanelTitle>
            <BodyText>Select a client with saved goals to review progress milestones here.</BodyText>
          </EmptyState>
        </GlassPanel>
      );
    }

    return null;
  };

  const renderSummaryCards = () => {
    if (!data) return null;

    return (
      <SummaryGrid>
        <SummaryCard $accentColor={goalAccentTone('primary')}>
          <Target color={goalAccentTone('primary')} size={32} />
          <StatValue>{data.summary.totalGoals}</StatValue>
          <StatLabel>Total Goals</StatLabel>
        </SummaryCard>
        <SummaryCard $accentColor={goalAccentTone('success')}>
          <TrendingUp color={goalAccentTone('success')} size={32} />
          <StatValue>{data.summary.activeGoals}</StatValue>
          <StatLabel>Active Goals</StatLabel>
        </SummaryCard>
        <SummaryCard $accentColor={goalAccentTone('warning')}>
          <Trophy color={goalAccentTone('warning')} size={32} />
          <StatValue>{data.summary.completedGoals}</StatValue>
          <StatLabel>Completed</StatLabel>
        </SummaryCard>
        <SummaryCard $accentColor={goalAccentTone('purple')}>
          <Star color={goalAccentTone('purple')} size={32} />
          <StatValue>{data.summary.averageProgress}%</StatValue>
          <StatLabel>Avg Progress</StatLabel>
        </SummaryCard>
      </SummaryGrid>
    );
  };

  return (
    <Container>
      {renderGoalState()}
      {renderSummaryCards()}
      <GoalProgressTrackerGoalList
        data={data}
        filteredGoals={filteredGoals}
        goalFilter={goalFilter}
        onFilterChange={onFilterChange}
        onOpenAddGoal={onOpenAddGoal}
        onOpenGoal={onOpenGoal}
      />
      <GoalProgressTrackerAchievements data={data} />
      <GoalProgressTrackerGoalDetails
        goal={selectedGoal}
        progressDraft={progressDraft}
        goalActionError={goalActionError}
        isSavingGoal={isSavingGoal}
        onClose={onCloseGoal}
        onProgressDraftChange={onProgressDraftChange}
        onUpdateProgress={onUpdateProgress}
      />
      <GoalProgressTrackerAddGoalModal
        isOpen={showAddGoal}
        draft={newGoalDraft}
        goalActionError={goalActionError}
        isSavingGoal={isSavingGoal}
        onClose={onCloseAddGoal}
        onCreateGoal={onCreateGoal}
        onDraftChange={onGoalDraftChange}
      />
    </Container>
  );
};

export default GoalProgressTrackerView;
