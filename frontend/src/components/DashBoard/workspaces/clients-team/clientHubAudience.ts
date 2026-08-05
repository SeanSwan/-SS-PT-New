/**
 * MODULE: clientHubAudience
 * PURPOSE: Role-scoping config for the shared selected-client command
 *          workspace (Client Hub). One workspace, two audiences:
 *          - admin:   full account controls at /dashboard/admin/client-management
 *          - trainer: assigned-clients-only view at /dashboard/trainer/clients,
 *                     admin account controls hidden, role-local deep links.
 * OWNER: Clients & Team workspace (ClientsWorkspace + view + detail tabs).
 *
 * CONTRACT: 'admin' config values MUST stay byte-identical to the historical
 * hardcoded paths so every existing admin deep link keeps resolving.
 */

import type { DetailTab } from './ClientDetailView';

export type ClientHubAudience = 'admin' | 'trainer';

export interface ClientHubAudienceConfig {
  id: ClientHubAudience;
  /** Base path the workspace itself is mounted at (returnTo targets). */
  clientManagementBase: string;
  /** Role-local Coach Command Center mount. */
  coachAssistantBase: string;
  /** Role-local full Workout Planner mount. */
  workoutPlannerBase: string;
  /** Detail tabs this audience may open. */
  visibleDetailTabs: DetailTab[];
  /** Account lifecycle, manual creation, view-as, assignment management. */
  canManageAccounts: boolean;
  /** Roster-wide admin panels (activation queue, nutrition triage/review). */
  showRosterOpsPanels: boolean;
  /** Copy shown when the roster is empty. */
  emptyRosterCopy: string;
}

export const CLIENT_HUB_AUDIENCES: Record<ClientHubAudience, ClientHubAudienceConfig> = {
  admin: {
    id: 'admin',
    clientManagementBase: '/dashboard/admin/client-management',
    coachAssistantBase: '/dashboard/admin/coach-assistant',
    workoutPlannerBase: '/dashboard/admin/workout-planner',
    visibleDetailTabs: ['training', 'progress', 'nutrition', 'biometrics', 'overview', 'settings'],
    canManageAccounts: true,
    showRosterOpsPanels: true,
    emptyRosterCopy: 'No clients yet. Create the first client to open the command center.',
  },
  trainer: {
    id: 'trainer',
    clientManagementBase: '/dashboard/trainer/clients',
    coachAssistantBase: '/dashboard/trainer/coach-assistant',
    workoutPlannerBase: '/dashboard/trainer/workout-planner',
    visibleDetailTabs: ['training', 'progress', 'nutrition', 'biometrics'],
    canManageAccounts: false,
    /**
     * Phase 4A: trainers now get the roster nutrition triage/review panels.
     * Backend scoping verified: /api/macros/roster-triage, /review-queue and
     * /client-timeline each call assertAssignmentOrAdmin per userId, so a
     * trainer only ever receives assigned-client data.
     */
    showRosterOpsPanels: true,
    emptyRosterCopy: 'No assigned clients yet. Clients appear here once an admin assigns them to you.',
  },
};

export const getClientHubAudienceConfig = (
  audience: ClientHubAudience,
): ClientHubAudienceConfig => CLIENT_HUB_AUDIENCES[audience] ?? CLIENT_HUB_AUDIENCES.admin;

export const isDetailTabVisibleForAudience = (
  audience: ClientHubAudience,
  tab: DetailTab,
): boolean => getClientHubAudienceConfig(audience).visibleDetailTabs.includes(tab);
