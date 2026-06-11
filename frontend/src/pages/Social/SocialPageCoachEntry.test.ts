/**
 * SocialPage.V3 — Swan Coach entry contract (Workstream D, fourth face)
 * =====================================================================
 * Locks the social-hub Coach entry shipped 2026-06-11:
 *  - desktop Quick Actions and the mobile entry both navigate to the
 *    canonical role-routed Coach page via getSwanCoachDashboardPath
 *  - the mobile entry lives OUTSIDE the profile.data guard, so a
 *    gamification fetch failure can never hide the Coach
 *  - the role helper sends 'user'/unknown roles to the client dashboard
 *    (UniversalDashboardLayout normalizes 'user' -> 'client' the same way)
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  getSwanCoachDashboardPath,
} from '../../components/UserDashboard/components/swanCoachDashboardRoute';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SOURCE = readFileSync(resolve(__dirname, './SocialPage.V3.tsx'), 'utf8');

describe('SocialPage.V3 Coach entry — source contract', () => {
  it('imports the shared role-routed Coach path helper', () => {
    expect(PAGE_SOURCE).toContain(
      "import { getSwanCoachDashboardPath } from '../../components/UserDashboard/components/swanCoachDashboardRoute'",
    );
  });

  it('renders an Ask Swan Coach quick action wired to the helper', () => {
    const matches = PAGE_SOURCE.match(
      /navigate\(getSwanCoachDashboardPath\(user\?\.role\)\)/g,
    );
    // One desktop sidebar entry + one mobile entry
    expect(matches).toHaveLength(2);
    expect(PAGE_SOURCE.match(/Ask Swan Coach/g)).toHaveLength(2);
  });

  it('keeps the mobile Coach entry outside the profile.data guard', () => {
    // The mobile entry block must be its own {!isDesktop && ...} render,
    // not nested inside the gamification card's profile.data condition.
    expect(PAGE_SOURCE).toMatch(
      /\{!isDesktop && \(\s*<MobileCoachEntry>/,
    );
    const mobileEntryIndex = PAGE_SOURCE.indexOf('<MobileCoachEntry>');
    const gamificationGuardIndex = PAGE_SOURCE.indexOf('{!isDesktop && profile.data && (');
    expect(mobileEntryIndex).toBeGreaterThan(-1);
    expect(gamificationGuardIndex).toBeGreaterThan(-1);
    // Entry renders after (sibling to) the guarded gamification block
    expect(mobileEntryIndex).toBeGreaterThan(gamificationGuardIndex);
  });

  it('does not add Coach to the in-page tab unions (it navigates away)', () => {
    expect(PAGE_SOURCE).toContain(
      "const VALID_TABS = ['feed', 'reels', 'friends', 'challenges', 'notifications'] as const",
    );
  });
});

describe('getSwanCoachDashboardPath role routing', () => {
  it.each([
    ['admin', '/dashboard/admin/coach-assistant'],
    ['trainer', '/dashboard/trainer/coach-assistant'],
    ['client', '/dashboard/client/coach-assistant'],
    ['user', '/dashboard/client/coach-assistant'],
    [undefined, '/dashboard/client/coach-assistant'],
    [null, '/dashboard/client/coach-assistant'],
  ])('routes role %s to %s', (role, expected) => {
    expect(getSwanCoachDashboardPath(role as string | null | undefined)).toBe(expected);
  });
});
