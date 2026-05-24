import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/adminOnboardingRoutes.mjs'), 'utf8');
const controllerSource = readFileSync(resolve(__dirname, '../../controllers/clientOnboardingController.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('admin onboarding baseline access guard', () => {
  it('keeps baseline create/history assignment-scoped for trainers', () => {
    expect(coreRoutesSource).toContain("app.use('/api/admin', adminOnboardingRoutes)");
    expect(routeSource).toContain("import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';");
    expect(routeSource).toContain("router.post('/baseline-measurements', verifyClientAccessByUserId({ bodyField: 'userId' }), createBaselineMeasurements)");
    expect(routeSource).toContain("router.get('/baseline-measurements/:userId', verifyClientAccessByUserId({ paramName: 'userId' }), getBaselineMeasurementsHistory)");
  });

  it('keeps direct controller calls on the same assignment policy', () => {
    expect(controllerSource).toContain('Number.isInteger(parsed) && parsed > 0 ? parsed : null');
    expect(controllerSource).toContain('const accessResult = await ensureTrainerAccess(req.user, targetUserId, ClientTrainerAssignment);');
    expect(controllerSource).toContain('const accessResult = await ensureClientAccess(req.user, targetUserId, ClientTrainerAssignment);');
    expect(controllerSource).not.toContain("req.user.role === 'admin' || req.user.role === 'trainer'");
  });
});
