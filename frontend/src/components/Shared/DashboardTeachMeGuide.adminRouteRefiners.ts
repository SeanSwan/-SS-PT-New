/**
 * SHARED LOGIC: Admin dashboard Teach Me route refiners.
 * PURPOSE: Teaches admins the right first move for money, training, scheduling,
 * growth, onboarding, and trust routes without performing hidden writes.
 */

import type { DashboardTeachMeGuideCopy } from './DashboardTeachMeGuide.logic';
import {
  adminClientCareLoop,
  adminTrustAndAccess,
} from './DashboardTeachMeGuide.adminCareRefiners';
import { applyPatch, includesAny } from './DashboardTeachMeGuide.routeRefiners.shared';

const adminMoneyPath = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  eyebrow: 'Teach the money path',
  title: 'Admin money path',
  summary: 'Use this route to protect revenue truth: paid orders, package setup, session credits, tax, and fulfillment exceptions.',
  focus: 'Do not guess on money screens. Confirm the paid record, what was purchased, what must be delivered, and the next owner before changing state.',
  primaryAction: { label: 'Review Orders', to: '/dashboard/admin/pending-orders' },
  fastPath: [
    'Open paid and pending orders.',
    'Confirm sessions, tax, and fulfillment.',
    'Resolve the exception or route it to support.',
  ],
  steps: [
    'Start with Orders when the question is payment, shipment, fulfillment, or paid-but-reviewing state.',
    'Open Packages only when the product, price, tax behavior, stock, or session package setup needs correction.',
    'Use Revenue after the order truth is settled so reporting does not hide an unresolved fulfillment problem.',
    'Never turn a money-path screen into a client-note task until credits, products, and payment state are verified.',
  ],
  actions: [
    { label: 'Orders', to: '/dashboard/admin/pending-orders' },
    { label: 'Packages', to: '/dashboard/admin/admin-packages' },
    { label: 'Revenue', to: '/dashboard/admin/revenue' },
    { label: 'Sessions', to: '/dashboard/admin/admin-sessions' },
  ],
  primaryPrompt: 'teach me the admin money path workflow',
});

const adminWorkoutSystems = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  eyebrow: 'Teach the training builder',
  title: 'Admin workout systems',
  summary: 'Use builder routes to turn client goals, equipment, pain signals, and training phase into a usable plan.',
  focus: 'Build from client context first: goal, equipment, pain, schedule, then generate or save the plan where the trainer can use it.',
  primaryAction: { label: 'Open Workout Planner', to: '/dashboard/admin/workout-planner' },
  fastPath: [
    'Choose client context.',
    'Generate or assemble the plan.',
    'Save it where logging can use it.',
  ],
  steps: [
    'Start in Client Hub when the plan belongs to one client; use Workout Planner when the plan structure is the main task.',
    'Confirm equipment and pain constraints before accepting generated work.',
    'Use Bootcamp only for group-class flow; do not mix it with one-client programming unless that is intentional.',
    'Save the plan before leaving the builder so it can feed future logging and progress proof.',
  ],
  actions: [
    { label: 'Workout Planner', to: '/dashboard/admin/workout-planner' },
    { label: 'Client Hub Training', to: '/dashboard/admin/client-management?tab=training' },
    { label: 'Equipment', to: '/dashboard/admin/equipment' },
    { label: 'Bootcamp', to: '/dashboard/admin/bootcamp' },
  ],
  primaryPrompt: 'teach me the admin workout builder workflow',
});

const adminSelfWorkoutLogging = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  eyebrow: 'Teach owner training',
  title: 'Admin self workout logging',
  summary: 'Use this route when Sean needs to train like a client while staying inside the admin shell.',
  focus: 'Log your own workout as the owner without switching mental contexts: load today, save the work, then review what changed.',
  primaryAction: { label: 'Log My Workout', to: '/dashboard/admin/log-my-workout?loadPlan=today' },
  fastPath: [
    "Open today's workout.",
    'Enter sets, reps, load, and notes.',
    'Save before switching back to admin work.',
  ],
  actions: [
    { label: 'My Workout', to: '/dashboard/admin/log-my-workout?loadPlan=today' },
    { label: 'Ask Coach', to: '/dashboard/admin/coach-assistant' },
    { label: 'Workout Planner', to: '/dashboard/admin/workout-planner' },
    { label: 'Client Hub Training', to: '/dashboard/admin/client-management?tab=training' },
  ],
  primaryPrompt: 'teach me the admin self workout logging workflow',
});

const adminClientWorkoutLogging = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  eyebrow: 'Teach client logging',
  title: 'Admin client workout logging',
  summary: 'Use this route when the admin is logging work performed by a client.',
  focus: 'Pick the client, log the actual performed work, then keep the saved result connected to plans and progress.',
  primaryAction: { label: 'Log Client Workout', to: '/dashboard/admin/log-workout?loadPlan=today' },
  fastPath: [
    'Choose the client.',
    'Log performed sets, reps, load, and notes.',
    'Save and review progress before leaving.',
  ],
  actions: [
    { label: 'Log Client Workout', to: '/dashboard/admin/log-workout?loadPlan=today' },
    { label: 'Client Hub Logger', to: '/dashboard/admin/client-management?tab=training&trainingSection=logger&loadPlan=today' },
    { label: 'Workout Planner', to: '/dashboard/admin/workout-planner' },
    { label: 'Ask Coach', to: '/dashboard/admin/coach-assistant' },
  ],
  primaryPrompt: 'teach me the admin client workout logging workflow',
});

const adminClientProgressTracking = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  eyebrow: 'Teach progress proof',
  title: 'Admin client progress proof',
  summary: 'Use progress tracking to decide the next training action from saved workout truth.',
  focus: 'Review real logged progress, identify stale or missing proof, then log, adjust the plan, or message the client.',
  primaryAction: { label: 'Review Client Progress', to: '/dashboard/admin/client-progress-tracking' },
  fastPath: [
    'Pick the client trend.',
    'Check the latest saved workout proof.',
    'Log, adjust, or message next.',
  ],
  actions: [
    { label: 'Review Client Progress', to: '/dashboard/admin/client-progress-tracking' },
    { label: 'Client Hub Training', to: '/dashboard/admin/client-management?tab=training' },
    { label: 'Log Client Workout', to: '/dashboard/admin/log-workout?loadPlan=today' },
    { label: 'Ask Coach', to: '/dashboard/admin/coach-assistant' },
  ],
  primaryPrompt: 'teach me the admin client progress workflow',
});

const adminScheduleControl = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  eyebrow: 'Teach the schedule loop',
  title: 'Admin schedule control',
  summary: 'Use schedule routes to connect booked time, trainer assignment, session credits, and client follow-up.',
  focus: 'Check the appointment, trainer, client, and credit state together so scheduling does not drift from billing truth.',
  primaryAction: { label: 'Review Sessions', to: '/dashboard/admin/admin-sessions' },
  fastPath: [
    'Find the booked session.',
    'Confirm trainer, client, and credit state.',
    'Adjust schedule or allocation.',
  ],
  actions: [
    { label: 'Sessions', to: '/dashboard/admin/admin-sessions' },
    { label: 'Master Schedule', to: '/dashboard/admin/master-schedule' },
    { label: 'Session Allocation', to: '/dashboard/admin/session-allocation' },
    { label: 'Client Hub', to: '/dashboard/admin/client-management' },
  ],
  primaryPrompt: 'teach me the admin schedule workflow',
});

const adminGrowthLoop = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  eyebrow: 'Teach growth operations',
  title: 'Admin growth loop',
  summary: 'Use growth routes to turn campaigns, content, and lead capture into booked clients without losing fulfillment truth.',
  focus: 'Connect the campaign to the next paid step: lead source, follow-up, onboarding, order state, and the client record.',
  primaryAction: { label: 'Open Marketing', to: '/dashboard/admin/marketing' },
  fastPath: [
    'Check the live campaign or content queue.',
    'Confirm lead follow-up and next offer.',
    'Move the person into onboarding or order review.',
  ],
  steps: [
    'Start with Marketing when the question is demand, campaign cadence, leads, or follow-up.',
    'Use Content Studio when the work is creative proof that supports the campaign.',
    'Check Orders before celebrating revenue so paid-but-reviewing work is not missed.',
    'Move qualified leads into onboarding or Client Hub instead of leaving them in a marketing-only lane.',
  ],
  actions: [
    { label: 'Marketing', to: '/dashboard/admin/marketing' },
    { label: 'Content Studio', to: '/dashboard/admin/content' },
    { label: 'Orders', to: '/dashboard/admin/pending-orders' },
    { label: 'Client Onboarding', to: '/dashboard/admin/client-onboarding' },
  ],
  primaryPrompt: 'teach me the admin growth workflow',
});

const adminPeopleOnboarding = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  eyebrow: 'Teach people operations',
  title: 'Admin people setup',
  summary: 'Use people routes to create the right account, collect the right details, and connect clients to the trainer who can act.',
  focus: 'Do not stop at account creation. Finish the assignment, onboarding state, training context, and first next action.',
  primaryAction: { label: 'Open User Management', to: '/dashboard/admin/user-management' },
  fastPath: [
    'Find or create the person.',
    'Complete role-specific onboarding.',
    'Assign trainer and next action.',
  ],
  actions: [
    { label: 'Users', to: '/dashboard/admin/user-management' },
    { label: 'Trainers', to: '/dashboard/admin/trainer-management' },
    { label: 'Client Onboarding', to: '/dashboard/admin/client-onboarding' },
    { label: 'Assignments', to: '/dashboard/admin/client-trainer-assignments' },
  ],
  primaryPrompt: 'teach me the admin people setup workflow',
});

const adminTrainerEnablement = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  eyebrow: 'Teach trainer enablement',
  title: 'Admin trainer enablement',
  summary: 'Use trainer permissions to make a trainer ready to work: account, access, assignments, and schedule context all line up.',
  focus: 'A trainer is not onboarded until they can see the right clients, use the right tools, and act without asking Sean for every click.',
  primaryAction: { label: 'Review Trainer Permissions', to: '/dashboard/admin/trainer-permissions' },
  fastPath: [
    'Confirm the trainer account.',
    'Set the permission scope.',
    'Connect assignments and schedule context.',
  ],
  actions: [
    { label: 'Trainer Permissions', to: '/dashboard/admin/trainer-permissions' },
    { label: 'Trainer Profiles', to: '/dashboard/admin/trainer-management' },
    { label: 'Client Assignments', to: '/dashboard/admin/client-trainer-assignments' },
    { label: 'Feature Access', to: '/dashboard/admin/feature-access' },
  ],
  primaryPrompt: 'teach me the admin trainer enablement workflow',
});

export const refineAdminGuide = (
  path: string,
  base: DashboardTeachMeGuideCopy,
): DashboardTeachMeGuideCopy => {
  if (includesAny(path, ['log-my-workout'])) {
    return adminSelfWorkoutLogging(base);
  }
  if (includesAny(path, ['log-workout'])) {
    return adminClientWorkoutLogging(base);
  }
  if (includesAny(path, ['client-progress-tracking'])) {
    return adminClientProgressTracking(base);
  }
  if (includesAny(path, ['pending-orders', 'revenue', 'admin-packages'])) {
    return adminMoneyPath(base);
  }
  if (includesAny(path, ['workout-planner', 'workouts', 'bootcamp', 'equipment'])) {
    return adminWorkoutSystems(base);
  }
  if (includesAny(path, ['admin-sessions', 'master-schedule', 'session-allocation'])) {
    return adminScheduleControl(base);
  }
  if (includesAny(path, ['marketing', 'content', 'badge-creator', 'automation'])) {
    return adminGrowthLoop(base);
  }
  if (includesAny(path, ['trainer-permissions'])) {
    return adminTrainerEnablement(base);
  }
  if (includesAny(path, ['user-management', 'trainer-management', 'onboarding', 'client-trainer-assignments'])) {
    return adminPeopleOnboarding(base);
  }
  if (includesAny(path, ['body-map', 'meal-planner', 'nutrition', 'messages', 'video-call', 'videos', 'notes', 'photos'])) {
    return adminClientCareLoop(path, base);
  }
  if (includesAny(path, ['security', 'feature-access', 'waivers', 'sms-logs'])) {
    return adminTrustAndAccess(base);
  }
  return base;
};
