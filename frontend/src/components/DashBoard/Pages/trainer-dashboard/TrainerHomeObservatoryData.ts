import type { LucideIcon } from 'lucide-react';
import { BarChart3, Brain, CalendarDays, Dumbbell, MessageSquare, Users } from 'lucide-react';
import {
  TRAINER_HOME_COACH_PATH,
  TRAINER_HOME_LOG_WORKOUT_PATH,
} from './TrainerHomeQuickActions.config';

export interface TrainerObservatoryLens {
  id: 'today' | 'clients' | 'progress' | 'coach';
  label: string;
  detail: string;
  path: string;
  Icon: LucideIcon;
}

export interface TrainerObservatoryDockAction {
  label: string;
  detail: string;
  path: string;
  Icon: LucideIcon;
  primary?: boolean;
}


export const TRAINER_OBSERVATORY_LENSES: readonly TrainerObservatoryLens[] = [
  {
    id: 'today',
    label: 'Today',
    detail: 'Sessions, proof, and the next client action.',
    path: '/dashboard/trainer/overview',
    Icon: CalendarDays,
  },
  {
    id: 'clients',
    label: 'Clients',
    detail: 'Assigned roster, readiness, and follow-ups.',
    path: '/dashboard/trainer/clients',
    Icon: Users,
  },
  {
    id: 'progress',
    label: 'Progress',
    detail: 'Logged trends and client proof points.',
    path: '/dashboard/trainer/client-progress',
    Icon: BarChart3,
  },
  {
    id: 'coach',
    label: 'Coach',
    detail: 'Ask Swan Coach for session triage.',
    path: TRAINER_HOME_COACH_PATH,
    Icon: Brain,
  },
];

export const TRAINER_OBSERVATORY_MOBILE_DOCK: readonly TrainerObservatoryDockAction[] = [
  {
    label: 'Log',
    detail: 'Workout',
    path: TRAINER_HOME_LOG_WORKOUT_PATH,
    Icon: Dumbbell,
    primary: true,
  },
  {
    label: 'Clients',
    detail: 'Roster',
    path: '/dashboard/trainer/clients',
    Icon: Users,
  },
  {
    label: 'Coach',
    detail: 'Triage',
    path: TRAINER_HOME_COACH_PATH,
    Icon: Brain,
  },
  {
    label: 'Progress',
    detail: 'Proof',
    path: '/dashboard/trainer/client-progress',
    Icon: BarChart3,
  },
  {
    label: 'Message',
    detail: 'Clients',
    path: '/dashboard/trainer/messages',
    Icon: MessageSquare,
  },
];