/**
 * deterministicCoachCommandIntent.test.mjs
 * ========================================
 * Locks common Swan Coach floor commands onto deterministic routing so obvious
 * read/review requests do not depend on a cloud classifier.
 */
import { test as nodeTest } from 'node:test';
import assert from 'node:assert/strict';
import { classifyDeterministicCoachIntakeIntent } from '../../services/ai/deterministicCoachIntakeIntent.mjs';

const isVitest = Boolean(process.env.VITEST || process.env.VITEST_WORKER_ID);
const test = isVitest ? (await import('vitest')).it : nodeTest;

function intent(message) {
  return classifyDeterministicCoachIntakeIntent(message);
}

test('routes client roster and risk reads deterministically', () => {
  assert.deepEqual(intent('show my active clients'), {
    intent: 'list_active_clients',
    clientRef: null,
    params: {},
    confidence: 1,
  });

  assert.deepEqual(intent('show at-risk clients'), {
    intent: 'at_risk_clients',
    clientRef: null,
    params: {},
    confidence: 1,
  });
});

test('routes client-scoped memory reads with explicit client refs', () => {
  assert.deepEqual(intent('what did Ava Stone do last workout'), {
    intent: 'view_last_workout',
    clientRef: 'Ava Stone',
    params: {},
    confidence: 1,
  });

  assert.deepEqual(intent('show Marcus Lee workout history'), {
    intent: 'view_workout_history',
    clientRef: 'Marcus Lee',
    params: {},
    confidence: 1,
  });
});

test('routes selected-client memory reads without forcing a name', () => {
  assert.deepEqual(intent('what did we do last time'), {
    intent: 'view_last_workout',
    clientRef: null,
    params: {},
    confidence: 1,
  });
});

test('routes intake and PLAUD review commands deterministically', () => {
  assert.deepEqual(intent('review next intake'), {
    intent: 'review_next_coach_intake',
    clientRef: null,
    params: {},
    confidence: 1,
  });

  assert.deepEqual(intent('open plaud'), {
    intent: 'view_plaud_intake_queue',
    clientRef: null,
    params: { scope: 'actionable' },
    confidence: 1,
  });
});
