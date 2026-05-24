import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');
const controllerSource = readSource('controllers/adminDashboardMetricsController.mjs');

describe('admin dashboard metrics controller security', () => {
  it('locks the live admin dashboard route ownership for metrics, stats, and health', () => {
    const coreRoutesSource = readSource('core/routes.mjs');
    const routeSource = readSource('routes/dashboard/adminDashboardRoutes.mjs');

    expect(coreRoutesSource).toContain("app.use('/api/admin/dashboard', adminDashboardRoutes)");
    expect(routeSource).toContain("router.get('/metrics', protect, trainerOrAdminOnly, getDashboardMetrics)");
    expect(routeSource).toContain("router.get('/stats', protect, adminOnly, getAdminDashboardStats)");
    expect(routeSource).toContain("router.get('/health', protect, adminOnly, getAdminDashboardHealth)");
  });

  it('does not echo raw exception details from admin dashboard responses', () => {
    expect(controllerSource).toContain('const INTERNAL_ERROR =');
    expect(controllerSource).toContain('const sendInternalError =');
    expect(controllerSource).not.toContain("error: process.env.NODE_ENV === 'development' ? error.message : undefined");
  });

  it('strictly normalizes route inputs and SQL count values', () => {
    expect(controllerSource).toContain('const userId = parsePositiveInteger(req.user?.id);');
    expect(controllerSource).toContain('const timeframe = normalizeTimeframe(req.query.timeframe);');
    expect(controllerSource).toContain('templateCount = parseNonNegativeIntegerCount(templateResult[0]?.count);');
    expect(controllerSource).toContain('total_videos: parseNonNegativeIntegerCount(videoResult[0]?.count)');
    expect(controllerSource).toContain('total_exercises: parseNonNegativeIntegerCount(exerciseResult[0]?.count)');
    expect(controllerSource).not.toContain('parseInt(');
  });
});
