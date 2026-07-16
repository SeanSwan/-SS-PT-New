import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel.tsx'),
  'utf8',
);
const sessionCardSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistorySessionCard.tsx'),
  'utf8',
);
const panelContentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanelContent.tsx'),
  'utf8',
);
const trainingSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/workspaces/clients-team/tabs/TrainingTabContent.tsx'),
  'utf8',
);
const trainingSectionContentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/workspaces/clients-team/tabs/TrainingTabSectionContent.tsx'),
  'utf8',
);
const workspaceTabsSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/workspaces/ClientsWorkspaceTabs.tsx'),
  'utf8',
);
const layoutSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/UniversalDashboardLayout.tsx'),
  'utf8',
);
const routeComponentsSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/UniversalDashboardLayout.routeComponents.tsx'),
  'utf8',
);
const dashboardRoutesSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/UniversalDashboardLayout.routes.tsx'),
  'utf8',
);
const analyticsHookSource = readFileSync(
  resolve(process.cwd(), 'src/hooks/analytics/useWorkoutAnalytics.ts'),
  'utf8',
);
const backendRoutesSource = readFileSync(
  resolve(process.cwd(), '../backend/core/routes.mjs'),
  'utf8',
);
const backendWorkoutRoutesSource = readFileSync(
  resolve(process.cwd(), '../backend/routes/adminWorkoutLoggerRoutes.mjs'),
  'utf8',
);

describe('WorkoutHistoryPanel button semantics', () => {
  it('is mounted by the canonical Clients & Team training history surface', () => {
    expect(layoutSource).toContain("from './UniversalDashboardLayout.routes'");
    expect(routeComponentsSource).toContain("export const ClientsWorkspace = React.lazy(() => import('./workspaces/ClientsWorkspace'))");
    expect(dashboardRoutesSource).toContain("path: '/client-management'");
    expect(workspaceTabsSource).toContain("lazy(() => import('./clients-team/tabs/TrainingTabContent'))");
    expect(trainingSource).toContain("import TrainingTabSectionContent");
    expect(trainingSectionContentSource).toContain("import('../../../../DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel')");
    expect(trainingSectionContentSource).toContain('variant="embedded"');
    expect(analyticsHookSource).toContain('const analyticsUserId = String(numericUserId);');
    expect(analyticsHookSource).toContain('authAxios.get(`/api/admin/clients/${analyticsUserId}/workouts`');
    expect(backendRoutesSource).toContain("app.use('/api/admin', adminWorkoutLoggerRoutes)");
    expect(backendWorkoutRoutesSource).toContain("router.get('/clients/:clientId/workouts', getClientWorkouts)");
  });

  it('keeps canonical workout history click controls as explicit non-submit buttons', () => {
    expect(panelContentSource).not.toMatch(/<RetryButton(?![^>]*\btype=)[^>]*\bonClick=/);
    expect(sessionCardSource).not.toMatch(/<ShareIconBtn(?![^>]*\btype=)[^>]*\bonClick=/);
    expect(panelContentSource).toMatch(/<RetryButton\s+type="button"[\s\S]{0,80}onClick=\{onRetry\}/);
    expect(sessionCardSource).toMatch(/<ShareIconBtn\s+type="button"[\s\S]{0,160}onClick=\{\(\) => onShareSession\(session\)\}/);
  });
});
