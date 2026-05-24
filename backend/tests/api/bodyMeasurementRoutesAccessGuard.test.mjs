import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/bodyMeasurementRoutes.mjs'), 'utf8');
const controllerSource = readFileSync(resolve(__dirname, '../../controllers/bodyMeasurementController.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('body measurement route access guard', () => {
  it('keeps user-id measurement reads behind assignment-or-self access', () => {
    expect(coreRoutesSource).toContain("app.use('/api/measurements', bodyMeasurementRoutes)");
    expect(routeSource).toContain("import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';");

    for (const signature of [
      "router.get('/schedule/status/:userId', authorize(['admin', 'trainer']), verifyClientAccessByUserId({ paramName: 'userId' })",
      "router.get('/user/:userId', verifyClientAccessByUserId({ paramName: 'userId' })",
      "router.get('/user/:userId/latest', verifyClientAccessByUserId({ paramName: 'userId' })",
      "router.get('/user/:userId/stats', verifyClientAccessByUserId({ paramName: 'userId' })",
    ]) {
      expect(routeSource).toContain(signature);
    }
  });

  it('checks assignment access before record-id measurement reads and writes', () => {
    expect(controllerSource).toContain("import { assertAssignmentOrAdmin } from '../middleware/verifyClientAccess.mjs';");
    expect(controllerSource).toContain('assertAssignmentOrAdmin(req.user.id, req.user.role, targetUserId)');
    expect(controllerSource.match(/assertAssignmentOrAdmin\(req\.user\.id, req\.user\.role, measurement\.userId\)/g)?.length)
      .toBeGreaterThanOrEqual(4);
    expect(controllerSource).toContain("return res.status(404).json({ success: false, message: 'Measurement not found' });");
  });
});
