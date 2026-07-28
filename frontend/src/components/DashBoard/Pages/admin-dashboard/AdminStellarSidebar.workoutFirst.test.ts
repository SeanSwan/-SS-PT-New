import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ADMIN_DASHBOARD_TABS, WORKSPACE_CONFIG } from '../../../../config/dashboard-tabs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const source = readFileSync(resolve(__dirname, './AdminStellarSidebar.tsx'), 'utf8');

describe('AdminStellarSidebar workout-first navigation', () => {
  it('keeps daily workout logging inside the single Clients & Team workspace', () => {
    const clientsOps = WORKSPACE_CONFIG.filter((item) => item.section === 'clients');
    const clientHub = clientsOps.find((item) => item.id === 'people');

    expect(clientsOps.map((item) => item.label)).not.toContain('Log Workout');
    expect(WORKSPACE_CONFIG.some((item) => item.id === 'log-workout')).toBe(false);
    expect(clientHub?.prefix).toBe('/dashboard/admin/client-management');
    expect(clientHub?.description).toContain('workout logging');
  });

  it('keeps Clients & Team active for log-workout intent routes', () => {
    expect(source).toContain("const [basePath, query = ''] = prefix.split('?');");
    expect(source).toContain("currentParams.get(key) === value");
    expect(source).not.toContain("currentParams.get('intent') === 'log_workout'");
  });

  it('keeps deprecated workout-plan config pointed at the client-first planner flow', () => {
    const workoutPlans = ADMIN_DASHBOARD_TABS.find((tab) => tab.key === 'workout-plans');

    expect(workoutPlans?.route).toBe('/dashboard/admin/client-management?intent=plan_next');
    expect(ADMIN_DASHBOARD_TABS.map((tab) => tab.route)).not.toContain('/dashboard/admin/workouts');
  });

  it('keeps manual payment recovery reachable from the active business nav', () => {
    const businessItems = WORKSPACE_CONFIG.filter((item) => item.section === 'business');
    const pendingOrders = businessItems.find((item) => item.id === 'pending-orders');
    const deprecatedPendingOrders = ADMIN_DASHBOARD_TABS.find((tab) => tab.key === 'pending-orders');

    expect(businessItems.map((item) => item.label).slice(0, 3)).toEqual([
      'Store & Revenue',
      'Pending Orders',
      'Analytics',
    ]);
    expect(pendingOrders?.prefix).toBe('/dashboard/admin/pending-orders');
    expect(deprecatedPendingOrders?.route).toBe('/dashboard/admin/pending-orders');
    expect(deprecatedPendingOrders?.status).toBe('real');
  });
  it('keeps Lens Foundry in the active System navigation section', () => {
    const systemItems = WORKSPACE_CONFIG.filter((item) => item.section === 'system');
    const lensFoundry = systemItems.find((item) => item.id === 'lens-foundry');

    expect(lensFoundry?.label).toBe('Lens Foundry');
    expect(lensFoundry?.prefix).toBe('/dashboard/admin/lens-foundry');
    expect(lensFoundry?.description).toContain('design brain');
    expect(lensFoundry?.icon).toBe('Palette');
    expect(source).toContain('Palette');
  });
});
