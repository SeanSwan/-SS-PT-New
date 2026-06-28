import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const questionBank = await import('../../../shared/clientOnboardingQuestionBank.mjs');
const ledgerService = await import('../../services/clientOnboardingCoverageLedgerService.mjs');

const EXPECTED_CATEGORIES = [
  'account_identity_source',
  'compliance_waiver_consent',
  'contact_communication_preferences',
  'goals_outcomes',
  'schedule_availability',
  'health_injury_risk',
  'pain_body_map_movement_screen',
  'measurements_body_composition',
  'training_history_preferences',
  'equipment_environment',
  'nutrition_hydration',
  'lifestyle_recovery',
  'baseline_performance',
  'package_business_admin',
  'coach_charting_data_priority',
];

const REQUIRED_FOR_VALUES = new Set(['safety', 'programming', 'charting', 'communication', 'business']);
const MASTER_PROMPT_ROOTS = new Set([
  'client',
  'measurements',
  'goals',
  'health',
  'nutrition',
  'lifestyle',
  'training',
  'baseline',
  'aiCoaching',
  'visualDiagnostics',
  'package',
  'notes',
  'trainerAssessment',
  'metadata',
]);

describe('client onboarding question bank', () => {
  it('defines the canonical 15 Coach scan categories in order', () => {
    expect(questionBank.CLIENT_ONBOARDING_CATEGORY_KEYS).toEqual(EXPECTED_CATEGORIES);
    expect(questionBank.CLIENT_ONBOARDING_QUESTION_BANK_CATEGORIES.map((category) => category.key)).toEqual(EXPECTED_CATEGORIES);
  });

  it('gives every category at least one reviewable field with complete scan metadata', () => {
    const fieldsByCategory = new Map();
    for (const item of questionBank.CLIENT_ONBOARDING_QUESTION_BANK) {
      fieldsByCategory.set(item.category, (fieldsByCategory.get(item.category) || 0) + 1);
      expect(item.fieldKey).toMatch(/^[a-z0-9_]+$/);
      expect(item.label).toBeTruthy();
      expect(item.trainerPrompt).toBeTruthy();
      expect(item.clientPrompt).toBeTruthy();
      expect(item.valueType).toBeTruthy();
      expect(Array.isArray(item.requiredFor)).toBe(true);
      expect(item.requiredFor.length).toBeGreaterThan(0);
      expect(item.requiredFor.every((value) => REQUIRED_FOR_VALUES.has(value))).toBe(true);
      expect(Number.isInteger(item.chartDataPriority)).toBe(true);
      expect(Number.isInteger(item.scanWeight)).toBe(true);
      expect(typeof item.canAskTrainer).toBe('boolean');
      expect(typeof item.canAskClient).toBe('boolean');
      expect(typeof item.isSensitive).toBe('boolean');
      expect(['known', 'unknown', 'trainer_pending', 'client_requested', 'not_applicable', 'blocked']).toContain(item.defaultStatus);
    }

    for (const category of EXPECTED_CATEGORIES) {
      expect(fieldsByCategory.get(category)).toBeGreaterThan(0);
    }
  });

  it('maps stored fields to known Master Prompt roots or marks them ledger-only', () => {
    const roots = new Set();
    for (const item of questionBank.CLIENT_ONBOARDING_QUESTION_BANK) {
      if (!item.masterPromptPath) {
        expect(item.ledgerOnly || item.userProfilePath || item.questionnairePath).toBeTruthy();
        continue;
      }
      const root = item.masterPromptPath.split('.')[0];
      roots.add(root);
      expect(MASTER_PROMPT_ROOTS.has(root)).toBe(true);
    }
    expect([...MASTER_PROMPT_ROOTS].filter((root) => roots.has(root)).length).toBeGreaterThanOrEqual(12);
  });

  it('uses the question bank as the coverage snapshot source', () => {
    const ledger = ledgerService.buildClientOnboardingCoverageLedger({
      client: {
        id: 41,
        firstName: 'Cam',
        lastName: 'Rivers',
        email: 'cam@example.com',
        clientSource: 'move_fitness',
        masterPromptJson: {
          goals: { primary: 'Strength' },
          nutrition: { dietaryPreferences: ['high protein'] },
          training: { fitnessLevel: 'beginner' },
        },
      },
      responses: {
        preferredTrainingDays: ['Tuesday'],
        healthConcerns: 'No current pain.',
      },
    });

    expect(new Set(ledger.items.map((item) => item.category))).toEqual(new Set(EXPECTED_CATEGORIES));
    expect(ledger.items.length).toBe(questionBank.CLIENT_ONBOARDING_QUESTION_BANK.length);
    expect(ledger.items.find((item) => item.coverageKey === 'primary_goal').status).toBe('known');
    expect(ledger.items.find((item) => item.coverageKey === 'health_concerns').status).toBe('known');
    expect(ledger.workoutLoggingBlocked).toBe(false);
  });

  it('documents the bank as shared ESM instead of backend-only prompt text', () => {
    const source = readFileSync(resolve(__dirname, '../../../shared/clientOnboardingQuestionBank.mjs'), 'utf8');
    expect(source).toContain('export const CLIENT_ONBOARDING_QUESTION_BANK');
    expect(source).toContain('getClientOnboardingCoverageFields');
  });
});
