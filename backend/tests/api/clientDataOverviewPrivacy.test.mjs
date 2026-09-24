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
    // Launch audit 2026-09-13: this assertion used to pin the SOURCE TEXT
    //   const includeTrainerNoteSummary = requesterRole !== 'client';
    // which made the test PROTECT THE BUG. `'user'` is the default role minted by
    // public self-registration (models/User.mjs:135) and is client-equivalent per
    // utils/clientAccess.mjs:23, so a normal member walked past that predicate and
    // received the trainer-note count/latest timestamp while this green test
    // advertised the opposite. The gate is now the shared helper and the real
    // proof is behavioural, below.
    expect(queryServiceSource).toContain("import { isClientEquivalentRole } from '../utils/clientAccess.mjs';");
    expect(queryServiceSource).toContain('const includeTrainerNoteSummary = !isClientEquivalentRole(requesterRole);');
    expect(queryServiceSource).not.toContain("requesterRole !== 'client'");
    expect(queryServiceSource).toContain('ClientNote.count({ where: { userId: targetUserId } })');
    expect(queryServiceSource).toContain(': Promise.resolve(0)');
    expect(queryServiceSource).toContain('ClientNote.findOne({');
    expect(queryServiceSource).toContain(': Promise.resolve(null)');
  });

  /**
   * Executes the REAL service with stub models that record every query issued, so
   * the gate decision is OBSERVED rather than inferred from source text. `'user'`
   * and `'client'` must be indistinguishable here; explicit staff must still see
   * the trainer-note summary, which is what stops a blanket deny from passing.
   */
  it('hides the trainer-note summary from every client-equivalent requester, behaviourally', async () => {
    const { fetchClientDataOverviewRecords } = await import('../../services/clientDataOverviewQueryService.mjs');

    const runAs = async (requesterRole) => {
      const calls = [];
      const table = (name) => ({
        findOne: async (query) => {
          calls.push(`findOne:${name}:${JSON.stringify(query.where)}`);
          return { createdAt: '2026-09-01T00:00:00.000Z' };
        },
        count: async (query) => {
          calls.push(`count:${name}:${JSON.stringify(query.where)}`);
          return 4;
        },
      });
      const records = await fetchClientDataOverviewRecords({
        models: {
          ClientOnboardingQuestionnaire: table('ClientOnboardingQuestionnaire'),
          ClientBaselineMeasurements: table('ClientBaselineMeasurements'),
          ClientNutritionPlan: table('ClientNutritionPlan'),
          ClientPhoto: table('ClientPhoto'),
          ClientNote: table('ClientNote'),
        },
        targetUserId: 42,
        requesterRole,
      });
      return { records, noteQueries: calls.filter((call) => call.includes('ClientNote')) };
    };

    const client = await runAs('client');
    const user = await runAs('user');
    const trainer = await runAs('trainer');
    const admin = await runAs('admin');

    // The default self-registration role must not learn that trainer notes exist.
    expect(user.records.noteCount).toBe(0);
    expect(user.records.latestNote).toBeNull();
    expect(user.noteQueries).toHaveLength(0);
    // ...and must be indistinguishable from an explicit client.
    expect({ count: user.records.noteCount, latest: user.records.latestNote, queries: user.noteQueries.length })
      .toEqual({ count: client.records.noteCount, latest: client.records.latestNote, queries: client.noteQueries.length });
    // Negative control: the gate must not become a blanket deny for staff.
    expect(trainer.records.noteCount).toBe(4);
    expect(trainer.records.latestNote).not.toBeNull();
    expect(trainer.noteQueries).toHaveLength(2);
    expect(admin.records.noteCount).toBe(4);
    expect(admin.records.latestNote).not.toBeNull();
    expect(admin.noteQueries).toHaveLength(2);
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
