import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/clientProgressApiRoutes.mjs'), 'utf8');
const controllerSource = readFileSync(resolve(__dirname, '../../controllers/clientProgressController.mjs'), 'utf8');
const legacyServiceSource = readFileSync(resolve(__dirname, '../../services/clientProgress/legacyClientProgressApi.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('client progress API route access guard', () => {
  it('keeps /api/client/:userId progress endpoints behind assignment-or-self access', () => {
    expect(coreRoutesSource).toContain("app.use('/api/client', clientProgressApiRoutes)");
    expect(routeSource).toContain("import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';");
    expect(routeSource).toContain("router.get('/:userId/progress', protect, verifyClientAccessByUserId({ paramName: 'userId' }), getClientProgress)");
    expect(routeSource).toContain("router.get('/:userId/measurements', protect, verifyClientAccessByUserId({ paramName: 'userId' }), getMeasurementHistory)");
    expect(routeSource).toContain("router.post('/:userId/measurements', protect, trainerOrAdminOnly, verifyClientAccessByUserId({ paramName: 'userId' }), createMeasurement)");
  });

  it('rejects malformed and fractional user IDs before model access', () => {
    expect(controllerSource).toContain('export const getClientProgress = clientProgressHandler(');
    expect(legacyServiceSource).toContain('const parsePositiveInt = (value) => {');
    expect(legacyServiceSource).toContain('const POSITIVE_INT_RE = /^[1-9]\\d*$/;');
    expect(legacyServiceSource).toContain('if (!POSITIVE_INT_RE.test(normalized)) return null;');
    expect(legacyServiceSource).toContain('return Number.isSafeInteger(num) ? num : null;');
    expect(legacyServiceSource).not.toContain('if (!Number.isFinite(clientId))');
  });

  it('bounds measurement history limits without loose Number coercion', () => {
    expect(legacyServiceSource).toContain('const parseOptionalPositiveInt = (value, fallback) => {');
    expect(legacyServiceSource).toContain('const requestedLimit = parseOptionalPositiveInt(req.query.limit, 30);');
    expect(legacyServiceSource).toContain("res.status(400).json({ success: false, message: 'Invalid limit' });");
    expect(legacyServiceSource).toContain('return Math.min(requestedLimit, 365);');
    expect(legacyServiceSource).not.toContain('Math.max(Number(req.query.limit)');
  });
});
