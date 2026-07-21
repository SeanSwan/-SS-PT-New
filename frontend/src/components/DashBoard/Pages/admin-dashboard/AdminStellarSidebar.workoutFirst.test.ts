import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import dashboardTabs, { WORKSPACE_CONFIG } from '../../../../config/dashboard-tabs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sidebarSource = readFileSync(resolve(__dirname, './AdminStellarSidebar.tsx'), 'utf8');
const configSource = readFileSync(resolve(__dirname, '../../../../config/dashboard-tabs.ts'), 'utf8');

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
    expect(sidebarSource).toContain("const [basePath, query = ''] = prefix.split('?');");
    expect(sidebarSource).toContain('currentParams.get(key) === value');
    expect(sidebarSource).not.toContain("currentParams.get('intent') === 'log_workout'");
  });

  it('keeps manual payment recovery reachable from the active business nav', () => {
    const businessItems = WORKSPACE_CONFIG.filter((item) => item.section === 'business');
    const pendingOrders = businessItems.find((item) => item.id === 'pending-orders');

    expect(businessItems.map((item) => item.label).slice(0, 3)).toEqual([
      'Store & Revenue',
      'Pending Orders',
      'Analytics',
    ]);
    expect(pendingOrders?.prefix).toBe('/dashboard/admin/pending-orders');
  });

  it('has one admin navigation source of truth', () => {
    const retiredName = ['ADMIN', 'DASHBOARD', 'TABS'].join('_');
    expect(configSource).not.toContain(retiredName);
    expect(Object.keys(dashboardTabs)).not.toContain(retiredName);
  });
});
