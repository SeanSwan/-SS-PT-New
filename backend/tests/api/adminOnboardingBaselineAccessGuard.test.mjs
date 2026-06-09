import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/adminOnboardingRoutes.mjs'), 'utf8');
const controllerSource = readFileSync(resolve(__dirname, '../../controllers/clientOnboardingController.mjs'), 'utf8');
const baselineServiceSource = readFileSync(resolve(__dirname, '../../services/clientBaselineMeasurementService.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');
const baselineModelSource = readFileSync(resolve(__dirname, '../../models/ClientBaselineMeasurements.mjs'), 'utf8');
const romAssessmentSource = readFileSync(
  resolve(__dirname, '../../../frontend/src/components/DashBoard/workspaces/clients-team/tabs/ROMAssessment.tsx'),
  'utf8',
);

describe('admin onboarding baseline access guard', () => {
  it('keeps baseline create/history assignment-scoped for trainers', () => {
    expect(coreRoutesSource).toContain("app.use('/api/admin', adminOnboardingRoutes)");
    expect(routeSource).toContain("import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';");
    expect(routeSource).toContain("router.post('/baseline-measurements', verifyClientAccessByUserId({ bodyField: 'userId' }), createBaselineMeasurements)");
    expect(routeSource).toContain("router.get('/baseline-measurements/:userId', verifyClientAccessByUserId({ paramName: 'userId' }), getBaselineMeasurementsHistory)");
  });

  it('keeps direct controller calls on the same assignment policy', () => {
    expect(controllerSource).toContain('Number.isInteger(parsed) && parsed > 0 ? parsed : null');
    expect(controllerSource).toContain('access: ensureTrainerAccess');
    expect(controllerSource).toContain('access: ensureClientAccess');
    expect(controllerSource).toContain('const accessResult = await access(req.user, targetUserId, ClientTrainerAssignment);');
    expect(controllerSource).not.toContain("req.user.role === 'admin' || req.user.role === 'trainer'");
  });

  it('persists canonical Client Hub ROM payloads into the rangeOfMotion JSONB field', () => {
    expect(romAssessmentSource).toContain("authAxios.post('/api/admin/baseline-measurements'");
    expect(romAssessmentSource).toContain('rangeOfMotion: { date: assessmentDate, measurements, notes }');
    expect(baselineModelSource).toContain('rangeOfMotion: {');
    expect(baselineModelSource).toContain('type: DataTypes.JSONB');
    expect(controllerSource).toContain("from '../services/clientBaselineMeasurementService.mjs'");
    expect(baselineServiceSource).toContain('rangeOfMotion: normalizeJsonObject(measurementData.rangeOfMotion)');
  });

  it('keeps dictated baseline weight aligned with the model column used by controller and Coach dispatcher', () => {
    const dispatcherSource = readFileSync(
      resolve(__dirname, '../../services/ai/dispatchers/onboardingBaselineDispatcher.mjs'),
      'utf8',
    );
    const migrationSource = readFileSync(
      resolve(__dirname, '../../migrations/20260531000001-add-body-weight-to-client-baseline-measurements.cjs'),
      'utf8',
    );

    expect(baselineServiceSource).toContain('bodyWeight: nullableValue(measurementData.bodyWeight)');
    expect(dispatcherSource).toContain('bodyWeight: numberFromFirst([params.bodyWeight, params.weight])');
    expect(baselineModelSource).toContain('bodyWeight: {');
    expect(baselineModelSource).toContain('type: DataTypes.DECIMAL(6, 2)');
    expect(migrationSource).toContain("addColumn('client_baseline_measurements', 'bodyWeight'");
  });
});
