import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Brain,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  MessageSquare,
  Users,
  Zap,
} from 'lucide-react';

import heroSwan from '../../../../assets/crystal-swan.png';
import profileMark from '../../../../assets/logo.svg';
import trainingArt from '../../../../assets/swan-paint-3.png';
import {
  TRAINER_HOME_COACH_PATH,
  TRAINER_HOME_LOG_WORKOUT_PATH,
} from './TrainerHomeQuickActions.config';

export interface TrainerObservatoryLens {
  id: 'today' | 'clients' | 'progress' | 'schedule' | 'forge' | 'coach';
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

export const TRAINER_OBSERVATORY_ASSETS = {
  heroSwan,
  profileMark,
  trainingArt,
};

export const TRAINER_OBSERVATORY_LENSES: readonly TrainerObservatoryLens[] = [
  {
    id: 'today',
    label: 'Today',
    detail: 'Sessions and next client action.',
    path: '/dashboard/trainer/overview',
    Icon: CalendarDays,
  },
  {
    id: 'clients',
    label: 'Clients',
    detail: 'Assigned roster and readiness.',
    path: '/dashboard/trainer/clients',
    Icon: Users,
  },
  {
    id: 'progress',
    label: 'Progress',
    detail: 'Logged trends and proof points.',
    path: '/dashboard/trainer/client-progress',
    Icon: BarChart3,
  },
  {
    id: 'schedule',
    label: 'Schedule',
    detail: 'Plan the coaching day.',
    path: '/dashboard/trainer/schedule',
    Icon: ClipboardList,
  },
  {
    id: 'forge',
    label: 'Workout Planner',
    detail: 'Create or review the next workout.',
    path: '/dashboard/trainer/workout-planner',
    Icon: Zap,
  },
  {
    id: 'coach',
    label: 'Coach',
    detail: 'Ask Swan Coach for triage.',
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
