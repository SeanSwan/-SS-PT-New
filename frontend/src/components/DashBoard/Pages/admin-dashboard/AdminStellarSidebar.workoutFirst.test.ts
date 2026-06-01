import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ADMIN_DASHBOARD_TABS, WORKSPACE_CONFIG } from '../../../../config/dashboard-tabs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const source = readFileSync(resolve(__dirname, './AdminStellarSidebar.tsx'), 'utf8');

describe('AdminStellarSidebar workout-first navigation', () => {
  it('surfaces daily workout logging inside Clients & Ops', () => {
    const clientsOps = WORKSPACE_CONFIG.filter((item) => item.section === 'clients');
    expect(clientsOps.map((item) => item.label).slice(0, 2)).toEqual([
      'Clients & Team',
      'Log Workout',
    ]);

    expect(clientsOps[1].prefix).toBe('/dashboard/admin/client-management?intent=log_workout');
  });

  it('understands query-backed workspace routes so log-workout intent can be active by itself', () => {
    expect(source).toContain("const [basePath, query = ''] = prefix.split('?');");
    expect(source).toContain("currentParams.get(key) === value");
    expect(source).toContain("currentParams.get('intent') === 'log_workout'");
  });

  it('keeps deprecated workout-plan config pointed at the client-first planner flow', () => {
    const workoutPlans = ADMIN_DASHBOARD_TABS.find((tab) => tab.key === 'workout-plans');

    expect(workoutPlans?.route).toBe('/dashboard/admin/client-management?intent=plan_next');
    expect(ADMIN_DASHBOARD_TABS.map((tab) => tab.route)).not.toContain('/dashboard/admin/workouts');
  });
});
