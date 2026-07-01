/**
 * AI generation source-policy context tests.
 *
 * Locks Swan Coach workout and long-horizon generation to the same
 * client-source billing semantics used by deterministic workout planning.
 * The policy is safe for LLM prompts because it contains only source flags,
 * never client names, email addresses, phone numbers, or paid balances.
 */
import { describe, expect, it } from 'vitest';
import { buildUnifiedContext } from '../../services/ai/contextBuilder.mjs';
import { buildLongHorizonPrompt } from '../../services/ai/longHorizonPromptBuilder.mjs';
import { buildWorkoutPrompt } from '../../services/ai/promptBuilder.mjs';
import { buildClientSourcePolicy } from '../../services/sessionBillingPolicy.mjs';
import {
  buildLongHorizonPlanningFingerprint,
  buildWorkoutGenerationPlanningFingerprint,
} from '../../services/swanCoachPlanningGenerationFingerprintService.mjs';

const moveFitnessPolicy = () => buildClientSourcePolicy(' Move Fitness ');

describe('AI generation source-policy context', () => {
  it('centralizes client-source policy for free-tracking clients', () => {
    expect(moveFitnessPolicy()).toEqual({
      clientSource: 'move_fitness',
      sessionBillingMode: 'paid_sessions',
      isFreeTracking: true,
      isNoSessionRequired: false,
      shouldDeductPaidSessions: false,
      sessionBalancePolicy: 'free_tracking_no_session_deduction',
    });
  });

  it('carries source policy through unified AI context without PII', () => {
    const ctx = buildUnifiedContext({
      deIdentifiedPayload: {
        client: { alias: 'Client #42', goals: { primary: 'strength' } },
      },
      clientSource: 'move_fitness',
      sourcePolicy: moveFitnessPolicy(),
      userName: 'Private Client',
    });

    expect(ctx.clientSourceContext).toEqual(expect.objectContaining({
      source: 'move_fitness',
      clientSource: 'move_fitness',
      isFreeTracking: true,
      shouldDeductPaidSessions: false,
      sessionBalancePolicy: 'free_tracking_no_session_deduction',
    }));
    expect(ctx.explainability.dataSources).toEqual(expect.arrayContaining([
      'client_source',
      'source_policy',
    ]));
    expect(JSON.stringify(ctx)).not.toMatch(/Private Client|example\.com|555-/i);
  });

  it('adds explicit source-policy instructions to single-workout prompts', () => {
    const prompt = buildWorkoutPrompt(
      {
        client: { alias: 'Client #42', goals: { primary: 'strength' } },
      },
      {
        sourcePolicy: moveFitnessPolicy(),
        progressContext: { recentSessionCount: 4 },
      },
    );

    expect(prompt).toContain('--- Client Source Policy ---');
    expect(prompt).toContain('Client source: move_fitness');
    expect(prompt).toContain('Paid-session deduction policy: no');
    expect(prompt).toContain('Never deduct or change paid-session balances');
    expect(prompt).not.toMatch(/Private Client|example\.com|555-/i);
  });

  it('marks source policy and plan vault in single-workout planning fingerprints', () => {
    const fingerprint = buildWorkoutGenerationPlanningFingerprint({
      aiPlan: {
        durationWeeks: 4,
        days: [{ dayType: 'training' }, { dayType: 'rest' }],
      },
      safePayload: {
        client: { goals: { primary: 'strength' } },
        trainingVault: {
          available: true,
          filledHorizonKeys: ['one_month'],
        },
      },
      unifiedContext: {
        clientSourceContext: moveFitnessPolicy(),
      },
      progressContext: { recentSessionCount: 4 },
    });

    expect(fingerprint.planInputsUsed.clientSourcePolicy).toBe(true);
    expect(fingerprint.planInputsUsed.planVault).toBe(true);
    expect(fingerprint.dataCategoriesUsed).toEqual(expect.arrayContaining([
      'client source/session policy',
      'workout plan vault/current assignments',
    ]));
  });

  it('adds explicit source-policy instructions to long-horizon prompts', () => {
    const prompt = buildLongHorizonPrompt({
      deidentifiedPayload: {
        client: { alias: 'Client #42', goals: { primary: 'strength' } },
      },
      horizonMonths: 9,
      longHorizonContext: {
        progressSummary: { recentSessionCount: 3, avgSessionsPerWeek: 1.5 },
      },
      sourcePolicy: moveFitnessPolicy(),
    });

    expect(prompt).toContain('--- Client Source Policy ---');
    expect(prompt).toContain('Client source: move_fitness');
    expect(prompt).toContain('Paid-session deduction policy: no');
    expect(prompt).toContain('Never deduct or change paid-session balances');
  });

  it('marks source policy and plan vault in long-horizon planning fingerprints', () => {
    const fingerprint = buildLongHorizonPlanningFingerprint({
      aiPlan: {
        blocks: [{ durationWeeks: 4, sessionsPerWeek: 3 }],
      },
      safePayload: {
        sourcePolicy: moveFitnessPolicy(),
        trainingVault: {
          available: true,
          filledHorizonKeys: ['nine_month'],
        },
      },
      longHorizonContext: {
        progressSummary: { recentSessionCount: 3 },
        activeProgram: {
          horizonMonths: 9,
          goalProfile: { primaryGoal: 'strength' },
          status: 'active',
          sourceType: 'ai_assisted',
        },
      },
      horizonMonths: 9,
    });

    expect(fingerprint.planInputsUsed.clientSourcePolicy).toBe(true);
    expect(fingerprint.planInputsUsed.planVault).toBe(true);
    expect(fingerprint.planInputsUsed.activeProgram).toBe(true);
  });
});
