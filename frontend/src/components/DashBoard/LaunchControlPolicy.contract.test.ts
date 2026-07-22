/**
 * Launch Control copy contract.
 *
 * The three approved features have different server-enforcement paths. The UI
 * must not promise that every override is an end-to-end instant kill switch.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), 'src', path), 'utf8');
const page = read('components/DashBoard/Pages/admin-launch-control/LaunchControlPage.tsx');
const routes = read('components/DashBoard/UniversalDashboardLayout.routes.tsx');
const tabs = read('config/dashboard-tabs.ts');
const combined = [page, routes, tabs].join('\n');

describe('Launch Control truth-in-operations copy', () => {
  it('does not promise universal instant, no-redeploy enforcement', () => {
    expect(combined).not.toContain('instant, no redeploy');
    expect(combined).not.toContain('Feature switches update immediately');
  });

  it('tells the operator to verify feature-specific server enforcement', () => {
    expect(page).toContain('Verify feature-specific server enforcement');
    expect(page).toContain('audited overrides');
  });
});
