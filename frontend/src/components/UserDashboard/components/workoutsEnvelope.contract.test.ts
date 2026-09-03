/**
 * Contract: the extractor and the endpoint agree on the WHOLE envelope.
 *
 * This is the test that did not exist, and its absence cost real behaviour:
 * extractWorkoutSessions read `payload.workouts` while
 * workoutController.getWorkoutSessions responds `successResponse(res, { sessions })`.
 * The Progress tab therefore received [] from its own endpoint and rendered the
 * empty state no matter how much the member had trained — and the suite stayed
 * green, because the fixture also said `workouts`. A fixture written from belief
 * cannot falsify the belief.
 *
 * It pins BOTH keys the tab reads. An earlier version asserted only `sessions`,
 * which left the identical bug class open one field over: if `hasMore` were
 * renamed, `Boolean(undefined)` hides the Load-older control and history is
 * silently truncated again (GLM 5.3 hostile round 3, finding 1).
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractWorkoutSessions } from './WorkoutsTabTransformers';

/**
 * The controller's own source is the source of truth for the envelope.
 * Resolved from THIS file rather than from cwd: vitest can be invoked from the
 * repo root or from frontend/, and a cwd-relative path fails loudly for an
 * unrelated contributor who simply ran it from the other directory.
 */
const CONTROLLER = resolve(__dirname, '../../../../../backend/controllers/workoutController.mjs');
const controller = existsSync(CONTROLLER) ? readFileSync(CONTROLLER, 'utf8') : null;

describe('workout sessions envelope', () => {
  it('the backend still returns its rows under `sessions`', () => {
    // Skipped rather than failed when the backend is not on disk (frontend-only
    // checkout): a missing sibling package is not evidence of a broken contract.
    if (!controller) return;
    expect(controller).toMatch(/successResponse\(res,\s*\{\s*\n?\s*sessions/);
  });

  it('the backend still reports `hasMore` — the field that gates Load-older', () => {
    if (!controller) return;
    expect(controller).toMatch(/hasMore/);
  });

  it('the extractor reads the key the backend actually sends', () => {
    const rows = [{ id: 1 }, { id: 2 }];
    expect(extractWorkoutSessions({ sessions: rows, hasMore: true })).toEqual(rows);
  });

  it('the tab reads hasMore off the same envelope level as the rows', () => {
    const tab = readFileSync(resolve(__dirname, 'WorkoutsTab.tsx'), 'utf8');
    expect(tab).toMatch(/extractWorkoutSessions\(response\.data\?\.data\)/);
    expect(tab).toMatch(/response\.data\?\.data\?\.hasMore/);
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
