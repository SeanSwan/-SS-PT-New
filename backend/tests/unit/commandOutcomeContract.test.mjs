/**
 * commandOutcomeContract.test.mjs
 * =================================
 * Locks the shared Swan brain to strict, typed, non-prose command outcomes.
 */
import { describe, expect, it } from 'vitest';
import {
  createCommandErrorOutcome,
  parseCommandOutcome,
} from '../../services/ai/commandOutcomeContract.mjs';

describe('command outcome contract', () => {
  it.each([
    {
      type: 'conversation',
      text: 'Here is the coaching answer.',
    },
    {
      type: 'analysis',
      text: 'The current sequence overloads the same movement pattern.',
      findings: [{ code: 'SEQUENCE_LOAD', message: 'Two high-fatigue lifts are adjacent.' }],
    },
    {
      type: 'proposal',
      summary: 'Move the technical lift before accessories.',
      actions: [{
        type: 'move_exercise',
        dayId: 'day-1',
        exerciseId: 'exercise-2',
        toIndex: 0,
      }],
    },
    {
      type: 'mutation',
      target: {
        entityType: 'workout_plan',
        entityId: '11111111-1111-4111-8111-111111111111',
        entityVersion: '7',
      },
      instruction: 'Put compound lifts before accessories.',
      declaredScope: { dayIds: ['day-1'], exerciseIds: ['exercise-2'] },
      actions: [{
        type: 'move_exercise',
        dayId: 'day-1',
        exerciseId: 'exercise-2',
        toIndex: 0,
      }],
    },
    {
      type: 'clarification',
      question: 'Should I preserve the current training days?',
      pendingIntentToken: 'pending-1234567890',
    },
    {
      type: 'refusal',
      code: 'CAPABILITY_DENIED',
      message: 'This surface cannot modify a saved workout plan.',
    },
    createCommandErrorOutcome('PARSE_FAIL'),
  ])('accepts the $type variant', (outcome) => {
    expect(parseCommandOutcome(JSON.stringify(outcome))).toEqual(outcome);
  });

  it('rejects prose, fenced JSON, and prose-wrapped JSON without echoing provider output', () => {
    const rawProviderText = 'Absolutely! ```json {"type":"conversation","text":"unsafe recovery"} ```';

    for (const value of [
      'I rearranged your workout for you.',
      '```json\n{"type":"conversation","text":"hello"}\n```',
      rawProviderText,
    ]) {
      const result = parseCommandOutcome(value);
      expect(result).toMatchObject({ type: 'error', code: 'PARSE_FAIL' });
      expect(JSON.stringify(result)).not.toContain(value);
      expect(JSON.stringify(result)).not.toContain('unsafe recovery');
    }
  });

  it('does not let callers substitute provider text into the safe error helper', () => {
    const result = createCommandErrorOutcome(
      'PARSE_FAIL',
      'I changed your workout and here is the provider response.',
    );

    expect(result.message).toBe('Swan Coach could not safely interpret that request. No data was changed.');
  });

  it('rejects unknown mutation action types and undeclared keys', () => {
    const result = parseCommandOutcome({
      type: 'mutation',
      target: {
        entityType: 'workout_plan',
        entityId: '11111111-1111-4111-8111-111111111111',
        entityVersion: '7',
      },
      instruction: 'Randomize everything.',
      declaredScope: { dayIds: ['day-1'], exerciseIds: [] },
      actions: [{ type: 'randomize_plan', seed: 'surprise-me' }],
      rawModelText: 'hidden provider output',
    });

    expect(result).toMatchObject({ type: 'error', code: 'PARSE_FAIL' });
    expect(result).not.toHaveProperty('rawModelText');
  });
});
