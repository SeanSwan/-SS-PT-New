/**
 * SCU S5c — bounded model response union tests.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCoachModelResponse } from '../../services/ai/coachModelResponseContract.mjs';

test('normalizes an answer and strips authority-shaped fields', () => {
  const result = normalizeCoachModelResponse({
    type: 'answer',
    message: 'Your next session is ready.',
    actorId: 7,
    role: 'admin',
    databaseResult: { saved: true },
  });
  assert.deepEqual(result, { type: 'answer', message: 'Your next session is ready.' });
});

test('turns a model proposal into a draft with no server authority fields', () => {
  const result = normalizeCoachModelResponse({
    type: 'proposal',
    message: 'I drafted a lower-body session.',
    proposal: { commandType: 'log_workout', params: { exercises: [{ name: 'Squat' }] } },
    targetClientId: 9201,
    approvalId: 'forged',
    result: { committed: true },
  });
  assert.deepEqual(result, {
    type: 'proposal',
    message: 'I drafted a lower-body session.',
    proposal: { commandType: 'log_workout', params: { exercises: [{ name: 'Squat' }] } },
    requiresServerResolution: true,
  });
});

test('invalid model output becomes a clarification instead of an executable action', () => {
  assert.deepEqual(normalizeCoachModelResponse({ type: 'tool_call', name: 'delete_user' }), {
    type: 'clarification',
    message: 'I need a clearer request before I can help.',
    reasonCode: 'MODEL_RESPONSE_INVALID',
  });
});
