import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');

function readRepoFile(pathFromRoot) {
  return readFileSync(resolve(repoRoot, pathFromRoot), 'utf8');
}

const controllerSource = readRepoFile('backend/controllers/chartDataController.mjs');
const coreRoutesSource = readRepoFile('backend/core/routes.mjs');
const clientRoutesSource = readRepoFile('backend/routes/clientAnalyticsRoutes.mjs');
const analyticsRoutesSource = readRepoFile('backend/routes/analyticsRoutes.mjs');
const clientChartsHookSource = readRepoFile('frontend/src/hooks/analytics/useClientProgressCharts.ts');
const adminChartsHookSource = readRepoFile('frontend/src/hooks/analytics/useAdminClientProgressCharts.ts');

describe('chart data controller security contract', () => {
  it('maps both active chart surfaces before hardening the shared controller', () => {
    expect(coreRoutesSource).toContain("app.use('/api/client/analytics', clientAnalyticsRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/analytics', analyticsRoutes)");
    expect(clientChartsHookSource).toContain('/api/client/analytics/${suffix}');
    expect(adminChartsHookSource).toContain('/api/analytics/${userId}/${suffix}');
  });

  it('keeps client chart routes JWT-derived and admin/trainer chart routes ownership gated', () => {
    expect(clientRoutesSource).toContain('router.use(protect)');
    expect(clientRoutesSource).toContain('req.params.userId = String(req.user.id)');
    // Baseline repair 2026-07-02 (Slice 8.1): the client chart route gained the
    // requireGuardianAnalytics tier gate after this lock was written — assert the
    // STRONGER current contract (gate present) instead of the stale ungated string.
    // D2 (Sean lock 2026-07-06): the teaser pair is Starter-visible; every
    // other chart + the pulse stays Guardian-gated.
    expect(clientRoutesSource).toContain("router.get('/chart-workout-frequency', requireTeaserAnalytics, getWorkoutFrequencyChart)");
    expect(clientRoutesSource).toContain("router.get('/chart-weekly-volume', requireTeaserAnalytics, getWeeklyVolumeChart)");
    expect(clientRoutesSource).toContain("router.get('/chart-sets-reps-trend', requireGuardianAnalytics, getSetsRepsTrendChart)");
    expect(clientRoutesSource).toContain("const requireTeaserAnalytics = requireFeature('analytics.teaser')");
    expect(clientRoutesSource).toContain("router.get('/progress-pulse', requireGuardianAnalytics, getProgressPulseHandler)");
    expect(analyticsRoutesSource).toContain('router.use(protect)');
    expect(analyticsRoutesSource).toContain("router.get('/:userId/chart-workout-frequency'");
    expect(analyticsRoutesSource).toContain('requireOwnershipOrTrainer, getWorkoutFrequencyChart');
  });

  it('does not expose raw chart controller exceptions to clients', () => {
    expect(controllerSource).toContain("const INTERNAL_ERROR = 'internal_error'");
    expect(controllerSource).toContain('const sendChartError = (res) => res.status(500).json({');
    expect(controllerSource).not.toContain('message: error.message');
    expect(controllerSource).not.toContain('error: error.message');
    expect(controllerSource).not.toContain('details: error.message');
    expect(controllerSource.match(/return sendChartError\(res\);/g)?.length).toBeGreaterThanOrEqual(15);
  });
});
