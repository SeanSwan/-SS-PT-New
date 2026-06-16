/**
 * SHARED LOGIC: Admin overview Teach Me route refiner.
 * PURPOSE: Teaches the mounted admin overview as a triage surface, not a write
 * surface, so operators move alerts into Coach, Client Hub, Orders, Sessions,
 * Revenue, or Trainer tools with one clear next click.
 */

import type { DashboardTeachMeGuideCopy } from './DashboardTeachMeGuide.logic';
import { applyPatch } from './DashboardTeachMeGuide.routeRefiners.shared';

export const adminOverviewTriage = (
  base: DashboardTeachMeGuideCopy,
): DashboardTeachMeGuideCopy => applyPatch(base, {
  eyebrow: 'Teach admin triage',
  title: 'Admin overview triage',
  summary: 'Use Command Center Overview as the first-screen scanner for client proof, sessions, orders, revenue, trainer readiness, and trust alerts.',
  focus: 'Overview is not the place to guess or write. Find the live signal, choose the owner route, then finish inside the source-of-truth screen.',
  primaryAction: { label: 'Open Coach Command', to: '/dashboard/admin/coach-assistant' },
  fastPath: [
    'Scan alerts and proof.',
    'Pick the owner route.',
    'Finish inside the source screen.',
  ],
  steps: [
    'Scan the overview widgets for stale client proof, pending work, payment/order exceptions, session pressure, trainer readiness, and trust alerts.',
    'Classify the signal as client, session, order, revenue, trainer, or trust before opening another route.',
    'Open Coach for staged client action, Client Hub for the record, Orders for fulfillment, Sessions for credits/calendar, Revenue for reporting, or Trainer Permissions for enablement.',
    'Do not write from overview. Finish the save, approval, message, or billing check inside the source screen that owns the record.',
  ],
  actions: [
    { label: 'Open Coach Command', to: '/dashboard/admin/coach-assistant' },
    { label: 'Client Hub Training', to: '/dashboard/admin/client-management?tab=training' },
    { label: 'Orders', to: '/dashboard/admin/pending-orders' },
    { label: 'Sessions', to: '/dashboard/admin/admin-sessions' },
    { label: 'Revenue', to: '/dashboard/admin/revenue' },
    { label: 'Trainer Enablement', to: '/dashboard/admin/trainer-permissions' },
  ],
  primaryPrompt: 'teach me the admin overview triage workflow',
});
