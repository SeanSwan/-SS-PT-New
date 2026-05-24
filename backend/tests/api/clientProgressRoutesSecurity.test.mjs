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
});
