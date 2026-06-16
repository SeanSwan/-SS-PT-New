/**
 * ============================================================================
 * FILE: SwanCoachConstants.ts
 * PURPOSE: Constants for Swan Studios Coach Assistant
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-30
 * AI VILLAGE VALIDATED: 2026-03-30 (11-brain consensus)
 * ============================================================================
 */

import type { ResponseStyleOption, ContextChip } from './SwanCoachTypes';

// ─────────────────────────────────────────────────────────────
// SECTION: Response Styles
// PURPOSE: Science / Balanced (NEW default) / Keep It 100
// WHY: AI Village consensus — "balanced" fills the gap between
//      overly technical and oversimplified responses
// ─────────────────────────────────────────────────────────────
export const RESPONSE_STYLES: ResponseStyleOption[] = [
  {
    key: 'phd_only',
    label: 'Science',
    emoji: '🎓',
    description: 'Detailed coaching logic with NASM-level context',
  },
  {
    key: 'balanced',
    label: 'Balanced',
    emoji: '⚖️',
    description: 'Clear and complete — technical but accessible',
  },
  {
    key: 'simple_only',
    label: 'Keep It 100',
    emoji: '💯',
    description: 'Straight to the point, no jargon',
  },
];

export const DEFAULT_RESPONSE_STYLE = 'balanced' as const;

// ─────────────────────────────────────────────────────────────
// SECTION: Context Chips
// PURPOSE: Quick context switching without leaving the terminal
// WHY: Trainer on gym floor needs one-tap context changes
// ─────────────────────────────────────────────────────────────
export const CONTEXT_CHIPS: ContextChip[] = [
  { key: 'coach_assistant', label: 'Coach', emoji: '🤖', roles: ['admin', 'trainer'] },
  { key: 'workout_generation', label: 'Workouts', emoji: '🏋️', roles: ['admin', 'trainer'] },
  { key: 'macro_logging', label: 'Log Meal', emoji: '📋', roles: ['admin', 'trainer', 'client'] },
  { key: 'client_review', label: 'Clients', emoji: '👥', roles: ['admin', 'trainer'] },
  { key: 'scheduling', label: 'Schedule', emoji: '📅', roles: ['admin', 'trainer'] },
  { key: 'progress_analysis', label: 'Progress', emoji: '📊', roles: ['admin', 'trainer'] },
  { key: 'exercise_library', label: 'Exercises', emoji: '💪', roles: ['admin', 'trainer'] },
  { key: 'gamification', label: 'XP & Badges', emoji: '🏆', roles: ['admin'] },
  { key: 'form_tips', label: 'Form Tips', emoji: '🎯', roles: ['admin', 'trainer', 'client'] },
  { key: 'client_onboarding', label: 'Onboarding', emoji: '📝', roles: ['admin', 'trainer'] },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Voice Orb Sizes (AI Village design consensus)
// ─────────────────────────────────────────────────────────────
export const ORB_SIZE_MAP = {
  compact: 48,
  standard: 56,
  primary: 64,
} as const;

export const ORB_ICON_SIZE_MAP = {
  compact: 20,
  standard: 24,
  primary: 28,
} as const;

// ─────────────────────────────────────────────────────────────
// SECTION: Welcome Messages
// ─────────────────────────────────────────────────────────────
export const WELCOME_MESSAGE = {
  role: 'assistant' as const,
  content: `Hey Coach! I'm your Swan Studios AI Assistant. I can help you log workouts, check client progress, manage schedules, look up exercises, and more.\n\nJust type or tap the mic and tell me what you need. I'm connected to everything — workouts, clients, scheduling, nutrition, and the full NASM exercise library.`,
  timestamp: new Date().toISOString(),
};
