import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/clientProgressRoutes.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

function routeSlice(signature, nextSignature) {
  return routeSource.slice(
    routeSource.indexOf(signature),
    routeSource.indexOf(nextSignature)
  );
}

describe('client progress route security', () => {
  it('keeps the current-user progress route authenticated and role-scoped', () => {
    expect(coreRoutesSource).toContain("app.use('/api/client-progress', clientProgressRoutes)");
    expect(routeSource).toContain("router.get('/',");
    expect(routeSource).toContain('protect,');
    expect(routeSource).toContain("authorize(['client', 'admin']),");
    expect(routeSource).not.toContain('default-user');
    expect(routeSource).not.toContain('// protect');
  });

  it('keeps targeted client progress reads and writes behind assignment access', () => {
    expect(routeSource).toContain("import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';");

    const workoutHistoryRoute = routeSlice("router.get('/:clientId/workout-history'", "router.get('/:userId'");
    const getProgressRoute = routeSlice("router.get('/:userId'", "router.put('/:userId'");
    const updateProgressRoute = routeSlice("router.put('/:userId'", 'export default router');

    expect(workoutHistoryRoute).toContain("authorize(['client', 'trainer', 'admin']),");
    expect(workoutHistoryRoute).toContain("verifyClientAccessByUserId({ paramName: 'clientId' }),");
    expect(workoutHistoryRoute).not.toContain('trainer/admin reading any client');

    for (const source of [getProgressRoute, updateProgressRoute]) {
      expect(source).toContain("authorize(['trainer', 'admin']),");
      expect(source).toContain("verifyClientAccessByUserId({ paramName: 'userId' }),");
    }
  });

  it('does not expose raw route errors and rejects partial workout-history client ids', () => {
    const workoutHistoryRoute = routeSlice("router.get('/:clientId/workout-history'", "router.get('/:userId'");

    expect(routeSource).toContain("const INTERNAL_ERROR = 'internal_error'");
    expect(routeSource).toContain('function sendInternalError(res, message)');
    expect(routeSource).not.toContain('error: error.message');
    expect(routeSource).not.toContain('message: error.message');
    expect(routeSource).not.toContain('details: error.message');
    expect(workoutHistoryRoute).toContain('const numericClientId = parsePositiveInteger(clientId)');
    expect(workoutHistoryRoute).not.toContain('Number(clientId)');
  });

  it('serves comparison analytics from real ClientProgress data before the generic user route', () => {
    const comparisonRouteIndex = routeSource.indexOf("router.get('/:clientId/comparison'");
    const genericRouteIndex = routeSource.indexOf("router.get('/:userId'");

    expect(comparisonRouteIndex).toBeGreaterThan(-1);
    expect(genericRouteIndex).toBeGreaterThan(-1);
    expect(comparisonRouteIndex).toBeLessThan(genericRouteIndex);

    const comparisonRoute = routeSlice("router.get('/:clientId/comparison'", "router.get('/:userId'");
    expect(comparisonRoute).toContain("authorize(['client', 'trainer', 'admin']),");
    expect(comparisonRoute).toContain("verifyClientAccessByUserId({ paramName: 'clientId' }),");
    expect(comparisonRoute).toContain('ClientProgress.findAll');
    expect(comparisonRoute).toContain('buildComparisonAnalytics');
    expect(comparisonRoute).not.toMatch(/client:\s*75|Compared to 12 clients|Bench 100kg|Run 5K under 25min/);
  });

  it('serves goal tracking from real Goal rows before the generic user route', () => {
    const goalsRouteIndex = routeSource.indexOf("router.get('/:clientId/goals'");
    const genericRouteIndex = routeSource.indexOf("router.get('/:userId'");

    expect(goalsRouteIndex).toBeGreaterThan(-1);
    expect(genericRouteIndex).toBeGreaterThan(-1);
    expect(goalsRouteIndex).toBeLessThan(genericRouteIndex);

    const goalsRoute = routeSlice("router.get('/:clientId/goals'", "router.get('/:userId'");
    expect(goalsRoute).toContain("authorize(['client', 'trainer', 'admin']),");
    expect(goalsRoute).toContain("verifyClientAccessByUserId({ paramName: 'clientId' }),");
    expect(goalsRoute).toContain('Goal.findAll');
    expect(goalsRoute).toContain('buildGoalTrackingData');
    expect(goalsRoute).not.toMatch(/Lose 15 lbs|Bench Press 100kg|Run 5K under 25 minutes|First Milestone Master/);
  });

  it('serves injury risk assessment from real progress and pain rows before the generic user route', () => {
    const riskRouteIndex = routeSource.indexOf("router.get('/:clientId/risk-assessment'");
    const genericRouteIndex = routeSource.indexOf("router.get('/:userId'");

    expect(riskRouteIndex).toBeGreaterThan(-1);
    expect(genericRouteIndex).toBeGreaterThan(-1);
    expect(riskRouteIndex).toBeLessThan(genericRouteIndex);

    const riskRoute = routeSlice("router.get('/:clientId/risk-assessment'", "router.get('/:userId'");
    expect(riskRoute).toContain("authorize(['client', 'trainer', 'admin']),");
    expect(riskRoute).toContain("verifyClientAccessByUserId({ paramName: 'clientId' }),");
    expect(riskRoute).toContain('ClientPainEntry.findAll');
    expect(riskRoute).toContain('buildInjuryRiskAssessment');
    expect(riskRoute).not.toMatch(/Proper knee tracking|Slight shoulder impingement pattern|Averaging 5\.5 hours|Recovery Deficit|Volume Spike/);
  });

  it('keeps client goal create and progress update writes guarded before the generic user route', () => {
    const createRouteIndex = routeSource.indexOf("router.post('/:clientId/goals'");
    const updateRouteIndex = routeSource.indexOf("router.put('/:clientId/goals/:goalId'");
    const genericRouteIndex = routeSource.indexOf("router.get('/:userId'");

    expect(createRouteIndex).toBeGreaterThan(-1);
    expect(updateRouteIndex).toBeGreaterThan(-1);
    expect(genericRouteIndex).toBeGreaterThan(-1);
    expect(createRouteIndex).toBeLessThan(genericRouteIndex);
    expect(updateRouteIndex).toBeLessThan(genericRouteIndex);

    const createRoute = routeSlice("router.post('/:clientId/goals'", "router.put('/:clientId/goals/:goalId'");
    expect(createRoute).toContain("authorize(['client', 'trainer', 'admin']),");
    expect(createRoute).toContain("verifyClientAccessByUserId({ paramName: 'clientId' }),");
    expect(createRoute).toContain('Goal.create');
    expect(createRoute).toContain('normalizeGoalCreatePayload');

    const updateRoute = routeSlice("router.put('/:clientId/goals/:goalId'", "router.get('/:userId'");
    expect(updateRoute).toContain("authorize(['client', 'trainer', 'admin']),");
    expect(updateRoute).toContain("verifyClientAccessByUserId({ paramName: 'clientId' }),");
    expect(updateRoute).toContain('Goal.findOne');
    expect(updateRoute).toContain('normalizeGoalUpdatePayload');
  });
});
