/**
 * Gate WIRING contract.
 *
 * The gates themselves are tested. What kept surviving mutation was the wiring:
 * flipping `gamificationKnown: !gamificationUnavailable` to a literal `true`, or
 * `profileStatsKnown: statsKnown` to `true`, left the whole suite green, because
 * every gate test hands the flag in directly and no test reads what the
 * producer computes.
 *
 * These assertions pin the producers. They are source-level on purpose — there
 * is no render test for HomeTab (12 hooks, auth, router, query client) — but
 * unlike a plain grep they assert the flag is DERIVED, and that no call site
 * passes a hardcoded truth.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(here, rel), 'utf8');

const homeTab = read('../components/HomeTab.tsx');
const controller = read('./useUserDashboardV3Controller.ts');
const shell = read('../UserDashboard.V3.tsx');
const profileHook = read('../../../hooks/profile/useProfile.ts');

describe('gate wiring', () => {
  it('never passes a hardcoded true to a known-flag prop', () => {
    for (const [name, source] of Object.entries({ homeTab, shell })) {
      expect(source, name).not.toMatch(/gamificationKnown=\{true\}/);
      expect(source, name).not.toMatch(/profileStatsKnown=\{true\}/);
      expect(source, name).not.toMatch(/gamificationKnown:\s*true/);
      expect(source, name).not.toMatch(/profileStatsKnown:\s*true/);
    }
  });

  it('derives the gamification flag from the resolver, not from a literal', () => {
    expect(homeTab).toMatch(/gamificationUnavailable\s*=\s*!isDataKnown\(gamificationStatus\)/);
    expect(controller).toMatch(/gamificationKnown\s*=\s*isDataKnown\(gamificationStatus\)/);
  });

  it('derives the profile-stats flag from the hook signal', () => {
    expect(controller).toMatch(/profileStatsKnown:\s*statsKnown/);
  });

  it('keeps the profile-stats signal FAIL-CLOSED at rest', () => {
    // A boolean cannot express this. A positive flag starting false flashes an
    // outage before the request fires; a negative flag starting false is open
    // for the whole pending window and forever when the loader early-returns.
    expect(profileHook).toMatch(/useState<'loading' \| 'ready' \| 'unavailable'>\('loading'\)/);
    expect(profileHook).toMatch(/setStatsStatus\('ready'\)/);
    // The no-user early return must mark unavailable, not leave a dead spinner.
    expect(profileHook).toMatch(/if \(!user\) \{\s*[\s\S]{0,200}?setStatsStatus\('unavailable'\)/);
    expect(profileHook).toMatch(/statsKnown: statsStatus === 'ready'/);
  });

  it('passes the derived flag to every consumer that renders a gamification number', () => {
    const consumers = [
      'HomeTabVisionLeftRail',
      'HomeTabVisionCenter',
      'HomeTabVisionRightRail',
      'DailyHealthLoop',
    ];
    for (const consumer of consumers) {
      const mount = homeTab.slice(homeTab.indexOf(`<${consumer}`));
      expect(mount.slice(0, 900), consumer).toContain('gamificationKnown=');
    }
  });
});
