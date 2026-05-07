/**
 * ============================================================================
 * FILE: SwanCoachTypes.ts
 * PURPOSE: TypeScript interfaces for Swan Studios Coach Assistant
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-30
 * AI VILLAGE VALIDATED: 2026-03-30 (11-brain consensus)
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────
// SECTION: Response Styles
// ─────────────────────────────────────────────────────────────
export type ResponseStyle = 'phd_only' | 'balanced' | 'simple_only';

export interface ResponseStyleOption {
  key: ResponseStyle;
  label: string;
  emoji: string;
  description: string;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Context Types
// ─────────────────────────────────────────────────────────────
export type CoachContext =
  | 'coach_assistant'
  | 'general'
  | 'macro_logging'
  | 'form_tips'
  | 'workout_suggestions'
  | 'workout_generation'
  | 'client_review'
  | 'data_management'
  | 'scheduling'
  | 'progress_analysis'
  | 'exercise_library'
  | 'gamification'
  | 'client_onboarding';

export interface ContextChip {
  key: CoachContext;
  label: string;
  emoji: string;
  roles: ('admin' | 'trainer' | 'client')[];
}

// ─────────────────────────────────────────────────────────────
// SECTION: Messages
// ─────────────────────────────────────────────────────────────
export interface CoachMessageData {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  context?: CoachContext;
  metadata?: {
    provider?: string;
    model?: string;
    tokenUsage?: {
      inputTokens: number | null;
      outputTokens: number | null;
      totalTokens: number | null;
    };
    clientCreateResult?: {
      success: boolean;
      clientId?: number;
      firstName?: string;
      lastName?: string;
      username?: string;
      temporaryPassword?: string;
      claimCode?: string;
      claimUrl?: string;
      isMoveFitness?: boolean;
      sectionsPreFilled?: number;
      totalSections?: number;
      completionPercentage?: number;
      reason?: string;
      existingId?: number;
    };
    workoutImportResults?: Array<{
      success: boolean;
      date?: string;
      sessionId?: string;
      exerciseCount?: number;
      totalSets?: number;
      totalReps?: number;
      totalWeight?: number;
      reason?: string;
    }>;
    coachActionProposals?: CoachActionProposal[];
    coachActionProposalError?: {
      code: string;
      message: string;
    };
    /** Injected by command lane — renders ConfirmationCard in CoachMessage */
    commandConfirmation?: {
      message: string;
      operationId: string | null;
      command: string;
      params: Record<string, unknown>;
      client: { id?: number; firstName?: string; lastName?: string } | null;
      details: Record<string, unknown> | null;
      isDestructive: boolean;
    };
    /** Injected by command lane — renders ExecutionResultCard in CoachMessage */
    commandResult?: {
      command: string;
      result: Record<string, unknown> | null;
      client: { id?: number; firstName?: string } | null;
      message?: string;
    };
    /**
     * Injected by Swan-first transcript intake — renders TranscriptReviewCard
     * in CoachMessage. Set when the upload pipeline returns a parsed workout
     * but the user has not yet confirmed/applied it. Cleared on confirm or
     * cancel; replaced by transcriptResult on successful apply.
     */
    transcriptReview?: {
      transcript: string;
      parsedWorkout: {
        exercises: Array<{
          exerciseName: string;
          sets: Array<{
            setNumber: number;
            weight: number | null;
            reps: number;
            rpe?: number;
            notes?: string;
            tempo?: string;
          }>;
          formRating?: number;
          painLevel?: number;
          performanceNotes?: string;
        }>;
        sessionNotes?: string;
        overallIntensity?: number;
        painFlags?: Array<{ bodyRegion: string; side: string; mention: string }>;
        confidence?: number;
        date?: string;
      };
      fileName: string;
      fileSize: number;
      fileMimeType: string;
      clientId: number;
      clientName?: string;
      /**
       * Phase 13 (2026-04-15): user-editable workout date for the apply step.
       * Initialized from `parsedWorkout.date` if present, else today. This is
       * the value actually sent to the backend — the parser's date is only the
       * starting suggestion.
       */
      targetWorkoutDate?: string;
      /** True while the apply call is in flight. */
      applying?: boolean;
      /** Last apply error if the previous attempt failed. Review stays visible. */
      applyError?: string;
      /**
       * Phase 13: distinguishes the error class so the review card can render
       * actionable UX (e.g. duplicate-date hint → "change date above and retry").
       */
      applyErrorKind?: 'duplicate_date' | 'future_date' | 'validation' | 'server' | 'network' | 'other';
    };
    /**
     * Injected by Swan-first transcript intake on successful apply.
     * Renders TranscriptResultCard in CoachMessage.
     */
    transcriptResult?: {
      clientId: number;
      clientName?: string;
      exerciseCount: number;
      totalSets: number;
      workoutId?: string | number;
      xpAwarded?: number;
      streakDays?: number;
      fileName: string;
    };
    /**
     * Injected by Swan-first transcript intake for PRE-upload validation
     * failures (no client selected) and upload-stage failures (backend
     * rejected the file, network error, etc). Renders TranscriptErrorCard
     * in CoachMessage — a simple dismissible error surface with NO fake
     * "0 parsed" review UI and NO Apply button.
     *
     * Apply-stage failures on a REAL parsed review still use
     * transcriptReview.applyError, because those keep the real review
     * visible so the user can retry without re-uploading.
     *
     * Phase 9.1 hotfix 2026-04-14.
     */
    transcriptError?: {
      kind: 'no_client' | 'upload_failed';
      fileName: string;
      fileSize?: number;
      reason: string;
    };
  };
  frontendActions?: FrontendAction[];
}

export interface FrontendAction {
  type: string;
  payload?: Record<string, unknown>;
}

export interface CoachActionProposal {
  id: string;
  type:
    | 'client_onboarding'
    | 'workout_log'
    | 'client_data_update'
    | 'frontend_dispatch'
    | 'clarification'
    | 'split_plan';
  status: 'PENDING' | 'APPLYING' | 'APPROVED' | 'APPLIED' | 'REJECTED' | 'FAILED';
  title: string;
  summary: Record<string, string | number | null | undefined>;
  detail?: Record<string, unknown>;
  createdAt?: string;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Voice State
// ─────────────────────────────────────────────────────────────
export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

// ─────────────────────────────────────────────────────────────
// SECTION: DictationOrb Sizes (AI Village consensus)
// ─────────────────────────────────────────────────────────────
export type OrbSize = 'compact' | 'standard' | 'primary';
