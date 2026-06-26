import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { adminSessionRowItems, adminSessionRowKey } from './AdminSessionsRowIdentity';

const dataHookSource = readFileSync(resolve(__dirname, './useAdminSessionsData.ts'), 'utf8');
const tablePanelSource = readFileSync(resolve(__dirname, './AdminSessionsTablePanel.tsx'), 'utf8');
const serviceSource = readFileSync(resolve(__dirname, '../../../../services/sessionService.ts'), 'utf8');
const routeComponentsSource = readFileSync(resolve(__dirname, '../../UniversalDashboardLayout.routeComponents.tsx'), 'utf8');
const dashboardRoutesSource = readFileSync(resolve(__dirname, '../../UniversalDashboardLayout.routes.tsx'), 'utf8');
const backendRoutesSource = readFileSync(resolve(__dirname, '../../../../../../backend/core/routes.mjs'), 'utf8');
const backendSessionsSource = readFileSync(resolve(__dirname, '../../../../../../backend/routes/sessions.mjs'), 'utf8');
const backendSessionModelSource = readFileSync(resolve(__dirname, '../../../../../../backend/models/Session.mjs'), 'utf8');

describe('Admin sessions row identity', () => {
  it('stays anchored to the canonical admin sessions route and sessions API surface', () => {
    expect(routeComponentsSource).toContain("export const EnhancedAdminSessionsView = React.lazy(() => import('./Pages/admin-sessions/enhanced-admin-sessions-view'))");
    expect(dashboardRoutesSource).toContain("path: '/admin-sessions'");
    expect(dataHookSource).toContain('services.sessionService.getSessions()');
    expect(serviceSource).toContain('const url = `/api/sessions${queryString ? `?${queryString}` : \'\'}`;');
    expect(backendRoutesSource).toContain("app.use('/api/sessions/deductions', sessionDeductionRoutes)");
    expect(backendRoutesSource).toContain("app.use('/api/sessions', sessionsRoutes)");
    expect(backendSessionsSource).toContain('router.get("/", protect, async (req, res) => {');
    expect(backendSessionModelSource).toContain('Session.init({');
    expect(backendSessionModelSource).toContain('  sessionDate: {');
    expect(backendSessionModelSource).toContain('  trainerId: {');
  });

  it('uses stable row keys even when API sessions are missing ids', () => {
    expect(adminSessionRowKey({ id: '41', sessionDate: '2026-05-30T17:00:00Z' })).toBe('admin-session-41');
    expect(adminSessionRowKey({
      id: null,
      sessionDate: '2026-05-30T17:00:00Z',
      userId: '7',
      trainerId: '3',
      location: 'Main Studio',
      duration: 60,
      status: 'scheduled'
    })).toBe('admin-session-2026-05-30T17-00-00Z-7-3-Main-Studio-60-scheduled');

    const rows = adminSessionRowItems([
      {
        id: null,
        sessionDate: '2026-05-30T17:00:00Z',
        userId: '7',
        trainerId: '3',
        location: 'Main Studio',
        duration: 60,
        status: 'scheduled'
      },
      {
        id: null,
        sessionDate: '2026-05-30T17:00:00Z',
        userId: '7',
        trainerId: '3',
        location: 'Main Studio',
        duration: 60,
        status: 'scheduled'
      }
    ]);

    expect(rows.map(row => row.key)).toEqual([
      'admin-session-2026-05-30T17-00-00Z-7-3-Main-Studio-60-scheduled',
      'admin-session-2026-05-30T17-00-00Z-7-3-Main-Studio-60-scheduled-2'
    ]);
    expect(tablePanelSource).toContain('adminSessionRowItems(paginatedSessions)');
    expect(tablePanelSource).not.toContain('key={session.id || index}');
    expect(tablePanelSource).not.toContain('Use index as fallback key');
  });
});
