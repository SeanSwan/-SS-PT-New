/**
 * ============================================================================
 * FILE: AICommandBarTypes.ts
 * PURPOSE: Type definitions for the AI Command Bar component.
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines all TypeScript types, interfaces, and context
 * mappings used by the AICommandBar and its sub-components.
 *
 * HOW IT FITS IN THE APP: Imported by AICommandBar.tsx and AICommandBarStyles.ts.
 * AICommandContext aligns with backend AI chat context values.
 *
 * KEY DECISIONS: Context union type mirrors backend AIContext but adds
 * dashboard-specific contexts (training, biometrics, overview, settings).
 */

// ─────────────────────────────────────────────────────────────
// SECTION: AI Context Types
// PURPOSE: Define the contexts the command bar can operate in
// WHY: Each dashboard tab sets a different AI context for relevant responses
// ─────────────────────────────────────────────────────────────

export type AICommandContext =
  | 'general'
  | 'scheduling'
  | 'workout_generation'
  | 'progress_analysis'
  | 'client_review'
  | 'exercise_library'
  | 'data_analysis'
  | 'gamification'
  | 'training'
  | 'biometrics'
  | 'overview'
  | 'settings'
  | 'content';

// ─────────────────────────────────────────────────────────────
// SECTION: Component Props
// PURPOSE: Props interface for the AICommandBar component
// ─────────────────────────────────────────────────────────────

export interface AICommandBarProps {
  /** AI context for this dashboard section — determines prompt behavior */
  context?: AICommandContext;
  /** Optional client ID for client-scoped AI queries */
  clientId?: number;
  /** Optional client name shown in context badge */
  clientName?: string;
  /** Custom placeholder text override */
  placeholder?: string;
  /** Callback when the command bar is dismissed */
  onClose?: () => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Context Label Map
// PURPOSE: Human-readable labels for each AI context
// WHY: Displayed in the context badge and placeholder text
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// SECTION: Context Mapping Utility
// PURPOSE: Shared AICommandContext → useAIChat AIContext mapping
// WHY: Keeps command-bar context mapping canonical for dashboard AI surfaces
// ─────────────────────────────────────────────────────────────

import type { AIContext } from '../../../hooks/useAIChat';

export function toHookContext(ctx: AICommandContext): AIContext {
  const mapping: Partial<Record<AICommandContext, AIContext>> = {
    training: 'workout_generation',
    biometrics: 'progress_analysis',
    overview: 'general',
    settings: 'general',
    data_analysis: 'general',
  };
  return (mapping[ctx] ?? ctx) as AIContext;
}

export const CONTEXT_LABELS: Record<AICommandContext, string> = {
  general: 'AI Assistant',
  scheduling: 'Schedule Assistant',
  workout_generation: 'Workout Builder',
  progress_analysis: 'Progress Analyst',
  client_review: 'Client Analyst',
  exercise_library: 'Exercise Expert',
  data_analysis: 'Data Analyst',
  gamification: 'Gamification',
  training: 'Training Coach',
  biometrics: 'Body Analytics',
  overview: 'Dashboard AI',
  settings: 'Settings Help',
  content: 'Content Studio',
};
