/**
 * COMPONENT: PlannerSaveBarBinding (S17 — JARVIS blueprint §4.4)
 * PURPOSE: Binds the pure SaveBar matrix to the planner contexts. Derives
 * the five matrix booleans from Data context truth and maps every resolved
 * primary/overflow label to the EXISTING context actions — no new writes,
 * no fetching here (actions own the network). Capabilities the platform
 * does not have yet surface as disabled-with-reason, never as silent no-ops
 * (the SwanGuard lesson). Mounted only inside the PLANNER_IA_V2 shell.
 */

import React from 'react';
import { usePlannerData } from './plannerContexts/PlannerDataContext';
import { usePlannerActions } from './plannerContexts/PlannerActionsContext';
import { isWorkoutPlanActiveStatus } from './workoutPlanStatus';
import WorkoutPlannerSaveBar from './WorkoutPlannerSaveBar';

const UNAVAILABLE: Record<string, string> = {
  'Save as template': 'Templates are coming soon',
  Deactivate: 'Deactivate from the saved plans list below',
  Discard: 'Remove rows individually for now',
};

const PlannerSaveBarBinding: React.FC = () => {
  const data = usePlannerData();
  const act = usePlannerActions();

  const { loadedPlanId, loadedPlanName, isDirty, hasGeneratedHorizonPlan } = data.planContent;
  const { savedPlans } = data.savedPlansState;
  const { isViewerClient } = data.clientState;
  const { saving } = data.saveActions;
  const hasContent = data.local.planExercises.length > 0 || hasGeneratedHorizonPlan;

  const loadedPlan = loadedPlanId ? savedPlans.find(plan => plan.id === loadedPlanId) : undefined;
  const activePlan = savedPlans.find(plan => isWorkoutPlanActiveStatus(plan.status));
  const isActive = isWorkoutPlanActiveStatus(loadedPlan?.status);
  const hasActiveOther = Boolean(activePlan && activePlan.id !== loadedPlanId);

  const state = {
    isDirty,
    isSaved: Boolean(loadedPlanId),
    isActive,
    hasActiveOther,
    canActivate: !isViewerClient,
  };

  const onPrimary = (label: string) => {
    if (label === 'Save plan') act.saveActions.handleSaveDraft();
    else if (label === 'Save changes') {
      if (loadedPlanId) act.saveActions.handleUpdateLoaded();
      else act.saveActions.handleSaveDraft();
    } else if (label.startsWith('Activate') && loadedPlan) {
      void act.savedPlansState.handleCardActivate(loadedPlan.id, loadedPlan.name);
    }
    // 'Assign / Schedule' is announced via primaryUnavailableReason below.
  };

  const onOverflowItem = (item: string) => {
    if (item === 'Duplicate') act.pageActions.handleDuplicateLoadedPlan();
    else if (item === 'Delete' && loadedPlan) act.savedPlansState.handleCardArchive(loadedPlan.id, loadedPlan.name);
    else if (item === 'Revert' && loadedPlanId && loadedPlanName) act.pageActions.handleLoadPlan(loadedPlanId, loadedPlanName);
    else if (item === 'View active plan' && activePlan) act.pageActions.handleLoadPlan(activePlan.id, activePlan.name);
    else if (item === 'Create PDF') act.pdf.handleCreateBuilderPdf();
  };

  const primaryUnavailableReason = !hasContent && !loadedPlanId
    ? 'Add exercises to save a plan'
    : isActive && !isDirty
      ? 'Assignment lands with the schedule link-up — plan stays active'
      : undefined;

  return (
    <WorkoutPlannerSaveBar
      state={state}
      busy={saving}
      onPrimary={onPrimary}
      onOverflowItem={onOverflowItem}
      unavailable={UNAVAILABLE}
      primaryUnavailableReason={primaryUnavailableReason}
    />
  );
};

export default PlannerSaveBarBinding;
