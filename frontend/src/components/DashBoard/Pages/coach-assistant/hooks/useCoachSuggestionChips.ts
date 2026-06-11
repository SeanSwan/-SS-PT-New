/**
 * HOOK: useCoachSuggestionChips
 * PURPOSE: B1a perceived-speed — role-aware next-action chips rendered
 * after each Swan Coach reply. Chips fire the exact same send path as a
 * typed message (zero new backend), so every reply hands the user a
 * one-tap next best action.
 *
 * Visibility contract:
 *  - last message is an assistant reply (the welcome message counts —
 *    chips double as the empty-state next-action surface)
 *  - not while sending (the thinking indicator owns that beat)
 *  - never on top of a pending decision card (command confirmation /
 *    transcript review / transcript error) — those own the next action
 */

import { useMemo } from 'react';
import type { CoachMessageData } from '../SwanCoachTypes';

export type CoachChipRole = 'admin' | 'trainer' | 'client';

interface UseCoachSuggestionChipsOptions {
  userRole: CoachChipRole;
  messages: CoachMessageData[];
  sending: boolean;
  selectedClientFirstName?: string | null;
}

export interface CoachSuggestionChipsState {
  chips: string[];
  visible: boolean;
}

const TRAINER_DEFAULT_CHIPS = [
  "How's my day look?",
  'Log a client workout',
  'Show client progress',
  'What sessions do I have today?',
];

const CLIENT_DEFAULT_CHIPS = [
  'Log a workout',
  'Show my progress',
  'What should I train next?',
  'Book a session',
];

// Exported as a test seam — useCoachSuggestionChips.test.ts locks the
// role/chip-content contract.
// fallow-ignore-next-line unused-export
export function buildSuggestionChips(
  userRole: CoachChipRole,
  selectedClientFirstName?: string | null,
): string[] {
  if (userRole === 'client') return CLIENT_DEFAULT_CHIPS;
  // Trainer/admin: when a client is adopted, the brief chip targets them
  // by first name so the command lane can resolve the client directly.
  const firstName = selectedClientFirstName?.trim();
  if (firstName) {
    return [`Brief me on ${firstName}`, ...TRAINER_DEFAULT_CHIPS.slice(0, 3)];
  }
  return TRAINER_DEFAULT_CHIPS;
}

// Exported as a test seam — useCoachSuggestionChips.test.ts locks the
// visibility/decision-card gating contract.
// fallow-ignore-next-line unused-export
export function areSuggestionChipsVisible(
  messages: CoachMessageData[],
  sending: boolean,
): boolean {
  if (sending || messages.length === 0) return false;
  const last = messages[messages.length - 1];
  if (last.role !== 'assistant') return false;
  const metadata = last.metadata;
  if (metadata?.commandConfirmation) return false;
  if (metadata?.transcriptReview) return false;
  if (metadata?.transcriptError) return false;
  return true;
}

export function useCoachSuggestionChips({
  userRole,
  messages,
  sending,
  selectedClientFirstName = null,
}: UseCoachSuggestionChipsOptions): CoachSuggestionChipsState {
  const chips = useMemo(
    () => buildSuggestionChips(userRole, selectedClientFirstName),
    [userRole, selectedClientFirstName],
  );

  const visible = areSuggestionChipsVisible(messages, sending);

  return { chips, visible };
}
