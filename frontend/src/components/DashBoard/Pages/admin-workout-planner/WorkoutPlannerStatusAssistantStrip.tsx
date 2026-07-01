/**
 * COMPONENT: WorkoutPlannerStatusAssistantStrip
 * PURPOSE: Renders planner status feedback, degraded-intelligence warnings,
 * and the scoped Swan Coach assistant panel outside the page shell.
 */

import React, { lazy, Suspense } from 'react';
import { AlertTriangle, ArrowLeft, Dumbbell } from 'lucide-react';
import { PanelErrorBoundary } from '../../../ui/PanelErrorBoundary';
import { DegradedBanner, StatusBanner, TeachToggle } from './WorkoutPlannerStyles';
import { isWorkoutPlannerPersonalLoggerRoute, workoutPlannerReturnLabel } from './workoutPlannerReturnTo';


const AITerminalPanel = lazy(() => import('../../../Shared/AITerminalPanel'));

export interface WorkoutPlannerStatusMessage {
  type: 'success' | 'error';
  text: string;
  nextAction?: 'current-plan-ready';
}

interface WorkoutPlannerStatusAssistantStripProps {
  statusMsg: WorkoutPlannerStatusMessage | null;
  plannerReturnTo: string | null;
  activePlanLoggerRoute?: string | null;
  selectedClientId: number | null;
  degradedIntelligence: boolean;
  hasPlanExercises: boolean;
  onReturnToClientHub: () => void;
  onDismissStatus: () => void;
}

const WorkoutPlannerStatusAssistantStrip: React.FC<WorkoutPlannerStatusAssistantStripProps> = ({
  statusMsg,
  plannerReturnTo,
  activePlanLoggerRoute,
  selectedClientId,
  degradedIntelligence,
  hasPlanExercises,
  onReturnToClientHub,
  onDismissStatus,
}) => {
  const canLogCurrentPlan = statusMsg?.nextAction === 'current-plan-ready';
  const isSelfPlannerHandoff =
    isWorkoutPlannerPersonalLoggerRoute(activePlanLoggerRoute) ||
    isWorkoutPlannerPersonalLoggerRoute(plannerReturnTo);
  const assistantClientId = isSelfPlannerHandoff ? undefined : selectedClientId ?? undefined;
  const returnLabel = workoutPlannerReturnLabel(plannerReturnTo);
  const shouldShowSuccessActions =
    statusMsg !== null &&
    statusMsg.type === 'success' &&
    (Boolean(plannerReturnTo) || Boolean(canLogCurrentPlan && activePlanLoggerRoute));

  return (
    <>
      {statusMsg && (
        <StatusBanner $type={statusMsg.type} role="alert">
          <span className="planner-status-text">{statusMsg.text}</span>
          {shouldShowSuccessActions && (
            <span className="planner-status-actions">
              {plannerReturnTo && (
                <TeachToggle type="button" onClick={onReturnToClientHub}>
                  <ArrowLeft size={16} />
                  {returnLabel}
                </TeachToggle>
              )}
              {canLogCurrentPlan && activePlanLoggerRoute && (
                <TeachToggle as="a" href={activePlanLoggerRoute}>
                  <Dumbbell size={16} />
                  Log Current Plan
                </TeachToggle>
              )}
            </span>
          )}
          <button type="button" onClick={onDismissStatus} aria-label="Dismiss">
            &times;
          </button>
        </StatusBanner>
      )}

      {degradedIntelligence && hasPlanExercises && (
        <DegradedBanner role="alert">
          <AlertTriangle size={20} />
          <div>
            <strong>Limited Context Mode</strong> - Pain/injury data could not be loaded for this client.
            This workout was generated without injury exclusions. Review each exercise carefully before assigning.
          </div>
        </DegradedBanner>
      )}

      <PanelErrorBoundary panelName="Swan Coach Assistant">
        <Suspense fallback={null}>
          <AITerminalPanel
            context="workout_generation"
            clientId={assistantClientId}
            label="Workout Swan Coach Assistant"
            placeholder="Ask me about exercise selection, periodization, NASM protocols..."
            compact
            defaultOpen={false}
          />
        </Suspense>
      </PanelErrorBoundary>
    </>
  );
};

export default WorkoutPlannerStatusAssistantStrip;
