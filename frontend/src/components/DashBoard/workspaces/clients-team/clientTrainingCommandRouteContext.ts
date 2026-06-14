/**
 * Client training command route context helpers.
 *
 * The inline Client Hub command bar can sit on top of a normal daily logger
 * or a booked session logger. This keeps safe date/session tokens in one
 * place before they are sent to the review-gated Coach command lane.
 */
import { normalizeIsoDateOnly } from '../../../../utils/isoDateOnly';
import { getLocalIsoDate } from '../../../../utils/localDate';

export interface ClientTrainingRouteContextInput {
  scheduledSessionCreditHint?: number | null;
  scheduledSessionDate?: string | null;
  scheduledSessionId?: string | null;
}

export function buildDailyCommandPrompt(clientId: number | string, command: string): string {
  return [
    'You are Swan Coach, the SwanStudios NASM-aligned daily training assistant.',
    `Client-scoped daily training command for clientId=${clientId}.`,
    'Use client ID only. Do not require or echo client display names.',
    'Ground responses in available workout plans, workout logs, progress proof, pain/safety constraints, and trainer review context.',
    'Intent: daily workout logging, set updates, workout review, and next-session readiness.',
    'Prepare a review-gated workout_log proposal when enough detail exists.',
    'Do not directly submit workout forms or bypass trainer review.',
    `Operator command: ${command}`,
  ].join('\n');
}

export function selectedCommandClientId(clientId: number | string): number | null {
  const numericClientId = Number(clientId);
  return Number.isSafeInteger(numericClientId) && numericClientId > 0 ? numericClientId : null;
}

function safeScheduledSessionId(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed || !/^[1-9]\d*$/.test(trimmed)) return null;
  return Number.isSafeInteger(Number(trimmed)) ? trimmed : null;
}

function safeSessionCredits(value?: number | null): number | null {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : null;
}

export function buildClientTrainingCommandRouteContext({
  scheduledSessionCreditHint = null,
  scheduledSessionDate = null,
  scheduledSessionId = null,
}: ClientTrainingRouteContextInput): Record<string, string | number> {
  const safeDate = normalizeIsoDateOnly(scheduledSessionDate);
  const sessionId = safeScheduledSessionId(scheduledSessionId);
  const sessionCredits = safeSessionCredits(scheduledSessionCreditHint);

  return {
    source: 'clients-team',
    intent: 'daily_training_command',
    surface: 'client-training-command-bar',
    workoutDate: safeDate || getLocalIsoDate(),
    ...(sessionId ? { scheduledSessionId: sessionId } : {}),
    ...(sessionId && safeDate ? { scheduledSessionDate: safeDate } : {}),
    ...(sessionCredits ? { scheduledSessionCredits: sessionCredits } : {}),
  };
}
