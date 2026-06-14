import type { LucideIcon } from 'lucide-react';
import { BarChart3, Brain, Dumbbell, Eye } from 'lucide-react';

export const TRAINER_HOME_COACH_PROMPT =
  "Teach me my trainer Home. Help me pick the next client, log today's sessions, review progress proof, and decide the safest next coaching move.";
export const TRAINER_HOME_COMMAND_INTENT = 'trainer_daily_command';
export const TRAINER_HOME_COMMAND_SOURCE = 'trainer-overview';
export const TRAINER_HOME_RETURN_TO = '/dashboard/trainer/overview';

export interface TrainerHomeCoachSnapshot {
  sessionsToday?: number;
  clientsToday?: number;
  completionRate?: number;
  hasNextActionableSession?: boolean;
}

const nonNegativeInteger = (value: number | undefined): number =>
  Math.max(0, Math.round(Number.isFinite(value) ? value ?? 0 : 0));

export const buildTrainerHomeCoachPrompt = (snapshot?: TrainerHomeCoachSnapshot): string => {
  if (!snapshot) return TRAINER_HOME_COACH_PROMPT;

  const sessionsToday = nonNegativeInteger(snapshot.sessionsToday);
  const clientsToday = nonNegativeInteger(snapshot.clientsToday);
  const completionRate = Math.min(100, nonNegativeInteger(snapshot.completionRate));
  const nextAction = snapshot.hasNextActionableSession
    ? 'next booked client needs action'
    : 'no booked client action is ready';

  return `${TRAINER_HOME_COACH_PROMPT} Current trainer-day snapshot: ${sessionsToday} sessions today; ${clientsToday} clients today; ${completionRate}% complete; ${nextAction}. Keep the answer low-click and tell me the next trainer action.`;
};

export const buildTrainerHomeCoachPath = (snapshot?: TrainerHomeCoachSnapshot): string =>
  `/dashboard/trainer/coach-assistant?${new URLSearchParams({
    intent: TRAINER_HOME_COMMAND_INTENT,
    source: TRAINER_HOME_COMMAND_SOURCE,
    returnTo: TRAINER_HOME_RETURN_TO,
    teachPrompt: buildTrainerHomeCoachPrompt(snapshot),
  }).toString()}`;

export const TRAINER_HOME_COACH_PATH = buildTrainerHomeCoachPath();

export interface TrainerHomeQuickAction {
  label: string;
  detail: string;
  overline: string | null;
  primary: boolean;
  Icon: LucideIcon;
  path: string;
  tone: string;
  i: number;
}

export const TRAINER_HOME_QUICK_ACTIONS: readonly TrainerHomeQuickAction[] = [
  {
    label: 'Log Workout',
    detail: 'Dictate, pick client, send to logger.',
    overline: 'Start here',
    primary: true,
    Icon: Dumbbell,
    path: TRAINER_HOME_COACH_PATH,
    tone: 'var(--accent-primary, #60C0F0)',
    i: 0,
  },
  {
    label: 'Ask Coach',
    detail: 'Dictate, plan, adjust.',
    overline: null,
    primary: false,
    Icon: Brain,
    path: TRAINER_HOME_COACH_PATH,
    tone: 'var(--swan-lavender, #4070C0)',
    i: 1,
  },
  {
    label: 'View Clients',
    detail: 'Open assigned roster.',
    overline: null,
    primary: false,
    Icon: Eye,
    path: '/dashboard/trainer/clients',
    tone: 'var(--accent-secondary, #8B5CF6)',
    i: 2,
  },
  {
    label: 'Client Progress',
    detail: 'Check proof and trends.',
    overline: null,
    primary: false,
    Icon: BarChart3,
    path: '/dashboard/trainer/client-progress',
    tone: 'var(--accent-gold, #C6A84B)',
    i: 3,
  },
];
