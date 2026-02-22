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

  beforeAll(() => {
    const controllerPath = path.resolve(
      __dirname,
      '..',
      '..',
      'controllers',
      'clientOnboardingController.mjs'
    );
    source = fs.readFileSync(controllerPath, 'utf-8');
  });

  test('imports shared helpers from onboardingHelpers.mjs', () => {
    expect(source).toContain("from '../utils/onboardingHelpers.mjs'");
    expect(source).toContain('TOTAL_QUESTION_COUNT');
    expect(source).toContain('isPlainObject');
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
