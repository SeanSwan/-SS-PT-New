import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const complianceRoutesSource = readFileSync(resolve(__dirname, '../../routes/adminComplianceRoutes.mjs'), 'utf8');
const complianceHelperSource = readFileSync(resolve(__dirname, '../../utils/adminComplianceHelpers.mjs'), 'utf8');
const dashboardSource = readFileSync(
  resolve(__dirname, '../../../frontend/src/components/DashBoard/Pages/admin-dashboard/components/ClientComplianceDashboard.tsx'),
  'utf8',
);
const overviewSource = readFileSync(
  resolve(__dirname, '../../../frontend/src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx'),
  'utf8',
);
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('admin compliance workout truth contract', () => {
  it('keeps the active admin overview widget wired to the mounted compliance route', () => {
    expect(overviewSource).toContain("import ClientComplianceDashboard from '../components/ClientComplianceDashboard'");
    // SWA-138 S1/S5: every overview widget is wrapped in a crash boundary.
    expect(overviewSource).toContain('<BentoHalf><WidgetErrorBoundary name="Client compliance"><ClientComplianceDashboard /></WidgetErrorBoundary></BentoHalf>');
    expect(dashboardSource).toContain("authAxios.get('/api/admin/compliance/at-risk')");
    expect(coreRoutesSource).toContain("app.use('/api/admin', adminComplianceRoutes)");
    expect(complianceRoutesSource).toContain("router.get('/compliance/at-risk'");
  });

  it('calculates at-risk compliance from completed workout_sessions, not daily workout forms', () => {
    const queryStart = complianceHelperSource.indexOf('export function buildAtRiskComplianceQuery');
    const queryEnd = complianceHelperSource.indexOf('export function buildAtRiskComplianceClient');
    const slice = complianceHelperSource.slice(queryStart, queryEnd);

    expect(slice).toMatch(/LEFT\s+JOIN\s+workout_sessions\s+ws/i);
    expect(slice).toMatch(/ws\."userId"\s*=\s*u\.id/);
    expect(slice).toMatch(/ws\.status\s*=\s*'completed'/i);
    expect(slice).toMatch(/MAX\(ws\.date\)\s+AS\s+"lastWorkoutDate"/i);
    expect(slice).not.toMatch(/daily_workout_forms/i);
  });
});
