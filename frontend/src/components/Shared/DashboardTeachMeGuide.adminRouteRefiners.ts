/**
 * SHARED LOGIC: Admin dashboard Teach Me route refiners.
 * PURPOSE: Teaches admins the right first move for money, training, scheduling,
 * growth, onboarding, and trust routes without performing hidden writes.
 */

import type { DashboardTeachMeGuideCopy } from './DashboardTeachMeGuide.logic';
import {
  adminClientHubCommand,
  adminClientCareLoop,
  adminTrustAndAccess,
} from './DashboardTeachMeGuide.adminCareRefiners';
import { adminEngagementSystems } from './DashboardTeachMeGuide.adminEngagementRefiners';
import { adminGrowthOperations } from './DashboardTeachMeGuide.adminGrowthRefiners';
import { adminOverviewTriage } from './DashboardTeachMeGuide.adminOverviewRefiner';
import { adminScheduleControl } from './DashboardTeachMeGuide.adminScheduleRefiners';
import {
  adminSelfWorkoutPlanning,
  isAdminSelfPlannerRoute,
} from './DashboardTeachMeGuide.adminSelfPlannerRefiner';
import { adminTrainingSystems } from './DashboardTeachMeGuide.adminTrainingRefiners';
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
    { label: 'My Planner', to: '/dashboard/admin/workout-planner?self=1' },
    { label: 'Client Hub Training', to: '/dashboard/admin/client-management?tab=training' },
  ],
  primaryPrompt: 'teach me the admin self workout logging workflow',
});

const adminClientWorkoutLogging = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  eyebrow: 'Teach client logging',
  title: 'Admin client workout logging',
  summary: 'Use this route when the admin is logging work performed by a client.',
  focus: 'Pick the client, log the actual performed work, then keep the saved result connected to plans and progress.',
  primaryAction: { label: 'Pick Client to Log', to: '/dashboard/admin/client-management?intent=log_workout' },
  fastPath: [
    'Choose the client.',
    'Log performed sets, reps, load, and notes.',
    'Save and review progress before leaving.',
  ],
  actions: [
    { label: 'Pick Client to Log', to: '/dashboard/admin/client-management?intent=log_workout' },
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
    { label: 'Pick Client to Log', to: '/dashboard/admin/client-management?intent=log_workout' },
    { label: 'Ask Coach', to: '/dashboard/admin/coach-assistant' },
  ],
  primaryPrompt: 'teach me the admin client progress workflow',
});

const adminCoachCommandTerminal = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  eyebrow: 'Teach the Coach terminal',
  title: 'Admin Coach command terminal',
  summary: 'Use Coach as the review-gated terminal for intake, client workout drafts, owner self-logging help, and PLAUD handoff.',
  focus: 'Select the right client or self context first, ask for the exact action, then review the staged result before any save.',
  primaryAction: { label: 'Open Coach', to: '/dashboard/admin/coach-assistant' },
  fastPath: [
    'Confirm the client scope or owner self context.',
    'Ask Coach for the specific draft, intake, or logging help.',
    'Review the staged action before saving in Logger, Planner, or Intake.',
  ],
  actions: [
    { label: 'Open Coach', to: '/dashboard/admin/coach-assistant' },
    { label: 'PLAUD Intake', to: '/dashboard/admin/coach-assistant?workspace=plaud' },
    { label: 'Client Hub Training', to: '/dashboard/admin/client-management?tab=training' },
    { label: 'My Workout', to: '/dashboard/admin/log-my-workout?loadPlan=today' },
  ],
  primaryPrompt: 'teach me the admin Coach command terminal workflow for client and owner workout actions',
});

const adminPeoplePrimaryAction = (path: string) => {
  if (includesAny(path, ['trainer-onboarding'])) return { label: 'Add Trainer', to: '/dashboard/admin/trainer-onboarding' };
  if (includesAny(path, ['client-onboarding'])) return { label: 'Onboard Client', to: '/dashboard/admin/client-onboarding' };
  if (includesAny(path, ['client-trainer-assignments'])) return { label: 'Assign Clients', to: '/dashboard/admin/client-trainer-assignments' };
  if (includesAny(path, ['trainer-management'])) return { label: 'Open Trainer Profiles', to: '/dashboard/admin/trainer-management' };
  if (includesAny(path, ['user-onboarding'])) return { label: 'Add User', to: '/dashboard/admin/user-onboarding' };
  if (includesAny(path, ['unified-onboarding'])) return { label: 'Open Unified Onboarding', to: '/dashboard/admin/unified-onboarding' };
  return { label: 'Open User Management', to: '/dashboard/admin/user-management' };
};

const adminPeopleOnboarding = (path: string, base: DashboardTeachMeGuideCopy) => {
  const primaryAction = adminPeoplePrimaryAction(path);
  return applyPatch(base, {
  eyebrow: 'Teach people operations',
  title: 'Admin people setup',
  summary: 'Use people routes to create the right account, collect the right details, and connect clients to the trainer who can act.',
  focus: 'Do not stop at account creation. Finish the assignment, onboarding state, training context, and first next action.',
  primaryAction,
  fastPath: [
    'Find or create the person.',
    'Complete role-specific onboarding.',
    'Assign trainer and next action.',
  ],
  actions: [
    primaryAction,
    { label: 'Trainers', to: '/dashboard/admin/trainer-management' },
    { label: 'Client Onboarding', to: '/dashboard/admin/client-onboarding' },
    { label: 'Assignments', to: '/dashboard/admin/client-trainer-assignments' },
  ],
  primaryPrompt: 'teach me the admin people setup workflow',
  });
};

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

const adminImmigrationWorkspace = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  eyebrow: 'Teach admin special ops',
  title: 'Admin immigration workspace',
  summary: 'Use Canada Immigration as a separate admin workspace for immigration study, checklist, timeline, and document tracking.',
  focus: 'Keep immigration work separate from client training, billing, and session changes. Finish the checklist item, then return to the admin owner screen that needs attention.',
  primaryAction: { label: 'Open Immigration', to: '/dashboard/admin/immigration' },
  fastPath: [
    'Open the immigration workspace.',
    'Review checklist, timeline, or study task.',
    'Return to Coach, clients, or schedule only if action is needed.',
  ],
  steps: [
    'Use this route for immigration-specific study and tracking instead of mixing it into client operations.',
    'Treat document or timeline updates as their own workstream, not as training-session or billing actions.',
    'Use Coach or Messages only when the next admin action must be drafted or communicated.',
  ],
  actions: [
    { label: 'Immigration', to: '/dashboard/admin/immigration' },
    { label: 'Open Coach', to: '/dashboard/admin/coach-assistant' },
    { label: 'Messages', to: '/dashboard/admin/messages' },
    { label: 'Admin Overview', to: '/dashboard/admin/overview' },
  ],
  primaryPrompt: 'teach me the admin immigration workspace workflow',
});

const adminDesignSystemCheck = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  eyebrow: 'Teach design quality',
  title: 'Admin design system check',
  summary: 'Use the Style Guide to check SwanStudios tokens, contrast, mobile behavior, and component consistency before shipping a visible surface.',
  focus: 'This is a quality-control route: inspect the design language, then fix the actual product screen that fails the standard.',
  primaryAction: { label: 'Open Style Guide', to: '/dashboard/admin/style-guide' },
  fastPath: [
    'Check tokens, typography, and contrast.',
    'Verify mobile and desktop behavior.',
    'Apply the fix on the real product surface.',
  ],
  steps: [
    'Use the Style Guide to compare buttons, spacing, colors, and responsive patterns against the live dashboard surface.',
    'Do not treat a pretty component in isolation as done; the mounted admin, trainer, client, or user screen still needs the same polish.',
    'Move from Style Guide back to the product route that needs the improvement and verify the real workflow.',
  ],
  actions: [
    { label: 'Style Guide', to: '/dashboard/admin/style-guide' },
    { label: 'Content Studio', to: '/dashboard/admin/content' },
    { label: 'Security', to: '/dashboard/admin/security' },
    { label: 'Admin Overview', to: '/dashboard/admin/overview' },
  ],
  primaryPrompt: 'teach me the admin design system quality check workflow',
});

const adminLensFoundryLab = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  eyebrow: 'Teach design lab',
  title: 'Admin Lens Foundry Lab',
  summary: 'Use Lens Foundry to inspect morph receipts, design-brain structure, Fable direction packets, portfolio ideas, and promotion gates before anything moves into production.',
  focus: 'This is a private systems lab: prototype in Lens Foundry, review the trust boundary, then promote only stable artifacts into SwanStudios.',
  primaryAction: { label: 'Open Lens Foundry', to: '/dashboard/admin/lens-foundry' },
  fastPath: [
    'Check Slice 1 morph receipts.',
    'Pick the design or operator lane.',
    'Promote only reviewed artifacts.',
  ],
  steps: [
    'Start with Morph Lab when motion, layout, or View Transition behavior is the risk.',
    'Use Design Brain and Portfolio lanes for Fable direction packets and creative exploration.',
    'Move work into SS-PT only through a reviewed promotion gate with synthetic data boundaries intact.',
  ],
  actions: [
    { label: 'Lens Foundry', to: '/dashboard/admin/lens-foundry' },
    { label: 'Style Guide', to: '/dashboard/admin/style-guide' },
    { label: 'Coach Command', to: '/dashboard/admin/coach-assistant' },
    { label: 'Security', to: '/dashboard/admin/security' },
  ],
  primaryPrompt: 'teach me the admin lens foundry workflow',
});

export const refineAdminGuide = (
  path: string,
  base: DashboardTeachMeGuideCopy,
): DashboardTeachMeGuideCopy => {
  if (includesAny(path, ['overview'])) {
    return adminOverviewTriage(base);
  }
  if (includesAny(path, ['coach-assistant', 'plaud', 'intake'])) {
    return adminCoachCommandTerminal(base);
  }
  if (includesAny(path, ['log-my-workout'])) {
    return adminSelfWorkoutLogging(base);
  }
  if (includesAny(path, ['log-workout'])) {
    return adminClientWorkoutLogging(base);
  }
  if (includesAny(path, ['client-progress-tracking'])) {
    return adminClientProgressTracking(base);
  }
  if (includesAny(path, ['client-management', 'client-details'])) {
    return adminClientHubCommand(base);
  }
  if (includesAny(path, ['pending-orders', 'revenue', 'admin-packages'])) {
    return adminMoneyPath(base);
  }
  if (isAdminSelfPlannerRoute(path)) {
    return adminSelfWorkoutPlanning(base);
  }
  if (includesAny(path, ['workout-planner', 'workouts', 'bootcamp', 'equipment'])) {
    return adminTrainingSystems(path, base);
  }
  if (includesAny(path, ['gamification', 'virtual-olympics', 'my-home', 'sprint-planner'])) {
    return adminEngagementSystems(path, base);
  }
  if (includesAny(path, ['admin-sessions', 'master-schedule', 'session-allocation'])) {
    return adminScheduleControl(path, base);
  }
  if (includesAny(path, ['marketing', 'content', 'badge-creator', 'automation'])) {
    return adminGrowthOperations(path, base);
  }
  if (includesAny(path, ['trainer-permissions'])) {
    return adminTrainerEnablement(base);
  }
  if (includesAny(path, ['user-management', 'trainer-management', 'onboarding', 'client-trainer-assignments'])) {
    return adminPeopleOnboarding(path, base);
  }
  if (includesAny(path, ['body-map', 'meal-planner', 'nutrition', 'messages', 'video-call', 'videos', 'notes', 'photos'])) {
    return adminClientCareLoop(path, base);
  }
  if (includesAny(path, ['security', 'feature-access', 'waivers', 'sms-logs'])) {
    return adminTrustAndAccess(base);
  }
  if (includesAny(path, ['immigration'])) {
    return adminImmigrationWorkspace(base);
  }
  if (includesAny(path, ['lens-foundry'])) {
    return adminLensFoundryLab(base);
  }
  if (includesAny(path, ['style-guide'])) {
    return adminDesignSystemCheck(base);
  }
  return base;
};
