import { refineDashboardTeachMeGuide } from './DashboardTeachMeGuide.routeRefiners';

export type DashboardTeachMeRole = 'admin' | 'trainer' | 'client' | 'user';

export interface DashboardTeachMeGuideInput {
  role: DashboardTeachMeRole;
  pathname: string;
  search?: string;
}

export interface DashboardTeachMeGuideCopy {
  eyebrow: string;
  title: string;
  summary: string;
  focus: string;
  primaryAction: {
    label: string;
    to: string;
  };
  fastPath: string[];
  steps: string[];
  actions: Array<{
    label: string;
    to: string;
  }>;
  primaryPrompt?: string;
}

export const normalizeDashboardTeachMeRole = (role: string): DashboardTeachMeRole => {
  if (role === 'admin' || role === 'trainer' || role === 'client' || role === 'user') {
    return role;
  }

  return 'client';
};

const normalizedPath = (pathname: string) => pathname.toLowerCase();

const includesAny = (path: string, targets: string[]) => (
  targets.some((target) => path.includes(target))
);

const adminFocus = (path: string): string => {
  if (includesAny(path, ['coach-assistant', 'plaud', 'intake'])) {
    return 'Use Coach to draft, inspect, and route work, then save only after client, date, and action are verified.';
  }
  if (includesAny(path, ['client-management', 'workout-planner', 'workout'])) {
    return 'Stay inside Client Hub training tools when the work belongs to one client record.';
  }
  if (includesAny(path, ['sessions', 'packages', 'orders', 'revenue'])) {
    return 'Treat money-path screens as source-of-truth surfaces: confirm credits, pricing, tax, and fulfillment before changing state.';
  }
  return 'Start from the work outcome: coach action, client record, schedule, money path, then only switch tabs when the record demands it.';
};

const trainerFocus = (path: string): string => {
  if (includesAny(path, ['client', 'progress'])) {
    return 'Pick the client first, review the last logged proof, then log or adjust the next training action.';
  }
  if (includesAny(path, ['log', 'workout'])) {
    return 'Log the actual work performed, including sets, reps, load, notes, pain signals, and completion context.';
  }
  return 'Work from today sessions to logging, progress review, and next-session coaching notes.';
};

const clientFocus = (path: string): string => {
  if (includesAny(path, ['progress', 'rewards'])) {
    return 'Read progress as proof from logged training, then use it to decide the next workout or booking.';
  }
  if (includesAny(path, ['log-workout', 'workout'])) {
    return 'Log the workout before browsing secondary features so charts and coaching stay truthful.';
  }
  return 'The client loop is simple: train, log, review progress, book the next session, and keep the coach informed.';
};

const userFocus = (path: string): string => {
  if (includesAny(path, ['progress', 'activity'])) {
    return 'Progress and activity should tell the story from real training logs before social proof or profile polish.';
  }
  if (includesAny(path, ['creative', 'photos', 'friends', 'challenges'])) {
    return 'Use Studio and community after the training proof exists, so sharing reinforces the real journey.';
  }
  return 'Home is the launch point: train first, check proof, then move into Studio, community, and profile tools.';
};

const guides: Record<DashboardTeachMeRole, (path: string) => DashboardTeachMeGuideCopy> = {
  admin: (path) => ({
    eyebrow: 'Teach the operating loop',
    title: 'Admin command center',
    summary: 'Use this dashboard as the control room for Coach actions, client records, scheduling, sessions, billing truth, and fulfillment.',
    focus: adminFocus(path),
    primaryAction: { label: 'Log Client Workout', to: '/dashboard/admin/client-management?intent=log_workout' },
    fastPath: [
      'Pick the client or Coach thread.',
      'Open the Training tab or staged Coach action.',
      'Review, then save the verified change.',
    ],
    steps: [
      'Start with Coach or Client Hub when the task is client work; Coach stages the action, Client Hub holds the record.',
      'Use the Training tab for logging, plan review, progress charts, and workout notes before jumping to separate tools.',
      'Check schedule, sessions, packages, revenue, and orders when the task touches billing or fulfillment.',
      'Keep final writes approval-gated: review drafts, client/date, duplicates, and money-path changes before saving.',
    ],
    actions: [
      { label: 'Open Coach', to: '/dashboard/admin/coach-assistant' },
      { label: 'Client Hub Training', to: '/dashboard/admin/client-management?tab=training' },
      { label: 'Log Client Workout', to: '/dashboard/admin/client-management?intent=log_workout' },
      { label: 'My Workout', to: '/dashboard/admin/log-my-workout?loadPlan=today' },
      { label: 'Sessions', to: '/dashboard/admin/admin-sessions' },
    ],
    primaryPrompt: 'teach me the admin dashboard workflow',
  }),
  trainer: (path) => ({
    eyebrow: 'Teach the floor flow',
    title: 'Trainer floor flow',
    summary: 'Use the trainer dashboard to move from today sessions into accurate workout logging, progress review, and the next coaching action.',
    focus: trainerFocus(path),
    primaryAction: { label: "Log Today's Client", to: '/dashboard/trainer/clients?intent=log_workout' },
    fastPath: [
      'Open Today sessions.',
      'Log the active client before memory fades.',
      'Check progress and set the next action.',
    ],
    steps: [
      'Start with Today sessions so the right client, time, and training context are in front of you.',
      'Use Coach or Log workout for the active client instead of writing notes in disconnected places.',
      'Review progress before changing the plan, especially pain signals, missed sessions, and stale logs.',
      'Close the loop with the next appointment, message, or plan adjustment while the session is fresh.',
    ],
    actions: [
      { label: 'Today Sessions', to: '/dashboard/trainer/overview' },
      { label: 'Open Coach', to: '/dashboard/trainer/coach-assistant' },
      { label: 'Log Workout', to: '/dashboard/trainer/clients?intent=log_workout' },
      { label: 'Client Progress', to: '/dashboard/trainer/client-progress' },
      { label: 'Schedule', to: '/dashboard/trainer/schedule' },
    ],
    primaryPrompt: 'teach me the trainer dashboard workflow',
  }),
  client: (path) => ({
    eyebrow: 'Teach the training loop',
    title: 'Client training loop',
    summary: 'The client dashboard should keep training first: log work, review progress, book the next session, and keep signals clear.',
    focus: clientFocus(path),
    primaryAction: { label: 'Log Workout', to: '/dashboard/client/log-workout?loadPlan=today' },
    fastPath: [
      "Log today's workout.",
      'Check progress from the saved work.',
      'Book or message before you leave.',
    ],
    steps: [
      'Use Log Workout first after training so sets, reps, load, notes, and completion stay tied to the day.',
      'Open Progress after logging to see what changed and what needs attention.',
      'Use Book My Session when the next coached training date is not already locked.',
      'Report pain, fatigue, and questions where the coach can review them before the next plan change.',
    ],
    actions: [
      { label: 'Log Workout', to: '/dashboard/client/log-workout?loadPlan=today' },
      { label: 'Ask Coach', to: '/dashboard/client/coach-assistant' },
      { label: 'Progress', to: '/dashboard/client/progress' },
      { label: 'Book My Session', to: '/dashboard/client/schedule' },
      { label: 'Messages', to: '/dashboard/client/messages' },
    ],
    primaryPrompt: 'teach me the client training loop workflow',
  }),
  user: (path) => ({
    eyebrow: 'Teach the personal hub',
    title: 'User dashboard tour',
    summary: 'Use the public dashboard as the personal proof hub: Home, training proof, Studio, community, and profile all stay connected.',
    focus: userFocus(path),
    primaryAction: { label: 'Log Workout', to: '/dashboard/client/log-workout?loadPlan=today' },
    fastPath: [
      'Start on Home for the daily snapshot.',
      'Open Progress before changing anything.',
      'Share proof after the work is logged.',
    ],
    steps: [
      'Start on Home for the daily snapshot and the fastest path back into training.',
      'Use Progress and Activity to inspect proof from real logged workouts before making decisions.',
      'Use Studio and Photos to package transformation evidence after the work is logged.',
      'Use Friends and Challenges to share meaningful milestones without burying the training loop.',
    ],
    actions: [
      { label: 'Home', to: '/user-dashboard' },
      { label: 'Log Workout', to: '/dashboard/client/log-workout?loadPlan=today' },
      { label: 'Ask Coach', to: '/dashboard/client/coach-assistant' },
      { label: 'Progress', to: '/user-dashboard/progress' },
      { label: 'Studio', to: '/user-dashboard/creative' },
      { label: 'Friends', to: '/user-dashboard/friends' },
    ],
    primaryPrompt: 'teach me the user dashboard training workflow',
  }),
};

export const getDashboardTeachMeGuide = (
  input: DashboardTeachMeGuideInput,
): DashboardTeachMeGuideCopy => {
  const path = normalizedPath(`${input.pathname}${input.search ?? ''}`);
  return refineDashboardTeachMeGuide(input.role, path, guides[input.role](path));
};
