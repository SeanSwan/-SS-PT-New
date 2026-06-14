/**
 * SHARED LOGIC: Admin dashboard Teach Me route refiners.
 * PURPOSE: Teaches admins the right first move for money, training, scheduling,
 * growth, onboarding, and trust routes without performing hidden writes.
 */

import type { DashboardTeachMeGuideCopy } from './DashboardTeachMeGuide.logic';
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

const adminClientCarePrimaryAction = (path: string) => {
  if (includesAny(path, ['meal-planner', 'nutrition'])) {
    return { label: 'Open Nutrition', to: '/dashboard/admin/meal-planner' };
  }
  if (includesAny(path, ['messages'])) {
    return { label: 'Open Messages', to: '/dashboard/admin/messages' };
  }
  if (includesAny(path, ['video-call', 'videos'])) {
    return { label: 'Open Video Assessment', to: '/dashboard/admin/video-call' };
  }
  if (includesAny(path, ['photos'])) {
    return { label: 'Open Photos', to: '/dashboard/admin/photos' };
  }
  return { label: 'Open Pain Chart', to: '/dashboard/admin/body-map' };
};

const adminClientCareLoop = (path: string, base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  eyebrow: 'Teach client care',
  title: 'Admin client care loop',
  summary: 'Use admin-as-trainer tools to turn pain, nutrition, messages, and assessment signals into the next client action.',
  focus: 'Pick the client signal first, connect it to training context, then decide whether the next move is log, plan, message, or schedule.',
  primaryAction: adminClientCarePrimaryAction(path),
  fastPath: [
    'Find the client signal.',
    'Tie it to training context.',
    'Log, message, schedule, or adjust.',
  ],
  actions: [
    { label: 'Pain Chart', to: '/dashboard/admin/body-map' },
    { label: 'Nutrition', to: '/dashboard/admin/meal-planner' },
    { label: 'Messages', to: '/dashboard/admin/messages' },
    { label: 'Video Assessment', to: '/dashboard/admin/video-call' },
    { label: 'Client Hub Training', to: '/dashboard/admin/client-management?tab=training' },
  ],
  primaryPrompt: 'teach me the admin client care workflow',
});

const adminTrustAndAccess = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  eyebrow: 'Teach trust operations',
  title: 'Admin trust and access',
  summary: 'Use trust routes to verify security posture, feature access, waivers, and communication logs before granting or changing access.',
  focus: 'Protect the business before moving fast: confirm access, consent, waiver state, and delivery evidence.',
  primaryAction: { label: 'Review Security', to: '/dashboard/admin/security' },
  fastPath: [
    'Check security and access posture.',
    'Confirm consent, waiver, or delivery evidence.',
    'Adjust access only after the record is clear.',
  ],
  actions: [
    { label: 'Security', to: '/dashboard/admin/security' },
    { label: 'Feature Access', to: '/dashboard/admin/feature-access' },
    { label: 'Waivers', to: '/dashboard/admin/waivers' },
    { label: 'SMS Logs', to: '/dashboard/admin/sms-logs' },
  ],
  primaryPrompt: 'teach me the admin trust and access workflow',
});

export const refineAdminGuide = (
  path: string,
  base: DashboardTeachMeGuideCopy,
): DashboardTeachMeGuideCopy => {
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
