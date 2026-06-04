import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { logger } from '@/utils/logger';
import type { GoalData, GoalTrackingData } from '../../../../services/enhanced-progress-analytics-service';
import type { GoalProgressTrackerProps } from './types';
import {
  DEFAULT_GOAL_DRAFT,
  filterGoals,
  GoalFilter,
  isGoalTrackingData,
  NewGoalDraft,
} from './GoalProgressTracker.logic';
import GoalProgressTrackerView from './GoalProgressTrackerView';

const GoalProgressTracker: React.FC<GoalProgressTrackerProps> = ({
  clientId,
  clientData,
  onGoalUpdate,
}) => {
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalFilter, setGoalFilter] = useState<GoalFilter>('active');
  const [goalTrackingData, setGoalTrackingData] = useState<GoalTrackingData | null>(null);
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);
  const [goalError, setGoalError] = useState<string | null>(null);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [goalActionError, setGoalActionError] = useState<string | null>(null);
  const [progressDraft, setProgressDraft] = useState('');
  const [newGoalDraft, setNewGoalDraft] = useState<NewGoalDraft>(DEFAULT_GOAL_DRAFT);
  const { authAxios } = useAuth();

  const applyGoalResponse = useCallback((payload: unknown) => {
    setGoalTrackingData(isGoalTrackingData(payload) ? payload : null);
  }, []);

  const reloadGoals = useCallback(async () => {
    if (!authAxios || !clientId) return;

    const response = await authAxios.get(`/api/client-progress/${clientId}/goals`);
    applyGoalResponse(response.data?.data ?? response.data);
  }, [applyGoalResponse, authAxios, clientId]);

  useEffect(() => {
    let cancelled = false;

    if (!clientData || !clientId || !authAxios) {
      setGoalTrackingData(null);
      setGoalError(null);
      setIsLoadingGoals(false);
      return () => {
        cancelled = true;
      };
    }

    setIsLoadingGoals(true);
    setGoalError(null);

    authAxios.get(`/api/client-progress/${clientId}/goals`)
      .then((response) => {
        if (cancelled) return;
        const payload = response.data?.data ?? response.data;
        setGoalTrackingData(isGoalTrackingData(payload) ? payload : null);
      })
      .catch((error) => {
        if (cancelled) return;
        logger.warn('[GoalProgressTracker] Failed to load goal tracking data:', error);
        setGoalTrackingData(null);
        setGoalError('Goal tracking is unavailable right now.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingGoals(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authAxios, clientData, clientId]);

  const filteredGoals = useMemo(
    () => filterGoals(goalTrackingData, goalFilter),
    [goalFilter, goalTrackingData],
  );

  const openGoalDetails = (goal: GoalData) => {
    setSelectedGoal(goal.id);
    setProgressDraft(String(goal.currentValue ?? ''));
    setGoalActionError(null);
  };

  const closeGoalDetails = () => {
    setSelectedGoal(null);
    setGoalActionError(null);
  };

  const closeAddGoal = () => {
    setShowAddGoal(false);
    setGoalActionError(null);
  };

  const handleCreateGoal = async () => {
    if (!authAxios || !clientId) return;
    setIsSavingGoal(true);
    setGoalActionError(null);

    try {
      await authAxios.post(`/api/client-progress/${clientId}/goals`, {
        title: newGoalDraft.title,
        targetValue: Number(newGoalDraft.targetValue),
        unit: newGoalDraft.unit,
        category: newGoalDraft.category,
        deadline: newGoalDraft.deadline,
      });
      await reloadGoals();
      setShowAddGoal(false);
      setNewGoalDraft(DEFAULT_GOAL_DRAFT);
    } catch (error: any) {
      logger.warn('[GoalProgressTracker] Failed to create goal:', error);
      setGoalActionError(error?.response?.data?.message || 'Goal could not be created.');
    } finally {
      setIsSavingGoal(false);
    }
  };

  const handleUpdateProgress = async (goal: GoalData) => {
    if (!authAxios || !clientId) return;
    setIsSavingGoal(true);
    setGoalActionError(null);

    try {
      await authAxios.put(`/api/client-progress/${clientId}/goals/${goal.id}`, {
        currentValue: Number(progressDraft),
      });
      await reloadGoals();
      onGoalUpdate?.(goal.id, { currentValue: Number(progressDraft) });
    } catch (error: any) {
      logger.warn('[GoalProgressTracker] Failed to update goal progress:', error);
      setGoalActionError(error?.response?.data?.message || 'Goal progress could not be updated.');
    } finally {
      setIsSavingGoal(false);
    }
  };

  return (
    <GoalProgressTrackerView
      data={goalTrackingData}
      filteredGoals={filteredGoals}
      goalFilter={goalFilter}
      selectedGoalId={selectedGoal}
      showAddGoal={showAddGoal}
      isLoadingGoals={isLoadingGoals}
      goalError={goalError}
      isSavingGoal={isSavingGoal}
      goalActionError={goalActionError}
      progressDraft={progressDraft}
      newGoalDraft={newGoalDraft}
      onFilterChange={setGoalFilter}
      onOpenAddGoal={() => setShowAddGoal(true)}
      onCloseAddGoal={closeAddGoal}
      onOpenGoal={openGoalDetails}
      onCloseGoal={closeGoalDetails}
      onCreateGoal={handleCreateGoal}
      onUpdateProgress={handleUpdateProgress}
      onProgressDraftChange={setProgressDraft}
      onGoalDraftChange={setNewGoalDraft}
    />
  );
};

export default GoalProgressTracker;
