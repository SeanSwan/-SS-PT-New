/**
 * S1.5 wiring contract — the social dock must be reachable from a LIVE surface.
 * ===========================================================================
 * Added by the rule-61 hostile review (finding F1.1, 2026-09-18). S1 shipped the
 * Coach Signal action into SocialCoachDock, but the dock's only mount point
 * (DashboardFeedTab) had no live consumer — so the coach action was unreachable
 * dead code. These assertions fail if the dock is ever orphaned again.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(resolve(__dirname, rel), 'utf8');

const homeSource = read('./ClientDashboardHome.tsx');
const cardStyles = read('./ClientDashboardHome.cardStyles.ts');
const dockSource = read('../../Social/CoachDock/SocialCoachDock.tsx');
const routeSource = read('../../../routes/main-routes.tsx');

describe('S1.5 — social dock is mounted on a live surface', () => {
  it('mounts SocialCoachDock inside the composed Home surface', () => {
    expect(homeSource).toContain("from '../../Social/CoachDock/SocialCoachDock'");
    expect(homeSource).toContain('<SocialCoachDock />');
  });

  it('gives the dock a full-width slot rather than a grid cell', () => {
    expect(homeSource).toContain('<SocialDockSlot>');
    expect(cardStyles).toContain('export const SocialDockSlot');
  });

  it('reaches the dock from a route that the app actually serves', () => {
    // The Home surface is the /user-dashboard route, which IS mounted.
    expect(routeSource).toContain('UserDashboard');
  });

  it('keeps the coach chip role-gated so client surfaces are unchanged', () => {
    expect(dockSource).toContain("const isCoachRole = (role?: string) => role === 'trainer' || role === 'admin'");
    expect(dockSource).toContain("isCoachRole(user?.role) && (");
    expect(dockSource).toContain("openPanel === 'signal' && isCoachRole(user?.role)");
  });

  it('lazily mounts the signal picker — no fetch on feed load', () => {
    expect(dockSource).toContain("openPanel === 'signal' && isCoachRole(user?.role) && <InlineSignalPicker />");
  });
});
