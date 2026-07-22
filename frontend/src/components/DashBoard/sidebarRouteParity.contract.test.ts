/**
 * Sidebar ↔ route-registry parity contracts.
 *
 * Every live sidebar entry must resolve to a route registered for the same role.
 * Admin parity deliberately walks the complete WORKSPACE_CONFIG inventory: a
 * hand-maintained sample allowed untested links to regress into redirect/404 churn.
 */
import { describe, expect, it } from 'vitest';
import { roleConfigurations } from './UniversalDashboardLayout.routes';
import { trainerNavConfig } from './Pages/trainer-dashboard/TrainerStellarSidebar';
import { clientNavConfig } from './Pages/client-dashboard/ClientStellarSidebar';
import { WORKSPACE_CONFIG } from '../../config/dashboard-tabs';

const routePathsFor = (role: 'trainer' | 'client' | 'admin'): string[] =>
  roleConfigurations[role].routes.map((route) => route.path.replace(/\/:.*$/, ''));

const navPathToRoutePath = (navPath: string, role: string): string =>
  navPath.split('?')[0].replace(`/dashboard/${role}`, '') || '/';

const flattenNav = (config: Array<{ items: Array<{ label: string; path: string }> }>) =>
  config.flatMap((group) => group.items);

describe('sidebar route parity', () => {
  it('every trainer sidebar entry resolves to a registered trainer route', () => {
    const registered = routePathsFor('trainer');
    for (const item of flattenNav(trainerNavConfig)) {
      const routePath = navPathToRoutePath(item.path, 'trainer');
      expect(registered, `trainer nav "${item.label}" → ${routePath}`).toContain(routePath);
    }
  });

  it('every client sidebar entry resolves to a registered client route', () => {
    const registered = routePathsFor('client');
    for (const item of flattenNav(clientNavConfig)) {
      const routePath = navPathToRoutePath(item.path, 'client');
      expect(registered, `client nav "${item.label}" → ${routePath}`).toContain(routePath);
    }
  });

  it('every admin sidebar entry resolves to a registered admin route', () => {
    const registered = routePathsFor('admin');
    expect(WORKSPACE_CONFIG.length).toBeGreaterThan(30);

    for (const item of WORKSPACE_CONFIG) {
      const routePath = navPathToRoutePath(item.prefix, 'admin');
      expect(registered, `admin nav "${item.id}" → ${routePath}`).toContain(routePath);
    }
  });

  it('surfaces the audit-flagged trainer coaching tools in the nav', () => {
    const labels = flattenNav(trainerNavConfig).map((item) => item.label);
    expect(labels).toContain('My Earnings');
    expect(labels).toContain('Form Assessments');
    expect(labels).toContain('Pain Charts');
    expect(labels).toContain('Video Assessment');
    expect(labels).toContain('Sprint Planner');
    // Deliberately NOT surfaced: trainer Challenges — its moderation queue
    // endpoint is not assignment-scoped (security review 2026-07-13);
    // Sean's scoping ruling gates re-adding it.
    expect(labels).not.toContain('Challenges');
  });
});
