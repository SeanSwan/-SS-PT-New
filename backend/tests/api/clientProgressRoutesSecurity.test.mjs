import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  handleClientProgressError,
  requirePositiveClientId,
} from '../../services/clientProgress/routeResponses.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/clientProgressRoutes.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');
const controllerSource = readFileSync(resolve(__dirname, '../../controllers/clientProgressController.mjs'), 'utf8');
const responseSource = readFileSync(resolve(__dirname, '../../services/clientProgress/routeResponses.mjs'), 'utf8');

function routeSlice(signature, nextSignature) {
  return routeSource.slice(
    routeSource.indexOf(signature),
    routeSource.indexOf(nextSignature)
  );
}

describe('client progress route security', () => {
  it('keeps the current-user progress route authenticated and role-scoped', () => {
    expect(coreRoutesSource).toContain("app.use('/api/client-progress', clientProgressRoutes)");
    expect(routeSource).toContain("router.get('/', ...currentClientAccess, getCurrentClientProgress)");
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

    expect(routeSource).toContain("authorize(['client', 'trainer', 'admin']),");
    expect(routeSource).toContain("verifyClientAccessByUserId({ paramName: 'clientId' }),");
    expect(workoutHistoryRoute).toContain('getClientWorkoutHistory');
    expect(workoutHistoryRoute).not.toContain('trainer/admin reading any client');

    for (const source of [getProgressRoute, updateProgressRoute]) {
      expect(source).toContain('targetClientAccess');
    }
    expect(routeSource).toContain("authorize(['trainer', 'admin']),");
    expect(routeSource).toContain("verifyClientAccessByUserId({ paramName: 'userId' }),");
  });

  it('does not expose raw route errors and rejects partial workout-history client ids', () => {
    const workoutHistoryRoute = routeSlice("router.get('/:clientId/workout-history'", "router.get('/:userId'");

    expect(responseSource).toContain("const INTERNAL_ERROR = 'internal_error'");
    expect(responseSource).toContain('function sendInternalError(res, message)');
    expect(`${routeSource}\n${controllerSource}\n${responseSource}`).not.toContain('error: error.message');
    expect(`${routeSource}\n${controllerSource}\n${responseSource}`).not.toContain('message: error.message');
    expect(`${routeSource}\n${controllerSource}\n${responseSource}`).not.toContain('details: error.message');
    expect(controllerSource).toContain('requirePositiveClientId(req.params.clientId)');
    expect(workoutHistoryRoute).not.toContain('Number(clientId)');
    expect(() => requirePositiveClientId('123abc')).toThrow(/Invalid clientId/);
  });

  it('only exposes known client-progress request validation errors', () => {
    const makeRes = () => {
      const res = { body: null, statusCode: null };
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (body) => {
        res.body = body;
        return res;
      };
      return res;
    };
    const badRequest = makeRes();
    const internalError = makeRes();

    try {
      requirePositiveClientId('123abc');
    } catch (error) {
      handleClientProgressError(
        badRequest,
        error,
        'bad request path',
        'Public safe message',
        { validationErrorsAreBadRequest: true },
      );
    }

    handleClientProgressError(
      internalError,
      new Error('database password leaked in service detail'),
      'internal path',
      'Public safe message',
      { validationErrorsAreBadRequest: true },
    );

    expect(badRequest.statusCode).toBe(400);
    expect(badRequest.body).toEqual({ success: false, message: 'Invalid clientId' });
    expect(internalError.statusCode).toBe(500);
    expect(internalError.body).toEqual({
      success: false,
      message: 'Public safe message',
      error: 'internal_error',
    });
  });

  it('serves comparison analytics from real ClientProgress data before the generic user route', () => {
    const comparisonRouteIndex = routeSource.indexOf("router.get('/:clientId/comparison'");
    const genericRouteIndex = routeSource.indexOf("router.get('/:userId'");

    expect(comparisonRouteIndex).toBeGreaterThan(-1);
    expect(genericRouteIndex).toBeGreaterThan(-1);
    expect(comparisonRouteIndex).toBeLessThan(genericRouteIndex);

    const comparisonRoute = routeSlice("router.get('/:clientId/comparison'", "router.get('/:userId'");
    expect(comparisonRoute).toContain('clientReadAccess');
    expect(comparisonRoute).toContain('getClientComparisonAnalytics');
    expect(controllerSource).toContain('ClientProgress.findAll');
    expect(controllerSource).toContain('buildComparisonAnalytics');
    expect(controllerSource).not.toMatch(/client:\s*75|Compared to 12 clients|Bench 100kg|Run 5K under 25min/);
  });

  it('serves goal tracking from real Goal rows before the generic user route', () => {
    const goalsRouteIndex = routeSource.indexOf("router.get('/:clientId/goals'");
    const genericRouteIndex = routeSource.indexOf("router.get('/:userId'");

    expect(goalsRouteIndex).toBeGreaterThan(-1);
    expect(genericRouteIndex).toBeGreaterThan(-1);
    expect(goalsRouteIndex).toBeLessThan(genericRouteIndex);

    const goalsRoute = routeSlice("router.get('/:clientId/goals'", "router.get('/:userId'");
    expect(goalsRoute).toContain('clientReadAccess');
    expect(goalsRoute).toContain('getClientGoals');
    expect(controllerSource).toContain('Goal.findAll');
    expect(controllerSource).toContain('buildGoalTrackingData');
    expect(controllerSource).not.toMatch(/Lose 15 lbs|Bench Press 100kg|Run 5K under 25 minutes|First Milestone Master/);
  });

  it('serves injury risk assessment from real progress and pain rows before the generic user route', () => {
    const riskRouteIndex = routeSource.indexOf("router.get('/:clientId/risk-assessment'");
    const genericRouteIndex = routeSource.indexOf("router.get('/:userId'");

    expect(riskRouteIndex).toBeGreaterThan(-1);
    expect(genericRouteIndex).toBeGreaterThan(-1);
    expect(riskRouteIndex).toBeLessThan(genericRouteIndex);

    const riskRoute = routeSlice("router.get('/:clientId/risk-assessment'", "router.get('/:userId'");
    expect(riskRoute).toContain('clientReadAccess');
    expect(riskRoute).toContain('getClientInjuryRiskAssessment');
    expect(controllerSource).toContain('ClientPainEntry.findAll');
    expect(controllerSource).toContain('buildInjuryRiskAssessment');
    expect(controllerSource).not.toMatch(/Proper knee tracking|Slight shoulder impingement pattern|Averaging 5\.5 hours|Recovery Deficit|Volume Spike/);
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
    expect(createRoute).toContain('clientReadAccess');
    expect(createRoute).toContain('createClientGoal');
    expect(controllerSource).toContain('Goal.create');
    expect(controllerSource).toContain('normalizeGoalCreatePayload');

    const updateRoute = routeSlice("router.put('/:clientId/goals/:goalId'", "router.get('/:userId'");
    expect(updateRoute).toContain('clientReadAccess');
    expect(updateRoute).toContain('updateClientGoal');
    expect(controllerSource).toContain('Goal.findOne');
    expect(controllerSource).toContain('normalizeGoalUpdatePayload');
  });
});
