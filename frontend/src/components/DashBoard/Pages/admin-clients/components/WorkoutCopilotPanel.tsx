/**
 * ============================================================================
 * FILE: WorkoutCopilotPanel.tsx
 * PURPOSE: Slim orchestrator for the AI Workout Copilot state machine.
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Owns the copilot's finite state machine
 * (idle → pain_check → generating → draft_review/degraded/error → approving → saved)
 * and routes rendering to decomposed sub-components. Draft editing, template
 * loading, reset behavior, and single-workout actions are delegated to hooks.
 *
 * HOW IT FITS IN THE APP: Mounted inside the admin client detail panel
 * (inline mode) or as a standalone modal (overlay mode).
 *
 * KEY DECISIONS: Decomposed from a 1,099-line monolith into focused files
 * per the 300-line max rule. The panel keeps state ownership and rendering;
 * hooks own reusable orchestration and JSX render blocks stay extracted.
 *
 * NASM PROTOCOL CONTEXT: Draft generation follows NASM OPT 5-phase model.
 * Pain safety check enforces NASM CES restrictions.
 */

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: WorkoutCopilotPanel                              ║
 * ║  PURPOSE: AI workout generation + approval state machine     ║
 * ║  OWNER: Claude Opus 4.6                                      ║
 * ║  LAST VALIDATED: 2026-03-25                                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ [Header: Workout Intelligence — ClientName] [X]            │
 * ├─────────┬──────────────────────────────────────────────────┤
 * │ Single  │ Long-Horizon │ (tabs)                            │
 * ├─────────┴──────────────────────────────────────────────────┤
 * │ [State-driven content area]                                │
 * │   idle → CopilotIdleState                                  │
 * │   pain_check → CopilotPainCheck                            │
 * │   generating → Spinner                                     │
 * │   error/approve_error/degraded → CopilotErrorStates        │
 * │   draft_review/approving → CopilotDraftReview              │
 * │   saved → CopilotSavedState                                │
 * ├────────────────────────────────────────────────────────────┤
 * │ [Footer: Regenerate | Approve & Save] (draft_review only)  │
 * └────────────────────────────────────────────────────────────┘
 *
 * MERMAID ARCHITECTURE:
 * graph TD
 *   A[WorkoutCopilotPanel] --> B[CopilotIdleState]
 *   A --> C[CopilotPainCheck]
 *   A --> D[CopilotErrorStates]
 *   A --> E[CopilotDraftReview]
 *   A --> F[CopilotSavedState]
 *   A --> G[LongHorizonContent]
 *
 * DATA FLOW:
 * Props In:  WorkoutCopilotPanelProps (open, onClose, clientId, clientName, ...)
 * State:     Panel-owned CopilotState FSM + draft/error/pain data
 * API Calls: Delegated through hooks/services for generate/approve/templates/pain
 * Children:  CopilotIdleState, CopilotPainCheck, CopilotErrorStates,
 *            CopilotDraftReview, CopilotSavedState, LongHorizonContent
 */

import React, { useState, useCallback, useMemo } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { useToast } from '../../../../../hooks/use-toast';
import { createAiWorkoutService } from '../../../../../services/aiWorkoutService';
import { createPainEntryService } from '../../../../../services/painEntryService';

import type {
  CopilotState,
  WorkoutCopilotPanelProps,
  Explainability,
  SafetyConstraints,
  ExerciseRecommendation,
  ValidationError,
  DegradedResponse,
  PainEntry,
} from './copilot-types';

import {
  ModalOverlay,
  ModalPanel,
  ModalHeader,
  ModalTitle,
  CloseButton,
  ModalBody,
  ModalFooter,
  InlineWrapper,
  InlinePanel,
} from './copilot-shared-styles';

import CopilotIdleState from './CopilotIdleState';
import CopilotPainCheck from './CopilotPainCheck';
import CopilotErrorStates from './CopilotErrorStates';
import CopilotDraftReview from './CopilotDraftReview';
import CopilotSavedState from './CopilotSavedState';
import LongHorizonContent from './LongHorizonContent';
import CopilotGeneratingState from './CopilotGeneratingState';
import CopilotModeTabs, { type CopilotModeTab } from './CopilotModeTabs';
import CopilotSingleWorkoutFooter from './CopilotSingleWorkoutFooter';
import { getCopilotErrorFlags } from './copilot-error-flags';
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

  // ── Error classification ────────────────────────────────────

  const errorFlags = useMemo(() => getCopilotErrorFlags(errorCode), [errorCode]);

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

        <ModalBody>
          {activeTab === 'single' && (
            <>
              {state === 'idle' && (
                <CopilotIdleState
                  clientName={clientName}
                  isAdmin={isAdmin}
                  overrideReasonRequired={overrideReasonRequired}
                  overrideReason={overrideReason}
                  setOverrideReason={setOverrideReason}
                  handleGenerate={handleGenerate}
                  isSubmitting={isSubmitting}
                  templatesLoading={templatesLoading}
                  templates={templates}
                />
              )}

              {state === 'pain_check' && (
                <CopilotPainCheck
                  clientName={clientName}
                  activePainEntries={activePainEntries}
                  isSubmitting={isSubmitting}
                  setState={setState}
                  handlePainAcknowledgeAndGenerate={handlePainAcknowledgeAndGenerate}
                />
              )}

              {state === 'generating' && (
                <CopilotGeneratingState />
              )}

              {(state === 'error' || state === 'approve_error' || state === 'degraded') && (
                <CopilotErrorStates
                  state={state}
                  errorMessage={errorMessage}
                  approveErrors={approveErrors}
                  degradedData={degradedData}
                  isConsentError={errorFlags.isConsentError}
                  isWaiverError={errorFlags.isWaiverError}
                  isAssignmentError={errorFlags.isAssignmentError}
                  isOverrideError={errorFlags.isOverrideError}
                  isRetryable={errorFlags.isRetryable}
                  handleGenerate={handleGenerate}
                  isSubmitting={isSubmitting}
                  onClose={onClose}
                  setState={setState}
                  editedPlan={editedPlan}
                  setOverrideReasonRequired={setOverrideReasonRequired}
                />
              )}

              {(state === 'draft_review' || state === 'approving') && editedPlan && (
                <CopilotDraftReview
                  editedPlan={editedPlan}
                  explainability={explainability}
                  safetyConstraints={safetyConstraints}
                  exerciseRecs={exerciseRecs}
                  warnings={warnings}
                  missingInputs={missingInputs}
                  generationMode={generationMode}
                  expandedDays={expandedDays}
                  toggleDay={toggleDay}
                  updatePlanField={updatePlanField}
                  updateDay={updateDay}
                  updateExercise={updateExercise}
                  addExercise={addExercise}
                  removeExercise={removeExercise}
                  trainerNotes={trainerNotes}
                  setTrainerNotes={setTrainerNotes}
                />
              )}

              {state === 'saved' && (
                <CopilotSavedState
                  savedPlanId={savedPlanId}
                  clientName={clientName}
                  unmatchedExercises={unmatchedExercises}
                  validationWarnings={validationWarnings}
                  onClose={onClose}
                />
              )}
            </>
          )}

          {activeTab === 'long-horizon' && (
            <LongHorizonContent
              clientId={clientId}
              clientName={clientName}
              authAxios={authAxios}
              toast={toast}
              onSuccess={onSuccess}
              onClose={onClose}
              renderFooter={setLhFooterContent}
            />
          )}
        </ModalBody>

        {/* Footer: only show approve button during draft review */}
        {activeTab === 'single' && (state === 'draft_review' || state === 'approving') && (
          <CopilotSingleWorkoutFooter
            state={state}
            isSubmitting={isSubmitting}
            onApprove={handleApprove}
            onRegenerate={handleRegenerateSingleWorkout}
          />
        )}

        {activeTab === 'long-horizon' && lhFooterContent && (
          <ModalFooter>{lhFooterContent}</ModalFooter>
        )}
      </Panel>
    </Wrapper>
  );
};

export default WorkoutCopilotPanel;
