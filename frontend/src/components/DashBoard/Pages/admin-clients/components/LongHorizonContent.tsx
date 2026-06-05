/**
 * ┌─── SUB-COMPONENT: LongHorizonContent ──────────────────────┐
 * │ PARENT: EnhancedAdminClientManagementView                   │
 * │ PURPOSE: Long-horizon monitoring dashboard for client       │
 * │          health metrics, trends, risk alerts, and           │
 * │          predictive analytics over extended timeframes       │
 * │ OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-23        │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────┐                        │
 * │ │ Long Horizon Analysis     [Refresh]│                      │
 * │ │ ┌─ Risk Cards ─────────────────┐ │                        │
 * │ │ │ Churn Risk | Progress Stall  │ │                        │
 * │ │ └─────────────────────────────┘ │                        │
 * │ │ ┌─ Trend Charts ──────────────┐ │                        │
 * │ │ │ Weight | Strength | Volume  │ │                        │
 * │ │ └─────────────────────────────┘ │                        │
 * │ │ ┌─ Recommendations ──────────┐  │                        │
 * │ │ │ AI-generated suggestions   │  │                        │
 * │ │ └────────────────────────────┘  │                        │
 * │ └──────────────────────────────────┘                        │
 * │ Props: { clientId, clientName }                             │
 * │ API: GET /api/admin/clients/:id/long-horizon               │
 * └─────────────────────────────────────────────────────────────┘
 */
import React, { useEffect } from 'react';
import type { createAiWorkoutService } from '../../../../../services/aiWorkoutService';
import type { Toast } from '../../../../../hooks/use-toast';
import LongHorizonConfigureForm from './LongHorizonConfigureForm';
import LongHorizonErrorState from './LongHorizonErrorState';
import LongHorizonPlanReviewEditor from './LongHorizonPlanReviewEditor';
import LongHorizonReviewFooter from './LongHorizonReviewFooter';
import {
  LongHorizonDegradedState,
  LongHorizonGeneratingState,
  LongHorizonIdleState,
  LongHorizonSavedState,
} from './LongHorizonStatusScreens';
import { useLongHorizonWorkflow } from './useLongHorizonWorkflow';

interface LongHorizonContentProps {
  clientId: number;
  clientName: string;
  authAxios: Parameters<typeof createAiWorkoutService>[0];
  toast: (opts: Omit<Toast, 'id'>) => void;
  onSuccess?: () => void;
  onClose: () => void;
  renderFooter: (content: React.ReactNode | null) => void;
}

const LongHorizonContent: React.FC<LongHorizonContentProps> = ({
  clientId,
  clientName,
  authAxios,
  toast,
  onSuccess,
  onClose,
  renderFooter,
}) => {
  const workflow = useLongHorizonWorkflow({
    clientId,
    clientName,
    authAxios,
    toast,
    onSuccess,
  });

  useEffect(() => {
    if ((workflow.state === 'plan_review' || workflow.state === 'approving') && workflow.editedPlan) {
      renderFooter(
        <LongHorizonReviewFooter
          state={workflow.state}
          isSubmitting={workflow.isSubmitting}
          auditLogId={workflow.auditLogId}
          onRegenerate={() => workflow.setState('configure_plan')}
          onApprove={() => {
            void workflow.handleApprove();
          }}
        />,
      );
    } else {
      renderFooter(null);
    }

    return () => {
      renderFooter(null);
    };
  }, [
    workflow.state,
    workflow.isSubmitting,
    workflow.editedPlan,
    workflow.auditLogId,
    workflow.handleApprove,
    workflow.setState,
    renderFooter,
  ]);

  if (workflow.state === 'idle') {
    return (
      <LongHorizonIdleState
        clientName={clientName}
        isSubmitting={workflow.isSubmitting}
        onConfigure={workflow.handleStartConfigure}
      />
    );
  }

  if (workflow.state === 'configure_plan') {
    return (
      <LongHorizonConfigureForm
        clientId={clientId}
        horizonMonths={workflow.horizonMonths}
        setHorizonMonths={workflow.setHorizonMonths}
        clientGoals={workflow.clientGoals}
        goalsLoading={workflow.goalsLoading}
        goalsError={workflow.goalsError}
        equipmentProfileId={workflow.equipmentProfileId}
        setEquipmentProfileId={workflow.setEquipmentProfileId}
        trainerNotes={workflow.trainerNotes}
        setTrainerNotes={workflow.setTrainerNotes}
        isAdmin={workflow.isAdmin}
        overrideReasonRequired={workflow.overrideReasonRequired}
        overrideReason={workflow.overrideReason}
        setOverrideReason={workflow.setOverrideReason}
        isSubmitting={workflow.isSubmitting}
        onClose={onClose}
        onGenerate={workflow.handleGenerate}
      />
    );
  }

  if (workflow.state === 'generating') {
    return <LongHorizonGeneratingState horizonMonths={workflow.horizonMonths} />;
  }

  if (workflow.state === 'degraded' && workflow.degradedData) {
    return (
      <LongHorizonDegradedState
        degradedData={workflow.degradedData}
        isSubmitting={workflow.isSubmitting}
        onRetry={workflow.handleGenerate}
        onBackToConfigure={() => workflow.setState('configure_plan')}
      />
    );
  }

  if ((workflow.state === 'error' || workflow.state === 'approve_error')) {
    return (
      <LongHorizonErrorState
        state={workflow.state}
        errorMessage={workflow.errorMessage}
        errorFlags={workflow.errorFlags}
        approveErrors={workflow.approveErrors}
        validationWarnings={workflow.validationWarnings}
        isSubmitting={workflow.isSubmitting}
        onRetry={workflow.handleGenerate}
        onAddOverride={workflow.handleRetryWithOverride}
        onBackToConfigure={() => workflow.setState('configure_plan')}
        onClose={onClose}
      />
    );
  }

  if ((workflow.state === 'plan_review' || workflow.state === 'approving') && workflow.editedPlan) {
    return (
      <LongHorizonPlanReviewEditor
        clientName={clientName}
        plan={workflow.editedPlan}
        warnings={workflow.warnings}
        auditLogId={workflow.auditLogId}
        trainerNotes={workflow.trainerNotes}
        setTrainerNotes={workflow.setTrainerNotes}
        expandedBlocks={workflow.expandedBlocks}
        onToggleBlock={workflow.toggleBlock}
        onUpdatePlanField={workflow.updatePlanField}
        onUpdateBlock={workflow.updateBlock}
        onExportPdf={workflow.handleExportPlanPdf}
        onRegenerate={() => workflow.setState('configure_plan')}
        isSubmitting={workflow.isSubmitting}
      />
    );
  }

  if (workflow.state === 'saved') {
    return (
      <LongHorizonSavedState
        savedPlanId={workflow.savedPlanId}
        savedBlockCount={workflow.savedBlockCount}
        validationWarnings={workflow.validationWarnings}
        eligibilityWarnings={workflow.eligibilityWarnings}
        onClose={onClose}
      />
    );
  }

  return null;
};

export default LongHorizonContent;
