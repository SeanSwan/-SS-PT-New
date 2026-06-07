/**
 * AI workout prompt identity contracts.
 * =====================================
 *
 * Locks workout generation prompts to Swan Coach Planning so provider adapters,
 * long-horizon planning, and debate rounds do not drift into generic AI-fitness
 * instructions.
 */
import { describe, expect, it } from 'vitest';

import {
  WORKOUT_SYSTEM_MESSAGE,
  buildWorkoutPrompt,
} from '../services/ai/promptBuilder.mjs';
import {
  LONG_HORIZON_SYSTEM_MESSAGE,
  buildLongHorizonPrompt,
} from '../services/ai/longHorizonPromptBuilder.mjs';
import {
  buildNASMSpecialistPrompt,
  buildSafetyReviewerPrompt,
  buildPeriodizationExpertPrompt,
  buildFinalIntegrationPrompt,
} from '../services/ai/debate/workoutDebatePrompts.mjs';

describe('AI workout prompt identity', () => {
  it('uses Swan Coach Planning identity in provider system messages', () => {
    expect(WORKOUT_SYSTEM_MESSAGE).toContain('Swan Coach Planning');
    expect(WORKOUT_SYSTEM_MESSAGE).toContain('SwanStudios');
    expect(WORKOUT_SYSTEM_MESSAGE).toContain('client IDs only');
    expect(WORKOUT_SYSTEM_MESSAGE).toContain('JSON only');

    expect(LONG_HORIZON_SYSTEM_MESSAGE).toContain('Swan Coach Planning');
    expect(LONG_HORIZON_SYSTEM_MESSAGE).toContain('SwanStudios');
    expect(LONG_HORIZON_SYSTEM_MESSAGE).toContain('client IDs only');
    expect(LONG_HORIZON_SYSTEM_MESSAGE).toContain('JSON only');
  });

  it('keeps generated workout prompt bodies on the Swan Coach Planning model', () => {
    const prompt = buildWorkoutPrompt(
      { clientAlias: 'Client #42', goals: ['strength'] },
      { progressContext: {}, painConstraints: { exclusions: [] } },
    );
    const longHorizonPrompt = buildLongHorizonPrompt({
      deidentifiedPayload: { clientAlias: 'Client #42', goals: ['strength'] },
      horizonMonths: 6,
      longHorizonContext: null,
      nasmConstraints: null,
      templateContext: null,
    });

    for (const text of [prompt, longHorizonPrompt]) {
      expect(text).toContain('SwanStudios is workout-progress-first');
      expect(text).toContain('Every workout or plan generation button is Swan Coach Planning');
      expect(text).toContain('deterministic safety and eligibility gates');
      expect(text).toContain('seven SwanStudios horizons');
    }
  });

  it('keeps debate workout prompts on the Swan Coach Planning model', () => {
    const prompt = buildNASMSpecialistPrompt({
      clientAlias: 'Client #42',
      nasmPhase: 2,
      trainingExperience: 'intermediate',
      fitnessGoals: ['strength'],
      painEntries: [],
    });

    expect(prompt).toContain('SwanStudios is workout-progress-first');
    expect(prompt).toContain('Swan Coach Planning');
    expect(prompt).toContain('Use client IDs only');
    expect(prompt).toContain('Certified Personal Trainer / NASM OPT');
  });

  it('keeps debate JSON output instructions as the final instruction block', () => {
    const clientContext = {
      clientAlias: 'Client #42',
      nasmPhase: 2,
      trainingExperience: 'intermediate',
      fitnessGoals: ['strength'],
      painEntries: [],
    };
    const prompts = [
      buildNASMSpecialistPrompt(clientContext),
      buildSafetyReviewerPrompt(clientContext, '{"workoutDays":[]}'),
      buildPeriodizationExpertPrompt(clientContext, '{"workoutDays":[]}'),
      buildFinalIntegrationPrompt(clientContext, [
        { role: 'safety_reviewer', recommendation: 'safe', modifications: [], consensus: 'agree' },
      ]),
    ];

    for (const prompt of prompts) {
      expect(prompt.indexOf('SWAN COACH PLANNING OPERATING MODEL')).toBeLessThan(
        prompt.indexOf('OUTPUT FORMAT (JSON only'),
      );
      expect(prompt.trim()).toMatch(/\}$/);
    }
  });
});
