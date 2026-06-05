/**
 * ============================================================================
 * FILE: WorkoutCopilotPanel.tsx
 * PURPOSE: Slim orchestrator for the AI Workout Copilot state machine.
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Manages the copilot's finite state machine
 * (idle → pain_check → generating → draft_review/degraded/error → approving → saved)
 * and routes rendering to decomposed sub-components. All state and handler
 * logic lives here; sub-components are pure UI.
 *
 * HOW IT FITS IN THE APP: Mounted inside the admin client detail panel
 * (inline mode) or as a standalone modal (overlay mode).
 *
 * KEY DECISIONS: Decomposed from a 1,099-line monolith into 8 files per
 * the 300-line max rule. State machine + handlers stay here; JSX render
 * blocks extracted to CopilotIdleState, CopilotPainCheck, CopilotErrorStates,
 * CopilotDraftReview, CopilotSavedState.
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
 * State:     CopilotState FSM + draft data + error data + pain entries
 * API Calls: generateDraft, approveDraft, listTemplates, getActivePain
 * Children:  CopilotIdleState, CopilotPainCheck, CopilotErrorStates,
 *            CopilotDraftReview, CopilotSavedState, LongHorizonContent
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { useToast } from '../../../../../hooks/use-toast';
import {
  createAiWorkoutService,
  isDegraded,
  isDraftSuccess,
} from '../../../../../services/aiWorkoutService';
import { createPainEntryService } from '../../../../../services/painEntryService';

import type {
  CopilotState,
  WorkoutCopilotPanelProps,
  WorkoutPlan,
  WorkoutDay,
  Exercise,
  Explainability,
  SafetyConstraints,
  ExerciseRecommendation,
  ValidationError,
  TemplateEntry,
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

interface ApiErrorPayload {
  code?: string;
  message?: string;
  errors?: ValidationError[];
}

interface ApiErrorLike {
  message?: string;
  response?: {
    data?: ApiErrorPayload;
  };
}

const getApiError = (err: unknown): { data: ApiErrorPayload; message?: string } => {
  const apiError = err as ApiErrorLike;
  return {
    data: apiError.response?.data || {},
    message: apiError.message,
  };
};

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

  // ── State Machine ───────────────────────────────────────────
  const [state, setState] = useState<CopilotState>('idle');

  // ── Draft data ──────────────────────────────────────────────
  const [editedPlan, setEditedPlan] = useState<WorkoutPlan | null>(null);
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

  // ── Expanded days ───────────────────────────────────────────
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());

  // ── Template catalog ──────────────────────────────────────────
  const [templates, setTemplates] = useState<TemplateEntry[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // ── Pain safety check ──────────────────────────────────────
  const [activePainEntries, setActivePainEntries] = useState<PainEntry[]>([]);
  const [painAcknowledged, setPainAcknowledged] = useState(false);

  // ── Double-submit guard ─────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<CopilotModeTab>('single');
  const [lhFooterContent, setLhFooterContent] = useState<React.ReactNode | null>(null);

  // ── Reset on open ───────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setState('idle');
      setEditedPlan(null);
      setExplainability(null);
      setSafetyConstraints(null);
      setExerciseRecs([]);
      setWarnings([]);
      setMissingInputs([]);
      setGenerationMode('');
      setAuditLogId(null);
      setTrainerNotes('');
      setOverrideReason('');
      setOverrideReasonRequired(false);
      setDegradedData(null);
      setSavedPlanId(null);
      setUnmatchedExercises([]);
      setValidationWarnings([]);
      setErrorMessage('');
      setErrorCode('');
      setApproveErrors([]);
      setActivePainEntries([]);
      setPainAcknowledged(false);
      setExpandedDays(new Set());
      setIsSubmitting(false);
      setActiveTab('single');
      setLhFooterContent(null);
      setTemplates([]);
      setTemplatesLoading(true);
      service.listTemplates()
        .then((resp) => { if (resp.success) setTemplates(resp.templates); })
        .catch(() => { /* silent -- templates are informational for coach awareness */ })
        .finally(() => setTemplatesLoading(false));
    }
  }, [open, service]);

  // ── Auto-generate on open (skip idle screen) ──────────────
  const autoGenerateTriggered = useRef(false);
  const checkPainEntriesRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!open) {
      autoGenerateTriggered.current = false;
      return;
    }
    if (autoGenerate && !autoGenerateTriggered.current && state === 'idle' && !isSubmitting) {
      autoGenerateTriggered.current = true;
      const timer = setTimeout(() => {
        void checkPainEntriesRef.current?.();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open, autoGenerate, state, isSubmitting]);

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

  // ── Generate draft ──────────────────────────────────────────

  const doGenerate = useCallback(async () => {
    setIsSubmitting(true);
    setState('generating');
    setErrorMessage('');
    setErrorCode('');

    try {
      const resp = await service.generateDraft(clientId, overrideReason.trim() || undefined);

      if (isDegraded(resp)) {
        setDegradedData(resp);
        setState('degraded');
      } else if (isDraftSuccess(resp)) {
        setEditedPlan(resp.plan);
        setExplainability(resp.explainability);
        setSafetyConstraints(resp.safetyConstraints);
        setExerciseRecs(resp.exerciseRecommendations);
        setWarnings(resp.warnings);
        setMissingInputs(resp.missingInputs);
        setGenerationMode(resp.generationMode);
        setAuditLogId(resp.auditLogId);
        if (resp.plan.days.length > 0) {
          setExpandedDays(new Set([0]));
        }
        setState('draft_review');
      }
    } catch (err: unknown) {
      const { data, message } = getApiError(err);
      if (data.code === 'MISSING_OVERRIDE_REASON') {
        if (overrideReasonRequired) {
          setErrorMessage(data.message || 'Admin override requires a reason');
          setErrorCode(data.code || '');
          setState('error');
          return;
        }
        setOverrideReasonRequired(true);
        setState('idle');
        return;
      }
      setErrorMessage(data.message || message || 'Failed to generate workout plan');
      setErrorCode(data.code || '');
      setState('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [clientId, overrideReason, overrideReasonRequired, service]);

  // ── Pain safety check ──────────────────────────────────────

  const checkPainEntries = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const resp = await painService.getActive(clientId);
      const entries = resp.entries || [];

      if (entries.length > 0 && !painAcknowledged) {
        setActivePainEntries(entries);
        setState('pain_check');
      } else {
        // No active pain entries (or already acknowledged) — proceed directly
        await doGenerate();
        return; // doGenerate manages isSubmitting
      }
    } catch {
      // If pain check fails, proceed with generation (fail-open for UX)
      await doGenerate();
      return;
    }

    setIsSubmitting(false);
  }, [clientId, isSubmitting, painAcknowledged, doGenerate, painService]);

  useEffect(() => {
    checkPainEntriesRef.current = checkPainEntries;
  }, [checkPainEntries]);

  const handleGenerate = useCallback(async () => {
    if (isSubmitting) return;
    await checkPainEntries();
  }, [isSubmitting, checkPainEntries]);

  const handlePainAcknowledgeAndGenerate = useCallback(() => {
    setPainAcknowledged(true);
    doGenerate();
  }, [doGenerate]);

  // ── Approve draft ───────────────────────────────────────────

  const handleApprove = useCallback(async () => {
    if (isSubmitting || !editedPlan) return;
    setIsSubmitting(true);
    setState('approving');
    setApproveErrors([]);

    try {
      const resp = await service.approveDraft({
        userId: clientId,
        plan: editedPlan,
        auditLogId,
        overrideReason: overrideReason.trim() || undefined,
        trainerNotes: trainerNotes.trim() || undefined,
      });

      setSavedPlanId(resp.planId);
      setUnmatchedExercises(resp.unmatchedExercises);
      setValidationWarnings(resp.validationWarnings);
      setState('saved');

      toast({
        title: 'Workout Plan Approved',
        description: `Plan saved (ID: ${resp.planId}) for ${clientName}`,
        variant: 'default',
      });

      onSuccess?.();
    } catch (err: unknown) {
      const { data } = getApiError(err);
      if (data.code === 'MISSING_OVERRIDE_REASON') {
        if (overrideReasonRequired) {
          setErrorMessage(data.message || 'Admin override requires a reason');
          setErrorCode(data.code || '');
          setState('approve_error');
          return;
        }
        setOverrideReasonRequired(true);
        setState('idle');
        return;
      }
      setErrorMessage(data.message || 'Failed to approve plan');
      setErrorCode(data.code || '');
      setApproveErrors(data.errors || []);
      setState('approve_error');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    clientId, editedPlan, auditLogId, overrideReason, overrideReasonRequired,
    trainerNotes, isSubmitting, clientName, service, toast, onSuccess,
  ]);

  // ── Plan editing helpers ────────────────────────────────────

  const updatePlanField = <K extends keyof WorkoutPlan>(field: K, value: WorkoutPlan[K]) => {
    setEditedPlan(prev => prev ? { ...prev, [field]: value } : null);
  };

  const updateDay = <K extends keyof WorkoutDay>(dayIdx: number, field: K, value: WorkoutDay[K]) => {
    setEditedPlan(prev => {
      if (!prev) return null;
      const days = [...prev.days];
      days[dayIdx] = { ...days[dayIdx], [field]: value };
      return { ...prev, days };
    });
  };

  const updateExercise = <K extends keyof Exercise>(
    dayIdx: number,
    exIdx: number,
    field: K,
    value: Exercise[K],
  ) => {
    setEditedPlan(prev => {
      if (!prev) return null;
      const days = [...prev.days];
      const exercises = [...days[dayIdx].exercises];
      exercises[exIdx] = { ...exercises[exIdx], [field]: value };
      days[dayIdx] = { ...days[dayIdx], exercises };
      return { ...prev, days };
    });
  };

  const addExercise = (dayIdx: number) => {
    setEditedPlan(prev => {
      if (!prev) return null;
      const days = [...prev.days];
      const exercises = [...days[dayIdx].exercises, { name: '', setScheme: '', repGoal: '', restPeriod: 60 }];
      days[dayIdx] = { ...days[dayIdx], exercises };
      return { ...prev, days };
    });
  };

  const removeExercise = (dayIdx: number, exIdx: number) => {
    setEditedPlan(prev => {
      if (!prev) return null;
      const days = [...prev.days];
      const exercises = days[dayIdx].exercises.filter((_, i) => i !== exIdx);
      days[dayIdx] = { ...days[dayIdx], exercises };
      return { ...prev, days };
    });
  };

  const toggleDay = (dayIdx: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      next.has(dayIdx) ? next.delete(dayIdx) : next.add(dayIdx);
      return next;
    });
  };

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
