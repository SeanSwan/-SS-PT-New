/**
 * clientOnboardingCoverageLedgerService.test.mjs
 * ==============================================
 * Regression coverage for non-gating client onboarding field completeness.
 */
import { describe, expect, it } from 'vitest';

import {
  buildClientOnboardingCoverageLedger,
  buildClientOnboardingProgressSnapshot,
} from '../../services/clientOnboardingCoverageLedgerService.mjs';

describe('clientOnboardingCoverageLedgerService', () => {
  it('tracks missing client information without blocking training start', () => {
    const ledger = buildClientOnboardingCoverageLedger({
      client: {
        id: 42,
        firstName: 'Move',
        lastName: 'Client',
        email: 'move.client.abc123@stub.swanstudios.com',
        clientSource: 'move_fitness',
        fitnessGoal: 'Build strength safely',
      },
      draft: {
        onboardingContext: {
          equipmentAccess: 'Dumbbells, bands, sled.',
        },
      },
    });

    expect(ledger.version).toBe('computed-v1');
    expect(ledger.summary.canStartTraining).toBe(true);
    expect(ledger.summary.missingFieldCount).toBeGreaterThan(0);
    expect(ledger.missingFields).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'identity',
        owner: 'client',
        status: 'client_requested',
      }),
      expect.objectContaining({
        key: 'health_concerns',
        owner: 'client',
        status: 'client_requested',
      }),
    ]));
  });

  it('uses questionnaire responses when the client record is still sparse', () => {
    const snapshot = buildClientOnboardingProgressSnapshot({
      client: {
        firstName: 'Sparse',
        lastName: 'Profile',
        email: 'sparse.profile@example.test',
        clientSource: 'swanstudios',
      },
      questionnaire: {
        status: 'in_progress',
        nutritionPrefs: { allergies: ['peanuts'] },
        responsesJson: {
          primaryGoal: 'Improve conditioning',
          medicalConditions: ['old ankle sprain'],
          trainingExperience: 'intermediate',
          availability: 'weekday mornings',
        },
      },
    });

    expect(snapshot.onboardingComplete).toBe(false);
    expect(snapshot.completionPercentage).toBeGreaterThan(0);
    expect(snapshot.completionPercentage).toBeLessThan(100);
    expect(snapshot.onboardingFieldLedger.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'nutrition_preferences', status: 'known' }),
      expect.objectContaining({ key: 'preferred_training_days', status: 'known' }),
    ]));
  });
});
