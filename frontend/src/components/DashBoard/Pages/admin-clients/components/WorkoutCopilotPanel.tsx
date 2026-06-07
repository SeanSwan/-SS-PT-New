/**
 * WorkoutCopilotPanel
 *
 * Purpose: Owns the AI Workout Copilot state machine and renders the top shell.
 * Mounted by TrainingTabContent in the admin client workspace.
 *
 * Runtime flow:
 * - Template loading, draft editing, reset behavior, and generate/approve
 *   actions are delegated to focused copilot hooks.
 * - CopilotPanelContent renders single-workout and long-horizon body/footer UI.
 *
 * Safety: NASM pain checks and AI waiver/override errors stay enforced through
 * the action hook and delegated content components.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { useToast } from '../../../../../hooks/use-toast';
import { createAiWorkoutService } from '../../../../../services/aiWorkoutService';
import { createPainEntryService } from '../../../../../services/painEntryService';

import type { CopilotState, WorkoutCopilotPanelProps, Explainability, SafetyConstraints, ExerciseRecommendation, ValidationError, DegradedResponse, PainEntry, SwanCoachPlanningFingerprint } from './copilot-types';

import {
  ModalOverlay,
  ModalPanel,
  ModalHeader,
  ModalTitle,
  CloseButton,
  InlineWrapper,
  InlinePanel,
} from './copilot-shared-styles';

import CopilotPanelContent from './CopilotPanelContent';
import CopilotModeTabs, { type CopilotModeTab } from './CopilotModeTabs';
import { useCopilotDraftEditor } from './useCopilotDraftEditor';
import { useCopilotPanelReset } from './useCopilotPanelReset';
import { useCopilotSingleWorkoutActions } from './useCopilotSingleWorkoutActions';
import { useCopilotTemplateCatalog } from './useCopilotTemplateCatalog';

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: State machine orchestrator — all state lives here,
// sub-components are stateless UI renderers.
// ─────────────────────────────────────────────────────────────

const WorkoutCopilotPanel: React.FC<WorkoutCopilotPanelProps> = ({
  open,
  onClose,
  clientId,
  clientName,
  onSuccess,
  autoGenerate = false,
  inline = false,
}) => {
  const { authAxios, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { toast } = useToast();
  const service = useMemo(() => createAiWorkoutService(authAxios), [authAxios]);
  const painService = useMemo(() => createPainEntryService(authAxios), [authAxios]);
  const { templates, templatesLoading } = useCopilotTemplateCatalog({ open, service });
  const {
    editedPlan,
    setEditedPlan,
    expandedDays,
    setExpandedDays,
    updatePlanField,
    updateDay,
    updateExercise,
    addExercise,
    removeExercise,
    toggleDay,
  } = useCopilotDraftEditor();

  // ── State Machine ───────────────────────────────────────────
  const [state, setState] = useState<CopilotState>('idle');

  // ── Draft data ──────────────────────────────────────────────
  const [explainability, setExplainability] = useState<Explainability | null>(null);
  const [safetyConstraints, setSafetyConstraints] = useState<SafetyConstraints | null>(null);
  const [exerciseRecs, setExerciseRecs] = useState<ExerciseRecommendation[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [missingInputs, setMissingInputs] = useState<string[]>([]);
  const [generationMode, setGenerationMode] = useState<string>('');
  const [swanCoachPlanning, setSwanCoachPlanning] = useState<SwanCoachPlanningFingerprint | null>(null);
  const [planningReviewAcknowledged, setPlanningReviewAcknowledged] = useState(false);
  const [auditLogId, setAuditLogId] = useState<number | null>(null);
  const [trainerNotes, setTrainerNotes] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideReasonRequired, setOverrideReasonRequired] = useState(false);

  // ── Degraded data ───────────────────────────────────────────
  const [degradedData, setDegradedData] = useState<DegradedResponse | null>(null);

  // ── Saved data ──────────────────────────────────────────────
  const [savedPlanId, setSavedPlanId] = useState<number | null>(null);
  const [unmatchedExercises, setUnmatchedExercises] = useState<Array<{ dayNumber: number; name: string }>>([]);
  const [validationWarnings, setValidationWarnings] = useState<ValidationError[]>([]);

  // ── Error data ──────────────────────────────────────────────
  const [errorMessage, setErrorMessage] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [approveErrors, setApproveErrors] = useState<ValidationError[]>([]);

  // ── Pain safety check ──────────────────────────────────────
  const [activePainEntries, setActivePainEntries] = useState<PainEntry[]>([]);
  const [painAcknowledged, setPainAcknowledged] = useState(false);

  // ── Double-submit guard ─────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<CopilotModeTab>('single');
  const [lhFooterContent, setLhFooterContent] = useState<React.ReactNode | null>(null);

  useCopilotPanelReset({
    open,
    setState,
    setEditedPlan,
    setExplainability,
    setSafetyConstraints,
    setExerciseRecs,
    setWarnings,
    setMissingInputs,
    setGenerationMode,
    setSwanCoachPlanning,
    setPlanningReviewAcknowledged,
    setAuditLogId,
    setTrainerNotes,
    setOverrideReason,
    setOverrideReasonRequired,
    setDegradedData,
    setSavedPlanId,
    setUnmatchedExercises,
    setValidationWarnings,
    setErrorMessage,
    setErrorCode,
    setApproveErrors,
    setActivePainEntries,
    setPainAcknowledged,
    setExpandedDays,
    setIsSubmitting,
    setActiveTab,
    setLhFooterContent,
  });

  // ── Single workout actions ─────────────────────────────────
  const {
    handleGenerate,
    handlePainAcknowledgeAndGenerate,
    handleApprove,
  } = useCopilotSingleWorkoutActions({
    open,
    autoGenerate,
    state,
    isSubmitting,
    clientId,
    clientName,
    editedPlan,
    auditLogId,
    overrideReason,
    overrideReasonRequired,
    trainerNotes,
    planningReviewAcknowledged,
    painAcknowledged,
    service,
    painService,
    toast,
    onSuccess,
    setState,
    setEditedPlan,
    setExplainability,
    setSafetyConstraints,
    setExerciseRecs,
    setWarnings,
    setMissingInputs,
    setGenerationMode,
    setSwanCoachPlanning,
    setPlanningReviewAcknowledged,
    setAuditLogId,
    setOverrideReasonRequired,
    setDegradedData,
    setSavedPlanId,
    setUnmatchedExercises,
    setValidationWarnings,
    setErrorMessage,
    setErrorCode,
    setApproveErrors,
    setActivePainEntries,
    setPainAcknowledged,
    setExpandedDays,
    setIsSubmitting,
  });

  const handleSelectSingleTab = useCallback(() => {
    setActiveTab('single');
    setLhFooterContent(null);
  }, []);

  const handleSelectLongHorizonTab = useCallback(() => {
    setActiveTab('long-horizon');
  }, []);

  const handleRegenerateSingleWorkout = useCallback(() => {
    setState('idle');
    setEditedPlan(null);
  }, []);

  // ── Render ──────────────────────────────────────────────────

  if (!open) return null;

  const Wrapper = inline ? InlineWrapper : ModalOverlay;
  const Panel = inline ? InlinePanel : ModalPanel;

  return (
    <Wrapper onClick={inline ? undefined : (e: React.MouseEvent) => e.target === e.currentTarget && onClose()}>
      <Panel onClick={inline ? undefined : (e: React.MouseEvent) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <Sparkles size={20} />
            Workout Intelligence {inline ? '' : `- ${clientName}`}
          </ModalTitle>
          {!inline && <CloseButton onClick={onClose}><X size={20} /></CloseButton>}
        </ModalHeader>

        <CopilotModeTabs
          activeTab={activeTab}
          onSelectSingle={handleSelectSingleTab}
          onSelectLongHorizon={handleSelectLongHorizonTab}
        />

        <CopilotPanelContent
          activeTab={activeTab}
          singleWorkout={{
            state,
            clientName,
            isAdmin,
            overrideReasonRequired,
            overrideReason,
            setOverrideReason,
            handleGenerate,
            isSubmitting,
            templatesLoading,
            templates,
            activePainEntries,
            setState,
            handlePainAcknowledgeAndGenerate,
            errorMessage,
            approveErrors,
            degradedData,
            errorCode,
            onClose,
            editedPlan,
            setOverrideReasonRequired,
            explainability,
            safetyConstraints,
            exerciseRecs,
            warnings,
            missingInputs,
            swanCoachPlanning,
            planningReviewAcknowledged,
            setPlanningReviewAcknowledged,
            generationMode,
            expandedDays,
            toggleDay,
            updatePlanField,
            updateDay,
            updateExercise,
            addExercise,
            removeExercise,
            trainerNotes,
            setTrainerNotes,
            savedPlanId,
            unmatchedExercises,
            validationWarnings,
          }}
          longHorizon={{
            clientId,
            clientName,
            authAxios,
            toast,
            onSuccess,
            onClose,
            renderFooter: setLhFooterContent,
          }}
          footer={{
            state,
            isSubmitting,
            lhFooterContent,
            onApprove: handleApprove,
            onRegenerate: handleRegenerateSingleWorkout,
          }}
        />
      </Panel>
    </Wrapper>
  );
};

export default WorkoutCopilotPanel;
