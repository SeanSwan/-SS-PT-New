/**
 * Cortex P0 Safety Truth — safety-gate source-state + signal-tiering regression tests.
 *
 * Directive: docs/ai-workflow/AI-HANDOFF/SWAN-CORTEX-UNIFIED-BRAIN-MASTER-DIRECTIVE-2026-07-12.md §5.2-§5.3
 * Eval-suite tests 2-3 (gate side):
 *   - Empty arrays are NOT proof that pain context was loaded.
 *   - Distinct source states produce distinct gate outcomes.
 *   - Safety-class signals BLOCK; data-hygiene signals only ADVISE (alarm-fatigue fix).
 */
import { describe, expect, it } from 'vitest';

import { buildSwanCoachPlanningSafetyGate } from '../../services/swanCoachPlanningSafetyGateService.mjs';

const CLEAN_INPUTS = { baselineReadiness: true, painInjury: false };

function cleanContext(overrides = {}) {
  return {
    pain: { status: 'loaded_no_active_issue', exclusions: [], warnings: [], activeIssueCount: 0, staleActiveIssues: [] },
    workouts: { sessionsLast2Weeks: 3 },
    ...overrides,
  };
}

describe('swanCoachPlanningSafetyGate source states + tiering (Cortex P0 §5.2-§5.3)', () => {
  it('clean loaded context → coach_review_ready with no signals', () => {
    const gate = buildSwanCoachPlanningSafetyGate(cleanContext(), CLEAN_INPUTS);
    expect(gate.status).toBe('coach_review_ready');
    expect(gate.blockingSignals).toEqual([]);
    expect(gate.advisorySignals).toEqual([]);
  });

  it('test 2 (gate): empty arrays WITHOUT a source status are treated as pain-unknown → BLOCKS', () => {
    // The pre-fix hole: { exclusions: [], warnings: [] } passed Array.isArray and read as "context present".
    const gate = buildSwanCoachPlanningSafetyGate(
      { pain: { exclusions: [], warnings: [] }, workouts: { sessionsLast2Weeks: 3 } },
      CLEAN_INPUTS,
    );
    expect(gate.status).toBe('review_required');
    expect(gate.blockingSignals).toContain('pain_data_unavailable');
  });

  it('test 3: pain source unavailable (fetch failure) → BLOCKS as pain_data_unavailable', () => {
    const gate = buildSwanCoachPlanningSafetyGate(
      cleanContext({ pain: { status: 'unavailable', exclusions: [], warnings: [] } }),
      CLEAN_INPUTS,
    );
    expect(gate.status).toBe('review_required');
    expect(gate.blockingSignals).toContain('pain_data_unavailable');
  });

  it('criticalDataUnavailable → BLOCKS as source_data_unavailable', () => {
    const gate = buildSwanCoachPlanningSafetyGate(
      cleanContext({ criticalDataUnavailable: true, criticalFailures: ['pain_entries'] }),
      CLEAN_INPUTS,
    );
    expect(gate.status).toBe('review_required');
    expect(gate.blockingSignals).toContain('source_data_unavailable');
  });

  it('never_collected → ADVISORY pain_intake_not_collected, does NOT block a brand-new client', () => {
    const gate = buildSwanCoachPlanningSafetyGate(
      cleanContext({ pain: { status: 'never_collected', exclusions: [], warnings: [] } }),
      CLEAN_INPUTS,
    );
    expect(gate.status).toBe('coach_review_ready');
    expect(gate.advisorySignals).toContain('pain_intake_not_collected');
    expect(gate.blockingSignals).toEqual([]);
  });

  it('alarm-fatigue fix: new client (no baseline, no history) gets ADVISORIES, not a block', () => {
    const gate = buildSwanCoachPlanningSafetyGate(
      cleanContext({ workouts: { sessionsLast2Weeks: 0 } }),
      { baselineReadiness: false, painInjury: false },
    );
    expect(gate.status).toBe('coach_review_ready');
    expect(gate.advisorySignals).toEqual(expect.arrayContaining([
      'missing_baseline_or_readiness_context',
      'low_training_history',
    ]));
    expect(gate.blockingSignals).toEqual([]);
    // Missing-data labels still surface for the trainer UI
    expect(gate.missingCriticalData).toEqual(expect.arrayContaining([
      'baseline/readiness context',
      'recent workout history',
    ]));
  });

  it('active pain with exclusions → BLOCKS (pain_exclusions_active)', () => {
    const gate = buildSwanCoachPlanningSafetyGate(
      cleanContext({
        pain: {
          status: 'loaded_active_issue',
          exclusions: [{ bodyRegion: 'shoulder', painLevel: 8 }],
          warnings: [],
          activeIssueCount: 1,
        },
      }),
      { ...CLEAN_INPUTS, painInjury: true },
    );
    expect(gate.status).toBe('review_required');
    expect(gate.blockingSignals).toContain('pain_exclusions_active');
  });

  it('active pain with warnings only → BLOCKS (active_pain_review_required)', () => {
    const gate = buildSwanCoachPlanningSafetyGate(
      cleanContext({
        pain: {
          status: 'loaded_active_issue',
          exclusions: [],
          warnings: [{ bodyRegion: 'neck', painLevel: 5 }],
          activeIssueCount: 1,
        },
      }),
      { ...CLEAN_INPUTS, painInjury: true },
    );
    expect(gate.status).toBe('review_required');
    expect(gate.blockingSignals).toContain('active_pain_review_required');
  });

  it('stale chronic issue → ADVISORY reassessment signal alongside any pain block', () => {
    const gate = buildSwanCoachPlanningSafetyGate(
      cleanContext({
        pain: {
          status: 'loaded_active_issue',
          exclusions: [],
          warnings: [{ bodyRegion: 'shoulder', painLevel: 5 }],
          activeIssueCount: 1,
          staleActiveIssues: [{ entryId: 21, bodyRegion: 'shoulder' }],
        },
      }),
      { ...CLEAN_INPUTS, painInjury: true },
    );
    expect(gate.advisorySignals).toContain('stale_active_pain_reassessment_due');
  });

  it('medical clearance / referral / special population remain BLOCKING', () => {
    const gate = buildSwanCoachPlanningSafetyGate(
      cleanContext({
        safety: { medicalClearanceRequired: true, referralRecommended: true },
        health: { specialPopulationFlags: ['pregnancy_postpartum'] },
      }),
      CLEAN_INPUTS,
    );
    expect(gate.status).toBe('review_required');
    expect(gate.blockingSignals).toEqual(expect.arrayContaining([
      'medical_clearance_required',
      'referral_review_recommended',
      'special_population_review_required',
    ]));
  });

  it('back-compat: legacy pain shape (no status) with real warnings still blocks', () => {
    const gate = buildSwanCoachPlanningSafetyGate(
      {
        pain: { exclusions: [], warnings: [{ bodyRegion: 'knee', painLevel: 6 }] },
        workouts: { sessionsLast2Weeks: 2 },
      },
      { ...CLEAN_INPUTS, painInjury: true },
    );
    expect(gate.status).toBe('review_required');
    expect(gate.blockingSignals).toContain('active_pain_review_required');
  });

  it('back-compat: reviewRequiredSignals aliases the blocking tier (approval gate 409s only on safety class)', () => {
    const gate = buildSwanCoachPlanningSafetyGate(
      cleanContext({ workouts: { sessionsLast2Weeks: 0 } }),
      { baselineReadiness: false, painInjury: false },
    );
    // Advisory-only context: approval gate must NOT see review-required signals
    expect(gate.reviewRequiredSignals).toEqual(gate.blockingSignals);
    expect(gate.reviewRequiredSignals).toEqual([]);
  });
});
