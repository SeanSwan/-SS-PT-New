import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/clientDataRoutes.mjs'), 'utf8');
const normalizeSource = (source) => source.replace(/\r\n/g, '\n');
const controllerSource = normalizeSource(readFileSync(resolve(__dirname, '../../controllers/clientOnboardingController.mjs'), 'utf8'));
const servicePath = resolve(__dirname, '../../services/clientDataOverviewService.mjs');
const serviceSource = existsSync(servicePath)
  ? normalizeSource(readFileSync(servicePath, 'utf8'))
  : '';
const queryServicePath = resolve(__dirname, '../../services/clientDataOverviewQueryService.mjs');
const queryServiceSource = existsSync(queryServicePath)
  ? normalizeSource(readFileSync(queryServicePath, 'utf8'))
  : '';
const payloadServicePath = resolve(__dirname, '../../services/clientDataOverviewPayloadService.mjs');
const payloadServiceSource = existsSync(payloadServicePath)
  ? normalizeSource(readFileSync(payloadServicePath, 'utf8'))
  : '';
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('client data overview privacy', () => {
  it('keeps overview reads behind assignment-or-self access', () => {
    expect(coreRoutesSource).toContain("app.use('/api/client-data', clientDataRoutes)");
    expect(routeSource).toContain("import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';");
    expect(routeSource).toContain("router.get('/overview/:userId', protect, verifyClientAccessByUserId({ paramName: 'userId' }), getClientDataOverview)");
  });

  it('does not expose internal trainer-note metadata to client-role requests', () => {
    expect(queryServiceSource).toContain("const includeTrainerNoteSummary = requesterRole !== 'client';");
    expect(queryServiceSource).toContain('ClientNote.count({ where: { userId: targetUserId } })');
    expect(queryServiceSource).toContain(': Promise.resolve(0)');
    expect(queryServiceSource).toContain('ClientNote.findOne({');
    expect(queryServiceSource).toContain(': Promise.resolve(null)');
  });

  it('keeps overview data assembly outside the route controller', () => {
    expect(controllerSource).toContain("from '../services/clientDataOverviewService.mjs'");
    expect(controllerSource).not.toContain('ClientOnboardingQuestionnaire.findOne({\n        where: { userId: targetUserId },');
    expect(controllerSource).not.toContain('const nutritionSummary = nutritionPlan');
  });

  it('keeps overview query orchestration and payload shaping in dedicated helpers', () => {
    expect(queryServiceSource).toContain('export const fetchClientDataOverviewRecords');
    expect(payloadServiceSource).toContain('export const buildClientDataOverviewPayload');
    expect(serviceSource).toContain("from './clientDataOverviewQueryService.mjs'");
    expect(serviceSource).toContain("from './clientDataOverviewPayloadService.mjs'");
    expect(serviceSource).not.toContain('Promise.all([');
    expect(serviceSource).not.toContain('const buildBaselineSummary =');
  });

  it('builds the client overview response from the extracted payload helper', async () => {
    const { buildClientDataOverviewPayload } = await import('../../services/clientDataOverviewPayloadService.mjs');
    const sampleDate = new Date('2026-01-02T03:04:05.000Z');

    const overview = buildClientDataOverviewPayload({
      targetUserId: 42,
      questionnaire: {
        responsesJson: '{"trainingExperience":"intermediate"}',
        status: 'completed',
        primaryGoal: 'strength',
        trainingTier: 'elite',
      },
      baselineMeasurement: {
        takenAt: sampleDate,
        bodyWeight: 185,
        bodyFatPercentage: 14,
        plankDuration: 90,
        restingHeartRate: 58,
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        benchPressWeight: 225,
        benchPressReps: 5,
        squatWeight: 315,
        squatReps: 3,
        nasmAssessmentScore: 92,
      },
      nutritionPlan: {
        dailyCalories: 2500,
        proteinGrams: '180',
        carbsGrams: 220,
        fatGrams: null,
      },
      photoCount: 2,
      latestPhoto: { uploadedAt: sampleDate },
      noteCount: 1,
      latestNote: { createdAt: sampleDate },
    });

    expect(overview.userId).toBe(42);
    expect(overview.onboardingStatus.completed).toBe(true);
    expect(overview.onboardingStatus.primaryGoal).toBe('strength');
    expect(overview.movementScreen.nasmAssessmentScore).toBe(92);
    expect(overview.baselineMeasurements.bloodPressure).toBe('120/80');
    expect(overview.baselineMeasurements.benchPress).toBe('225 lbs x 5');
    expect(overview.nutritionPlan.macros).toEqual({ protein: 180, carbs: 220, fat: null });
    expect(overview.progressPhotos.lastUpload).toBe(sampleDate);
    expect(overview.trainerNotes.count).toBe(1);
  });
});
