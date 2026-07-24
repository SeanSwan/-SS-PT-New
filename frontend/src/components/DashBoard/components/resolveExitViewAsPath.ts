/**
 * MODULE: resolveExitViewAsPath
 * PURPOSE: Map the dashboard surface an admin is currently viewing to the SAME
 *          surface on their own admin dashboard, so leaving View-As preserves
 *          the work in progress instead of dumping the user at a landing page.
 *
 * WHY THIS EXISTS:
 * `activeRole` is URL-derived (UniversalDashboardLayout.tsx:69-79), so an admin
 * standing on /dashboard/trainer/build-plan is running the trainer shell. Before
 * the 2026-07-24 superset closure there was often nowhere equivalent to send
 * them. Now that admin mounts every coaching capability, "exit" can mean
 * "carry on with this exact task, as yourself" — one click, no lost context.
 *
 * Query strings are preserved because they carry the working context
 * (?clientId=, ?loadPlan=, ?source=). Dropping them would technically exit
 * View-As while still losing the user's place.
 */

import { roleConfigurations } from '../UniversalDashboardLayout.routes';

const ADMIN_BASE = '/dashboard/admin';

/** Route suffixes the admin dashboard actually mounts, params stripped. */
const adminRouteSuffixes = (): Set<string> =>
  new Set(roleConfigurations.admin.routes.map((route) => route.path.split('/:')[0]));

/**
 * Given the current location, return the admin path that does the same job.
 * Falls back to the admin default surface when no equivalent is mounted, so the
 * exit control can never dead-end on a 404 or bounce straight back into the
 * role the user is trying to leave.
 */
export const resolveExitViewAsPath = (
  pathname: string | undefined | null,
  search = '',
): string => {
  const adminDefault = `${ADMIN_BASE}${roleConfigurations.admin.defaultPath}`;
  if (!pathname) return adminDefault;

  const segments = pathname.split('/').filter(Boolean);
  const dashboardIndex = segments.indexOf('dashboard');
  if (dashboardIndex === -1) return adminDefault;

  // Everything after /dashboard/:role — e.g. ['build-plan'] or ['nutrition','61'].
  const tail = segments.slice(dashboardIndex + 2);
  if (tail.length === 0) return adminDefault;

  const suffix = `/${tail.join('/')}`;
  const baseSuffix = `/${tail[0]}`;

  // Exact match first, then the parameterised base (e.g. /nutrition/61 -> /nutrition).
  const mounted = adminRouteSuffixes();
  const target = mounted.has(suffix) ? suffix : mounted.has(baseSuffix) ? suffix : null;

  if (!target) return adminDefault;

  // Preserve working context (clientId, loadPlan, source, returnTo).
  const query = search && search !== '?' ? (search.startsWith('?') ? search : `?${search}`) : '';
  return `${ADMIN_BASE}${target}${query}`;
};
