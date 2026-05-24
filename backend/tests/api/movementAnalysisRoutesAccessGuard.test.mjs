import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/movementAnalysisRoutes.mjs'), 'utf8');
const controllerSource = readFileSync(resolve(__dirname, '../../controllers/movementAnalysisController.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('movement analysis route access guard', () => {
  it('keeps client history reachable and assignment-scoped', () => {
    expect(coreRoutesSource).toContain("app.use('/api/movement-analysis', movementAnalysisRoutes)");
    expect(routeSource).toContain("import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';");
    expect(routeSource).toContain("router.get('/client/:userId', protect, authorize(['admin', 'trainer']), verifyClientAccessByUserId({ paramName: 'userId' }), getClientMovementHistory)");
    expect(routeSource.indexOf("router.get('/client/:userId'")).toBeLessThan(routeSource.indexOf("router.get('/:id'"));
  });

  it('scopes trainer movement-analysis list/detail/create/update access', () => {
    expect(controllerSource).toContain("import { assertAssignmentOrAdmin } from '../middleware/verifyClientAccess.mjs';");
    expect(controllerSource).toContain('async function canTargetMovementAnalysisUser(req, targetUserId)');
    expect(controllerSource).toContain('async function canAccessMovementAnalysisRecord(req, analysis)');
    expect(controllerSource).toContain('async function buildMovementAnalysisAccessCondition(req)');
    expect(controllerSource).toContain("where: { trainerId: Number(trainerId), status: 'active' }");
    expect(controllerSource).toContain("logger.warn('[MovementAnalysis] assignment list failed - limiting trainer to conducted assessments'");
    expect(controllerSource).toContain('const accessCondition = await buildMovementAnalysisAccessCondition(req);');
    expect(controllerSource).toContain('canTargetMovementAnalysisUser(req, normalizedUserId.value)');
    expect(controllerSource).toContain('canAccessMovementAnalysisRecord(req, analysis)');
    expect(controllerSource).toContain("return res.status(404).json({ success: false, message: 'Assessment not found' });");
  });
});
