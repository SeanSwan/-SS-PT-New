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
 * and delegates active body/footer rendering to CopilotPanelContent. Draft
 * editing, template loading, reset behavior, and single-workout actions are
 * delegated to hooks.
 *
 * HOW IT FITS IN THE APP: Mounted inside the admin client detail panel
 * (inline mode) or as a standalone modal (overlay mode).
 *
 * KEY DECISIONS: Decomposed from a 1,099-line monolith into focused files
 * per the 300-line max rule. The panel keeps state ownership and top-shell
 * rendering; CopilotPanelContent owns state-driven body/footer branches, while
 * hooks own reusable orchestration.
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
 * │ [CopilotPanelContent: state-driven body/footer]            │
 * │   single workout delegates by FSM state                    │
 * │   long horizon delegates to LongHorizonContent             │
 * ├────────────────────────────────────────────────────────────┤
 * │ [Footer: Regenerate | Approve & Save] (draft_review only)  │
 * └────────────────────────────────────────────────────────────┘
 *
 * MERMAID ARCHITECTURE:
 * graph TD
 *   A[WorkoutCopilotPanel] --> B[CopilotPanelContent]
 *   B --> C[Single workout FSM content]
 *   B --> D[LongHorizonContent]
 *   C --> E[CopilotDraftReview]
 *   C --> F[CopilotSingleWorkoutFooter]
 *
 * DATA FLOW:
 * Props In:  WorkoutCopilotPanelProps (open, onClose, clientId, clientName, ...)
 * State:     Panel-owned CopilotState FSM + draft/error/pain data
 * API Calls: Delegated through hooks/services for generate/approve/templates/pain
 * Children:  CopilotPanelContent, CopilotModeTabs
 * Delegates: CopilotPanelContent owns state-specific body/footer children.
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
