/**
 * SHARED LOGIC: Admin growth Teach Me route refiners.
 * PURPOSE: Separates marketing, content, badges, and automation into distinct
 * first-click workflows without triggering any outward sends.
 */

import type { DashboardTeachMeGuideCopy } from './DashboardTeachMeGuide.logic';
import { applyPatch, includesAny } from './DashboardTeachMeGuide.routeRefiners.shared';

type GrowthRouteKind = 'content' | 'badge' | 'automation' | 'marketing';

const growthRouteKind = (path: string): GrowthRouteKind => {
  if (includesAny(path, ['content'])) return 'content';
  if (includesAny(path, ['badge-creator'])) return 'badge';
  if (includesAny(path, ['automation'])) return 'automation';
  return 'marketing';
};

const adminMarketingLoop = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
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

const adminContentStudio = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  eyebrow: 'Teach content operations',
  title: 'Admin content studio',
  summary: 'Use Content Studio to turn training proof, offers, and client wins into publishable assets.',
  focus: 'Start with the asset job: what proof it shows, where it publishes, and what next action it should drive.',
  primaryAction: { label: 'Open Content Studio', to: '/dashboard/admin/content' },
  fastPath: [
    'Pick the content job.',
    'Attach proof or campaign context.',
    'Publish or hand it back to Marketing.',
  ],
  steps: [
    'Use Content Studio when the work is asset creation or publishing, not lead triage.',
    'Connect every asset to a proof point, offer, or client next step.',
    'Return to Marketing when the question becomes campaign cadence or lead follow-up.',
  ],
  actions: [
    { label: 'Content Studio', to: '/dashboard/admin/content' },
    { label: 'Marketing', to: '/dashboard/admin/marketing' },
    { label: 'Badge Creator', to: '/dashboard/admin/badge-creator' },
    { label: 'Orders', to: '/dashboard/admin/pending-orders' },
  ],
  primaryPrompt: 'teach me the admin content studio publishing workflow',
});

const adminBadgeStudio = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  eyebrow: 'Teach reward assets',
  title: 'Admin badge studio',
  summary: 'Use Badge Creator for reward art that supports real achievements, programs, and community milestones.',
  focus: 'Design the badge from the behavior it rewards, then connect it to gamification or content instead of making disconnected art.',
  primaryAction: { label: 'Open Badge Creator', to: '/dashboard/admin/badge-creator' },
  fastPath: [
    'Name the reward behavior.',
    'Create or refine the badge asset.',
    'Connect it to content or gamification.',
  ],
  actions: [
    { label: 'Badge Creator', to: '/dashboard/admin/badge-creator' },
    { label: 'Content Studio', to: '/dashboard/admin/content' },
    { label: 'Gamification', to: '/dashboard/admin/gamification' },
    { label: 'Marketing', to: '/dashboard/admin/marketing' },
  ],
  primaryPrompt: 'teach me the admin badge creator reward workflow',
});

const adminAutomationFollowUp = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  eyebrow: 'Teach guarded follow-up',
  title: 'Admin automation follow-up',
  summary: 'Use Automation to inspect follow-up sequences, dry-run messaging, and confirm outbound work only when it is ready.',
  focus: 'Guard every send: confirm audience, template, suppression, owner approval, and logs before any outward message is armed.',
  primaryAction: { label: 'Open Automation', to: '/dashboard/admin/automation' },
  fastPath: [
    'Review the sequence state.',
    'Confirm suppression and template safety.',
    'Check logs before enabling real sends.',
  ],
  actions: [
    { label: 'Automation', to: '/dashboard/admin/automation' },
    { label: 'Marketing', to: '/dashboard/admin/marketing' },
    { label: 'SMS Logs', to: '/dashboard/admin/sms-logs' },
    { label: 'Client Onboarding', to: '/dashboard/admin/client-onboarding' },
  ],
  primaryPrompt: 'teach me the admin automation guarded follow-up workflow',
});

export const adminGrowthOperations = (
  path: string,
  base: DashboardTeachMeGuideCopy,
): DashboardTeachMeGuideCopy => {
  if (growthRouteKind(path) === 'content') return adminContentStudio(base);
  if (growthRouteKind(path) === 'badge') return adminBadgeStudio(base);
  if (growthRouteKind(path) === 'automation') return adminAutomationFollowUp(base);
  return adminMarketingLoop(base);
};
