/**
 * Contract: the extractor and the endpoint agree on the envelope.
 *
 * This is the test that did not exist, and its absence cost real behaviour:
 * extractWorkoutSessions read `payload.workouts` while
 * workoutController.getWorkoutSessions responds `successResponse(res, { sessions })`.
 * The Progress tab therefore received [] from its own endpoint and rendered the
 * empty state no matter how much the member had trained — and the suite stayed
 * green, because the fixture also said `workouts`. A fixture written from belief
 * cannot falsify the belief.
 *
 * So this test asserts the two ends against EACH OTHER: the shape the backend
 * controller actually sends is read against the real extractor.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractWorkoutSessions } from './WorkoutsTabTransformers';

/** The controller's own source is the source of truth for the envelope. */
const controller = readFileSync(
  resolve(process.cwd(), '../backend/controllers/workoutController.mjs'),
  'utf8',
);

describe('workout sessions envelope', () => {
  it('the backend still returns its rows under `sessions`', () => {
    // If this fails, the endpoint changed shape — and the extractor below must
    // change with it, in the same commit.
    expect(controller).toMatch(/successResponse\(res,\s*\{\s*\n?\s*sessions/);
  });

  it('the extractor reads the key the backend actually sends', () => {
    const rows = [{ id: 1 }, { id: 2 }];
    expect(extractWorkoutSessions({ sessions: rows, hasMore: true })).toEqual(rows);
  });

  it('still reads the legacy `workouts` key for any caller shaped that way', () => {
    const rows = [{ id: 9 }];
    expect(extractWorkoutSessions({ workouts: rows })).toEqual(rows);
  });

  it('reads a bare array', () => {
    const rows = [{ id: 3 }];
    expect(extractWorkoutSessions(rows)).toEqual(rows);
  });

  it('returns [] for a shape it does not recognise, never undefined', () => {
    expect(extractWorkoutSessions({ nope: [{ id: 1 }] })).toEqual([]);
    expect(extractWorkoutSessions(null)).toEqual([]);
    expect(extractWorkoutSessions(undefined)).toEqual([]);
  });
});
