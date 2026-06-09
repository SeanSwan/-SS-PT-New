/**
 * Phase 1B Regression Tests
 * ==========================
 * Ensures that after extracting shared helpers from clientOnboardingController,
 * the existing controller still imports and uses them correctly.
 */

import { describe, expect, test, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('clientOnboardingController regression after helper extraction', () => {
  let source;
  let queueServiceSource;

  beforeAll(() => {
    const controllerPath = path.resolve(
      __dirname,
      '..',
      '..',
      'controllers',
      'clientOnboardingController.mjs'
    );
    const queueServicePath = path.resolve(
      __dirname,
      '..',
      '..',
      'services',
      'onboardingQueueSummaryService.mjs'
    );
    source = fs.readFileSync(controllerPath, 'utf-8');
    queueServiceSource = fs.readFileSync(queueServicePath, 'utf-8');
  });

  test('imports shared helpers from onboardingHelpers.mjs', () => {
    expect(source).toContain("from '../utils/onboardingHelpers.mjs'");
    expect(source).toContain('normalizeJsonObject');
    expect(source).toContain('toNumber');
    expect(source).toContain('extractPrimaryGoal');
    expect(source).toContain('extractTrainingTier');
    expect(source).toContain('extractCommitmentLevel');
    expect(source).toContain('extractNutritionPrefs');
    expect(source).toContain('calculateHealthRisk');
    expect(source).toContain('calculateCompletionPercentage');
  });

  test('no longer defines local copies of extracted helpers', () => {
    // These patterns detect local const/function definitions — not imports
    const localDefs = [
      /^const countAnsweredQuestions\s*=/m,
      /^const calculateCompletionPercentage\s*=/m,
      /^const toNumber\s*=/m,
      /^const extractPrimaryGoal\s*=/m,
      /^const extractTrainingTier\s*=/m,
      /^const extractCommitmentLevel\s*=/m,
      /^const extractNutritionPrefs\s*=/m,
      /^const calculateHealthRisk\s*=/m,
      /^const TOTAL_QUESTION_COUNT\s*=/m,
      /^const isPlainObject\s*=/m,
      /^const normalizeJsonObject\s*=/m,
    ];

    for (const pattern of localDefs) {
      expect(source).not.toMatch(pattern);
    }
  });

  test('controller module still exports all expected functions', async () => {
    const mod = await import('../../controllers/clientOnboardingController.mjs');
    // These are the public exports that routes depend on
    expect(typeof mod.createQuestionnaire).toBe('function');
    expect(typeof mod.getQuestionnaire).toBe('function');
    expect(typeof mod.createMovementScreen).toBe('function');
    expect(typeof mod.getClientDataOverview).toBe('function');
    expect(typeof mod.getAdminOnboardingList).toBe('function');
    expect(typeof mod.createBaselineMeasurements).toBe('function');
    expect(typeof mod.getBaselineMeasurementsHistory).toBe('function');
  });

  test('moves movement screen scoring and persistence into a service', () => {
    expect(source).toContain("from '../services/clientMovementScreenService.mjs'");
    expect(source).not.toContain('ClientBaselineMeasurements.calculateNASMScore(overheadSquatAssessment)');
    expect(source).not.toContain('parqScreening.medicalClearanceRequired === true || hasParqRisk(parqScreening)');
  });

  test('moves baseline measurement payload creation into a service', () => {
    expect(source).toContain("from '../services/clientBaselineMeasurementService.mjs'");
    expect(source).not.toContain('const { userId, ...measurementData } = req.body;');
    expect(source).not.toContain('restingHeartRate: measurementData.restingHeartRate || null');
    expect(source).not.toContain('rangeOfMotion: normalizeJsonObject(measurementData.rangeOfMotion)');
  });

  test('onboarding queue summaries use live User association aliases', () => {
    expect(source).toContain("from '../services/onboardingQueueSummaryService.mjs'");
    expect(queueServiceSource).toContain("as: 'onboardingQuestionnaires'");
    expect(queueServiceSource).toContain("as: 'baselineMeasurements'");
    expect(queueServiceSource).not.toContain("as: 'questionnaires'");
    expect(queueServiceSource).not.toContain("as: 'packages'");
  });

  test('baseline measurement service preserves the current create payload contract', async () => {
    const { createBaselineMeasurementRecord } = await import('../../services/clientBaselineMeasurementService.mjs');
    const takenAt = new Date('2026-02-03T04:05:06.000Z');
    let payload;

    await createBaselineMeasurementRecord({
      models: {
        ClientBaselineMeasurements: {
          create: async (nextPayload) => {
            payload = nextPayload;
            return nextPayload;
          },
        },
      },
      targetUserId: 51,
      recordedByUserId: 9,
      measurementData: {
        takenAt,
        restingHeartRate: 62,
        bloodPressureSystolic: 118,
        bloodPressureDiastolic: 76,
        bodyWeight: 182,
        bodyFatPercentage: 15,
        benchPressWeight: 225,
        benchPressReps: 4,
        squatWeight: 315,
        squatReps: 5,
        deadliftWeight: 365,
        deadliftReps: 3,
        pullUpsReps: 12,
        plankDuration: 120,
        flexibilityNotes: 'Hamstrings tight',
        rangeOfMotion: { hipFlexion: 90 },
        injuryNotes: 'No acute pain',
        painLevel: 2,
      },
    });

    expect(payload).toEqual({
      userId: 51,
      recordedBy: 9,
      takenAt,
      restingHeartRate: 62,
      bloodPressureSystolic: 118,
      bloodPressureDiastolic: 76,
      bodyWeight: 182,
      bodyFatPercentage: 15,
      benchPressWeight: 225,
      benchPressReps: 4,
      squatWeight: 315,
      squatReps: 5,
      deadliftWeight: 365,
      deadliftReps: 3,
      pullUpsReps: 12,
      plankDuration: 120,
      flexibilityNotes: 'Hamstrings tight',
      rangeOfMotion: { hipFlexion: 90 },
      injuryNotes: 'No acute pain',
      painLevel: 2,
    });
  });

  test('still exports createQuestionnaire and getQuestionnaire', () => {
    expect(source).toContain('export const createQuestionnaire');
    expect(source).toContain('export const getQuestionnaire');
  });

  test('createQuestionnaire still calls derived field extractors', () => {
    expect(source).toContain('extractPrimaryGoal(responses)');
    expect(source).toContain('extractTrainingTier(responses)');
    expect(source).toContain('extractCommitmentLevel(responses)');
    expect(source).toContain('calculateHealthRisk(responses)');
    expect(source).toContain('extractNutritionPrefs(responses)');
    expect(source).toContain('calculateCompletionPercentage(responses)');
  });
});
