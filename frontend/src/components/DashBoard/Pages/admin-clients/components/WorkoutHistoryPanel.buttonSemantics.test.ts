import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel.tsx'),
  'utf8',
);
const trainingSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/workspaces/clients-team/tabs/TrainingTabContent.tsx'),
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
    expect(layoutSource).toContain("path: '/client-management'");
    expect(layoutSource).toContain("import('./workspaces/ClientsWorkspace')");
    expect(workspaceTabsSource).toContain("lazy(() => import('./clients-team/tabs/TrainingTabContent'))");
    expect(trainingSource).toContain("import('../../../../DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel')");
    expect(trainingSource).toContain('variant="embedded"');
    expect(analyticsHookSource).toContain('const analyticsUserId = String(numericUserId);');
    expect(analyticsHookSource).toContain('authAxios.get(`/api/admin/clients/${analyticsUserId}/workouts`');
    expect(backendRoutesSource).toContain("app.use('/api/admin', adminWorkoutLoggerRoutes)");
    expect(backendWorkoutRoutesSource).toContain("router.get('/clients/:clientId/workouts', getClientWorkouts)");
  });

  it('keeps canonical workout history click controls as explicit non-submit buttons', () => {
    expect(source).not.toMatch(/<RetryButton(?![^>]*\btype=)[^>]*\bonClick=/);
    expect(source).not.toMatch(/<ShareIconBtn(?![^>]*\btype=)[^>]*\bonClick=/);
    expect(source).toMatch(/<RetryButton\s+type="button"[\s\S]{0,80}onClick=\{refetch\}/);
    expect(source).toMatch(/<ShareIconBtn\s+type="button"[\s\S]{0,120}onClick=\{\(\) => setShareSession\(session\)\}/);
  });
});
