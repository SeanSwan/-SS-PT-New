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

  it('keeps the mobile Coach entry outside any profile.data guard', () => {
    // The mobile entry block must be its own {!isDesktop && ...} render, never
    // gated on gamification data. (Merge M3 removed the mobile gamification
    // card entirely — the M2 cover identity strip is now the single source —
    // so the entry is no longer even near a profile.data condition.)
    expect(PAGE_SOURCE).toMatch(
      /\{!isDesktop && \(\s*<MobileCoachEntry>/,
    );
    expect(PAGE_SOURCE).toContain('<MobileCoachEntry>');
    // The old gamification guard the entry used to follow is gone post-M3.
    expect(PAGE_SOURCE).not.toContain('{!isDesktop && profile.data && (');
  });

  it('does not add Coach to the in-page tab unions (it navigates away)', () => {
    expect(PAGE_SOURCE).toContain(
      "const VALID_TABS = ['feed', 'reels', 'friends', 'challenges', 'notifications'] as const",
    );
  });
  it('records notification click lifecycle before safe-link navigation', () => {
    expect(PAGE_SOURCE).toContain('await socialNotifications.markAsClicked(notification.id);');
    expect(PAGE_SOURCE).toContain("link.startsWith('/') && !link.startsWith('//')");
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
