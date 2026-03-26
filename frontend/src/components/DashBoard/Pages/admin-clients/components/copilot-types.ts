/**
 * ============================================================================
 * FILE: copilot-types.ts
 * PURPOSE: Shared types and interfaces for the WorkoutCopilotPanel system.
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Centralizes all TypeScript types used across the
 * decomposed CopilotPanel sub-components. Prevents circular imports and
 * keeps type definitions DRY.
 *
 * HOW IT FITS IN THE APP: Imported by WorkoutCopilotPanel (orchestrator)
 * and all Copilot* sub-components.
 *
 * KEY DECISIONS: Re-exports service types so sub-components only need one
 * import path for all copilot-related types.
 */

// ─────────────────────────────────────────────────────────────
// SECTION: Re-exports from service layer
// PURPOSE: Single import path for all AI workout types
// ─────────────────────────────────────────────────────────────

export type {
  WorkoutPlan,
  WorkoutDay,
  Exercise,
  DraftSuccessResponse,
  DegradedResponse,
  Explainability,
  SafetyConstraints,
  ExerciseRecommendation,
  ValidationError,
  TemplateSuggestion,
  TemplateEntry,
} from '../../../../../services/aiWorkoutService';

export type { PainEntry } from '../../../../../services/painEntryService';

// ─────────────────────────────────────────────────────────────
// SECTION: Copilot state machine
// PURPOSE: Union type for the copilot panel's finite state machine
// ─────────────────────────────────────────────────────────────

export type CopilotState =
  | 'idle'
  | 'pain_check'
  | 'generating'
  | 'draft_review'
  | 'degraded'
  | 'error'
  | 'approving'
  | 'saved'
  | 'approve_error';

// ─────────────────────────────────────────────────────────────
// SECTION: Component props
// PURPOSE: Props interface for the top-level WorkoutCopilotPanel
// ─────────────────────────────────────────────────────────────

export interface WorkoutCopilotPanelProps {
  open: boolean;
  onClose: () => void;
  clientId: number;
  clientName: string;
  onSuccess?: () => void;
  /** When true, auto-starts generation on open (skips idle screen). */
  autoGenerate?: boolean;
  /** When true, renders inline (no modal overlay) for workspace embedding. */
  inline?: boolean;
}
