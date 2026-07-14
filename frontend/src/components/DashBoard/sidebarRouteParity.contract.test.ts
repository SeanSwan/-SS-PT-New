/**
 * Sidebar ↔ route-registry parity contracts (Dashboard batch 2026-07-13, P2-1).
 *
 * The audit found ~8 registered routes per role that were invisible in the
 * nav (dead ends unless deep-linked). These locks ensure every sidebar entry
 * points at a registered route for its role, so nav items can never rot into
 * links that bounce to the role default path.
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

  it('surfaces the audit-flagged trainer coaching tools in the nav', () => {
    const labels = flattenNav(trainerNavConfig).map((item) => item.label);
    expect(labels).toContain('My Earnings');
    expect(labels).toContain('Form Assessments');
    expect(labels).toContain('Pain Charts');
    expect(labels).toContain('Video Assessment');
    expect(labels).toContain('Challenges');
    expect(labels).toContain('Sprint Planner');
  });

  it('surfaces the audit-flagged admin trainer-ops tools with registered routes', () => {
    const registered = routePathsFor('admin');
    const requiredIds = ['trainer-payouts', 'trainers', 'assignments', 'session-allocation', 'trainer-permissions'];
    for (const id of requiredIds) {
      const entry = WORKSPACE_CONFIG.find((item) => item.id === id);
      expect(entry, `WORKSPACE_CONFIG id "${id}"`).toBeTruthy();
      const routePath = navPathToRoutePath(entry!.prefix, 'admin');
      expect(registered, `admin nav "${id}" → ${routePath}`).toContain(routePath);
    }
  });
});
