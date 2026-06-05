/**
 * CopilotPanelContent
 *
 * Purpose: Renders the active copilot body/footer branches while
 * WorkoutCopilotPanel keeps state ownership and top-level shell structure.
 */

import React from 'react';
import type { Toast } from '../../../../../hooks/use-toast';
import type { createAiWorkoutService } from '../../../../../services/aiWorkoutService';
import type { CopilotModeTab } from './CopilotModeTabs';
import CopilotIdleState from './CopilotIdleState';
import CopilotPainCheck from './CopilotPainCheck';
import CopilotErrorStates from './CopilotErrorStates';
import CopilotDraftReview from './CopilotDraftReview';
import CopilotSavedState from './CopilotSavedState';
import LongHorizonContent from './LongHorizonContent';
import CopilotGeneratingState from './CopilotGeneratingState';
import CopilotSingleWorkoutFooter from './CopilotSingleWorkoutFooter';
import { getCopilotErrorFlags } from './copilot-error-flags';
import { ModalBody, ModalFooter } from './copilot-shared-styles';
import type {
  CopilotState,
  DegradedResponse,
  Exercise,
  ExerciseRecommendation,
  Explainability,
  PainEntry,
  SafetyConstraints,
  TemplateEntry,
  ValidationError,
  WorkoutDay,
  WorkoutPlan,
} from './copilot-types';

type ToastFn = (opts: Omit<Toast, 'id'>) => void;

interface SingleWorkoutContentProps {
  state: CopilotState;
  clientName: string;
  isAdmin: boolean;
  overrideReasonRequired: boolean;
  overrideReason: string;
  setOverrideReason: (value: string) => void;
  handleGenerate: () => void;
  isSubmitting: boolean;
  templatesLoading: boolean;
  templates: TemplateEntry[];
  activePainEntries: PainEntry[];
  setState: (state: CopilotState) => void;
  handlePainAcknowledgeAndGenerate: () => void;
  errorMessage: string;
  approveErrors: ValidationError[];
  degradedData: DegradedResponse | null;
  errorCode: string;
  onClose: () => void;
  editedPlan: WorkoutPlan | null;
  setOverrideReasonRequired: (value: boolean) => void;
  explainability: Explainability | null;
  safetyConstraints: SafetyConstraints | null;
  exerciseRecs: ExerciseRecommendation[];
  warnings: string[];
  missingInputs: string[];
  generationMode: string;
  expandedDays: Set<number>;
  toggleDay: (dayIdx: number) => void;
  updatePlanField: <K extends keyof WorkoutPlan>(field: K, value: WorkoutPlan[K]) => void;
  updateDay: <K extends keyof WorkoutDay>(dayIdx: number, field: K, value: WorkoutDay[K]) => void;
  updateExercise: <K extends keyof Exercise>(
    dayIdx: number,
    exIdx: number,
    field: K,
    value: Exercise[K],
  ) => void;
  addExercise: (dayIdx: number) => void;
  removeExercise: (dayIdx: number, exIdx: number) => void;
  trainerNotes: string;
  setTrainerNotes: (value: string) => void;
  savedPlanId: number | null;
  unmatchedExercises: Array<{ dayNumber: number; name: string }>;
  validationWarnings: ValidationError[];
}

interface LongHorizonContentProps {
  clientId: number;
  clientName: string;
  authAxios: Parameters<typeof createAiWorkoutService>[0];
  toast: ToastFn;
  onSuccess?: () => void;
  onClose: () => void;
  renderFooter: (content: React.ReactNode | null) => void;
}

interface CopilotPanelFooterProps {
  state: CopilotState;
  isSubmitting: boolean;
  lhFooterContent: React.ReactNode | null;
  onApprove: () => void;
  onRegenerate: () => void;
}

interface CopilotPanelContentProps {
  activeTab: CopilotModeTab;
  singleWorkout: SingleWorkoutContentProps;
  longHorizon: LongHorizonContentProps;
  footer: CopilotPanelFooterProps;
}

const SingleWorkoutContent: React.FC<SingleWorkoutContentProps> = (props) => {
  const errorFlags = getCopilotErrorFlags(props.errorCode);

  return (
    <>
      {props.state === 'idle' && (
        <CopilotIdleState
          clientName={props.clientName}
          isAdmin={props.isAdmin}
          overrideReasonRequired={props.overrideReasonRequired}
          overrideReason={props.overrideReason}
          setOverrideReason={props.setOverrideReason}
          handleGenerate={props.handleGenerate}
          isSubmitting={props.isSubmitting}
          templatesLoading={props.templatesLoading}
          templates={props.templates}
        />
      )}

      {props.state === 'pain_check' && (
        <CopilotPainCheck
          clientName={props.clientName}
          activePainEntries={props.activePainEntries}
          isSubmitting={props.isSubmitting}
          setState={props.setState}
          handlePainAcknowledgeAndGenerate={props.handlePainAcknowledgeAndGenerate}
        />
      )}

      {props.state === 'generating' && <CopilotGeneratingState />}

      {(props.state === 'error' || props.state === 'approve_error' || props.state === 'degraded') && (
        <CopilotErrorStates
          state={props.state}
          errorMessage={props.errorMessage}
          approveErrors={props.approveErrors}
          degradedData={props.degradedData}
          isConsentError={errorFlags.isConsentError}
          isWaiverError={errorFlags.isWaiverError}
          isAssignmentError={errorFlags.isAssignmentError}
          isOverrideError={errorFlags.isOverrideError}
          isRetryable={errorFlags.isRetryable}
          handleGenerate={props.handleGenerate}
          isSubmitting={props.isSubmitting}
          onClose={props.onClose}
          setState={props.setState}
          editedPlan={props.editedPlan}
          setOverrideReasonRequired={props.setOverrideReasonRequired}
        />
      )}

      {(props.state === 'draft_review' || props.state === 'approving') && props.editedPlan && (
        <CopilotDraftReview
          editedPlan={props.editedPlan}
          explainability={props.explainability}
          safetyConstraints={props.safetyConstraints}
          exerciseRecs={props.exerciseRecs}
          warnings={props.warnings}
          missingInputs={props.missingInputs}
          generationMode={props.generationMode}
          expandedDays={props.expandedDays}
          toggleDay={props.toggleDay}
          updatePlanField={props.updatePlanField}
          updateDay={props.updateDay}
          updateExercise={props.updateExercise}
          addExercise={props.addExercise}
          removeExercise={props.removeExercise}
          trainerNotes={props.trainerNotes}
          setTrainerNotes={props.setTrainerNotes}
        />
      )}

      {props.state === 'saved' && (
        <CopilotSavedState
          savedPlanId={props.savedPlanId}
          clientName={props.clientName}
          unmatchedExercises={props.unmatchedExercises}
          validationWarnings={props.validationWarnings}
          onClose={props.onClose}
        />
      )}
    </>
  );
};

const CopilotPanelContent: React.FC<CopilotPanelContentProps> = ({
  activeTab,
  singleWorkout,
  longHorizon,
  footer,
}) => (
  <>
    <ModalBody>
      {activeTab === 'single' && <SingleWorkoutContent {...singleWorkout} />}

      {activeTab === 'long-horizon' && (
        <LongHorizonContent
          clientId={longHorizon.clientId}
          clientName={longHorizon.clientName}
          authAxios={longHorizon.authAxios}
          toast={longHorizon.toast}
          onSuccess={longHorizon.onSuccess}
          onClose={longHorizon.onClose}
          renderFooter={longHorizon.renderFooter}
        />
      )}
    </ModalBody>

    {activeTab === 'single' && (footer.state === 'draft_review' || footer.state === 'approving') && (
      <CopilotSingleWorkoutFooter
        state={footer.state}
        isSubmitting={footer.isSubmitting}
        onApprove={footer.onApprove}
        onRegenerate={footer.onRegenerate}
      />
    )}

    {activeTab === 'long-horizon' && footer.lhFooterContent && (
      <ModalFooter>{footer.lhFooterContent}</ModalFooter>
    )}
  </>
);

export default React.memo(CopilotPanelContent);
