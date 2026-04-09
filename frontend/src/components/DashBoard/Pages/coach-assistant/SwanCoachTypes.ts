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
  };
  frontendActions?: FrontendAction[];
}

export interface FrontendAction {
  type: string;
  payload?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Voice State
// ─────────────────────────────────────────────────────────────
export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

// ─────────────────────────────────────────────────────────────
// SECTION: DictationOrb Sizes (AI Village consensus)
// ─────────────────────────────────────────────────────────────
export type OrbSize = 'compact' | 'standard' | 'primary';
