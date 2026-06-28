/**
 * coachClientOnboardingApprovalService.test.mjs
 * =============================================
 * Source guards for deterministic Coach-approved client onboarding.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCoachOnboardingAccessHandoff,
  getApprovedOnboardingAvailableSessions,
  normalizeCoachOnboardingDraft,
  summarizeOnboardingDraftForReview,
} from '../../services/coachClientOnboardingApprovalService.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERVICE_SRC = readFileSync(
  resolve(__dirname, '../../services/coachClientOnboardingApprovalService.mjs'),
  'utf8',
);
const NORMALIZER_SRC = readFileSync(
  resolve(__dirname, '../../services/coachClientOnboardingDraftNormalizer.mjs'),
  'utf8',
);

describe('coachClientOnboardingApprovalService', () => {
  it('uses app models and claim-token hashing instead of raw assignment SQL', () => {
    expect(SERVICE_SRC).toMatch(/getUser/);
    expect(SERVICE_SRC).toMatch(/getClientTrainerAssignment/);
    expect(SERVICE_SRC).toMatch(/generateClaimToken/);
    expect(SERVICE_SRC).not.toMatch(/INSERT INTO client_trainer_assignments/i);
  });

  it('builds a safe claim-link handoff for approved Coach onboarding', () => {
    const expires = new Date('2026-07-28T12:00:00.000Z');

    const handoff = buildCoachOnboardingAccessHandoff({
      claimCode: 'SWAN-ABCDEFGH',
      claimExpiresAt: expires,
      frontendUrl: 'https://app.example.test/',
    });

    expect(handoff).toEqual({
      credentialMode: 'claim_link_ready',
      claimCode: 'SWAN-ABCDEFGH',
      claimUrl: 'https://app.example.test/claim/SWAN-ABCDEFGH',
      claimExpiresAt: '2026-07-28T12:00:00.000Z',
    });
    expect(JSON.stringify(handoff)).not.toMatch(/password|secret/i);
  });

  it('returns a sanitized access handoff instead of the old hidden invite status', () => {
    expect(SERVICE_SRC).toMatch(/accessHandoff/);
    expect(SERVICE_SRC).toMatch(/onboardingFieldLedger/);
    expect(SERVICE_SRC).not.toMatch(/created_hidden/);
    expect(SERVICE_SRC).not.toMatch(/temporaryPassword/);
  });

  it('requires human-reviewable identity fields before client creation', () => {
    expect(SERVICE_SRC).toMatch(/firstName/);
    expect(SERVICE_SRC).toMatch(/lastName/);
    expect(NORMALIZER_SRC).toMatch(/ONBOARDING_REQUIRED_FIELDS_MISSING/);
  });

  it('requires client source before deterministic client creation', () => {
    expect(() => normalizeCoachOnboardingDraft({
      payload: { firstName: 'Marcus', lastName: 'Lee' },
    })).toThrow(/client source/i);
  });

  it('sanitizes generated stub emails for dictated names with spaces and punctuation', () => {
    const draft = normalizeCoachOnboardingDraft({
      payload: {
        firstName: 'Mary Ann',
        lastName: "O'Neil-Smith",
        clientSource: 'move_fitness',
      },
    });

    expect(draft.email).toMatch(
      /^mary-ann\.oneil-smith\.[a-f0-9]{6}@stub\.swanstudios\.com$/
    );
  });

  it('keeps every free-tracking source out of paid session inventory on approval', () => {
    expect(getApprovedOnboardingAvailableSessions({
      clientSource: 'move_fitness',
      availableSessions: 8,
    })).toBe(0);

    expect(getApprovedOnboardingAvailableSessions({
      clientSource: 'external',
      availableSessions: 8,
    })).toBe(0);

    expect(getApprovedOnboardingAvailableSessions({
      clientSource: 'swanstudios',
      availableSessions: 8,
    })).toBe(8);
  });

  it('keeps approved session inventory whole-numbered and review-visible', () => {
    expect(getApprovedOnboardingAvailableSessions({
      clientSource: 'swanstudios',
      availableSessions: 2.5,
    })).toBe(0);

    expect(getApprovedOnboardingAvailableSessions({
      clientSource: 'swanstudios',
      availableSessions: '3',
    })).toBe(3);

    expect(summarizeOnboardingDraftForReview({
      payload: {
        firstName: 'Mia',
        lastName: 'Torres',
        clientSource: 'move_fitness',
        availableSessions: 9,
      },
    }).client.availableSessions).toBe(0);
  });

  it('preserves dictated training context in review detail and assignment notes', () => {
    const proposal = {
      payload: {
        firstName: 'Marcus',
        lastName: 'Lee',
        clientSource: 'move_fitness',
        trainingGoal: 'Build strength while protecting the knee.',
        trainerNotes: 'Prefers concise coaching cues.',
        limitations: 'Avoid loaded knee flexion this week.',
        painNotes: 'Right knee discomfort after stairs.',
        equipmentAccess: 'Dumbbells, bands, turf sled.',
        availability: 'Weekday mornings before 9.',
        firstSessionPriorities: 'Baseline pushups, squat pattern, and pain-free conditioning.',
      },
    };

    const draft = normalizeCoachOnboardingDraft(proposal);
    expect(draft.fitnessGoal).toBe('Build strength while protecting the knee.');
    expect(draft.trainerNotes).toContain('Prefers concise coaching cues.');
    expect(draft.trainerNotes).toContain('Limitations: Avoid loaded knee flexion this week.');
    expect(draft.trainerNotes).toContain('Pain notes: Right knee discomfort after stairs.');
    expect(draft.trainerNotes).toContain('Equipment access: Dumbbells, bands, turf sled.');
    expect(draft.trainerNotes).toContain('Availability: Weekday mornings before 9.');
    expect(draft.trainerNotes).toContain('First session priorities: Baseline pushups, squat pattern, and pain-free conditioning.');

    expect(summarizeOnboardingDraftForReview(proposal).client.onboardingContext).toEqual({
      limitations: 'Avoid loaded knee flexion this week.',
      painNotes: 'Right knee discomfort after stairs.',
      equipmentAccess: 'Dumbbells, bands, turf sled.',
      availability: 'Weekday mornings before 9.',
      firstSessionPriorities: 'Baseline pushups, squat pattern, and pain-free conditioning.',
    });
  });

  it('normalizes coverage updates and questionnaire responses from broad onboarding payloads', () => {
    const proposal = {
      payload: {
        firstName: 'Ivy',
        lastName: 'Lane',
        clientSource: 'external',
        communicationStyle: 'warm and direct',
        nutritionPrefs: { allergies: ['peanuts'] },
        questionnaireResponses: { primaryGoal: 'Improve energy' },
        coverageUpdates: [
          { fieldKey: 'health_concerns', status: 'ask_client_later', category: 'health_injury_risk' },
          { fieldKey: 'nutrition_preferences', status: 'known', value: { allergies: ['peanuts'] } },
        ],
      },
    };

    const draft = normalizeCoachOnboardingDraft(proposal);
    expect(draft.questionnaireResponses.primaryGoal).toBe('Improve energy');
    expect(draft.nutritionPrefs).toEqual({ allergies: ['peanuts'] });
    expect(draft.communicationStyle).toBe('warm and direct');
    expect(draft.coverageItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ coverageKey: 'health_concerns', status: 'client_requested' }),
      expect.objectContaining({ coverageKey: 'nutrition_preferences', status: 'known' }),
    ]));
  });

  it('does not depend on stale ClientProgress fields during client creation', () => {
    expect(SERVICE_SRC).toMatch(/to_regclass\('client_progress'\)/);
    expect(SERVICE_SRC).toMatch(/createClientProgressIfAvailable/);
    expect(SERVICE_SRC).not.toMatch(/currentPhase/);
    expect(SERVICE_SRC).not.toMatch(/currentWeight/);
    expect(SERVICE_SRC).not.toMatch(/bodyFatPercentage/);
  });
});
