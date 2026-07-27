/**
 * MODULE: resolveAudienceFromPath
 * PURPOSE: Resolve the Client Hub audience from the CURRENT dashboard URL so a
 *          shared surface links back into the dashboard the actor is already
 *          standing in, instead of a hardcoded role path.
 *
 * WHY THIS EXISTS (root cause, 2026-07-24):
 * `UniversalDashboardLayout.tsx:69-79` derives `activeRole` from the URL path
 * segment. A shared component that hardcodes `/dashboard/trainer/...` therefore
 * does not merely navigate — it DEMOTES an admin, swapping the route table and
 * sidebar for the trainer shell. Route locality is the fix: whichever dashboard
 * you are in is the dashboard you stay in.
 *
 * Precedent: PlaudIntelligenceWorkspacePage.logic.ts uses the same path-derived
 * audience approach; this module makes it exact, shared, and tested.
 */

import type { ClientHubAudience } from './clientHubAudience';

/**
 * Reads the role segment of a `/dashboard/:role/...` pathname.
 *
 * Matches the segment exactly rather than substring-testing, so a client id or
 * query fragment containing the word "trainer" can never flip the audience.
 * Anything that is not an explicit trainer dashboard path resolves to 'admin',
 * matching the fail-safe default of `getClientHubAudienceConfig`.
 */
export const resolveAudienceFromPath = (pathname: string | undefined | null): ClientHubAudience => {
  if (!pathname) return 'admin';

  const segments = pathname.split('/').filter(Boolean);
  const dashboardIndex = segments.indexOf('dashboard');
  if (dashboardIndex === -1) return 'admin';

  return segments[dashboardIndex + 1] === 'trainer' ? 'trainer' : 'admin';
};