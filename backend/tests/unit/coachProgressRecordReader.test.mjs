/**
 * G07/T33 — source-linked reader unit contract (assembled shapes, honesty).
 */
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readCoachProgressRecords } from '../../services/ai/coachProgressRecordReader.mjs';

const FLAT = [
  { session_id: 's1', status: 'completed', date: '2026-07-05', workout_exercise_id: 'we1', exercise_id: 'ex-squat', set_id: 'a', reps_completed: 5, weight_used: 100 },
  { session_id: 's1', status: 'completed', date: '2026-07-05', workout_exercise_id: 'we1', exercise_id: 'ex-squat', set_id: 'b', reps_completed: 5, weight_used: 110 },
  { session_id: 's1', status: 'completed', date: '2026-07-05', workout_exercise_id: 'we2', exercise_id: 'ex-bench', set_id: 'c', reps_completed: null, weight_used: 60 },
  { session_id: 's2', status: 'in_progress', date: '2026-07-10', workout_exercise_id: 'we3', exercise_id: 'ex-squat', set_id: 'd', reps_completed: 9, weight_used: 95 },
];

function readerWithDb(rowsByPattern) {
  const queries = [];
  return {
    queries,
    read: (input = {}) => readCoachProgressRecords({
      sequelize: { QueryTypes: { SELECT: 'SELECT' } },
      userId: 42,
      deps: {
        query: async (sql) => {
          queries.push(sql);
          for (const [pattern, rows] of Object.entries(rowsByPattern)) {
            if (new RegExp(pattern).test(sql)) return rows;
          }
          return [];
        },
      },
      ...input,
    }),
  };
}

test('assembles joined rows into calculator-contract sessions with derived verification', async () => {
  const db = readerWithDb({
    'JOIN workout_exercises': FLAT,
    "status = 'planned'": [{ session_id: 'p1' }, { session_id: 'p2' }],
    'body_measurements': [{ weightUnit: 'lbs' }],
  });
  const records = await db.read();

  assert.equal(records.sessions.length, 2);
  const s1 = records.sessions.find((session) => session.id === 's1');
  assert.equal(s1.verified, true);
  assert.equal(s1.voided, false);
  assert.equal(s1.exercises.length, 2);
  const squat = s1.exercises.find((exercise) => exercise.exerciseKey === 'ex-squat');
  assert.deepEqual(squat.sets, [{ reps: 5, load: 100 }, { reps: 5, load: 110 }]);
  // Null reps is carried as null (never zero) for the calculator.
  const bench = s1.exercises.find((exercise) => exercise.exerciseKey === 'ex-bench');
  assert.deepEqual(bench.sets, [{ reps: null, load: 60 }]);
  const s2 = records.sessions.find((session) => session.id === 's2');
  assert.equal(s2.verified, false);
  assert.equal(s2.voided, true);

  assert.equal(records.scheduledCount, 2);
  assert.deepEqual(records.missingInputs, []);
  assert.ok(db.queries.some((sql) => sql.includes('workout_exercises')));
  assert.ok(db.queries.some((sql) => sql.includes("'planned'")));
});

test('a missing weight unit is reported, never guessed', async () => {
  const db = readerWithDb({
    'JOIN workout_exercises': FLAT,
    "status = 'planned'": [],
    'body_measurements': [],
  });
  const records = await db.read();
  assert.deepEqual(records.missingInputs, ['weight_unit']);
  assert.equal(records.sessions[0].exercises[0].unit, '');
});

test('zero planned sessions yields null-denominator scheduledCount inputs', async () => {
  const db = readerWithDb({
    'JOIN workout_exercises': [],
    "status = 'planned'": [],
    'body_measurements': [{ weightUnit: 'kg' }],
  });
  const records = await db.read();
  assert.equal(records.scheduledCount, 0);
  assert.deepEqual(records.sessions, []);
});

test('a full row cap flags partial evidence instead of silently truncating', async () => {
  const many = Array.from({ length: 241 }, (_, i) => ({
    session_id: `s${i}`, status: 'completed', date: '2026-07-05',
    workout_exercise_id: `we${i}`, exercise_id: 'ex-squat',
    set_id: `set${i}`, reps_completed: 5, weight_used: 100,
  }));
  const db = readerWithDb({
    'JOIN workout_exercises': many,
    "status = 'planned'": [],
    'body_measurements': [{ weightUnit: 'lbs' }],
  });
  const records = await db.read();
  assert.ok(records.missingInputs.includes('session_row_cap'));
  // 241 flat rows -> 240 kept rows; each row is its own session here, so the
  // 241st (probe) row is dropped and the cap is flagged.
  assert.equal(records.sessions.length, 240);
});

test('missing reader context is unavailable, not empty', async () => {
  const records = await readCoachProgressRecords({ sequelize: null, userId: null });
  assert.deepEqual(records.missingInputs, ['authorized_reader_context']);
  assert.deepEqual(records.sessions, []);
});
