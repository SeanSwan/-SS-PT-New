/**
 * SCRATCH (read-only hostile probe) — fix-hunt on useBootcampTaughtLog.ts runBodyRef freeze.
 * Copy of frontend/src/hooks/useBootcampTaughtLog.latch.test.tsx harness.
 *
 * ONE QUESTION: does freezing the body with the run key produce a WRONG OUTCOME the pre-fix
 * code did not have?
 *   A) lost-edit attack: attempt 1 fails, trainer EDITS the class, retry → must send the EDIT.
 *   B) midnight retry: byte-identical body; measure the ONLY divergence (frozen classDate).
 *   C) pairing invariant + concurrent double-submit before `logging` flips.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  logClass: vi.fn(),
  getHistory: vi.fn(),
}));

vi.mock('../../../frontend/src/hooks/useBootcampAPI', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../frontend/src/hooks/useBootcampAPI')>();
  return {
    ...actual,
    useBootcampAPI: () => ({ logClass: mocks.logClass, getHistory: mocks.getHistory }),
  };
});

import useBootcampTaughtLog from '../../../frontend/src/hooks/useBootcampTaughtLog';
import type { GeneratedBootcamp } from '../../../frontend/src/hooks/useBootcampAPI';

const bootcamp = (second = 'Push Up'): GeneratedBootcamp => ({
  id: 41,
  name: 'Bootcamp',
  dayType: 'full_body',
  totalClassMin: 45,
  exercises: [
    { exerciseName: 'Goblet Squat', durationSec: 45, restSec: 15, sortOrder: 1, stationIndex: 0 },
    { exerciseName: second, durationSec: 40, restSec: 20, sortOrder: 2, stationIndex: 1 },
  ],
} as unknown as GeneratedBootcamp);

const bodies = () => mocks.logClass.mock.calls.map((c) => ({ ...c[0] }));
const names = (body: { exercisesUsed: Array<{ exerciseName: string }> }) =>
  body.exercisesUsed.map((e) => e.exerciseName);

describe('fix-hunt: runBodyRef freeze', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logClass.mockResolvedValue(777);
    mocks.getHistory.mockResolvedValue({ logs: [], total: 0 });
  });

  // A) The prompt's headline attack: "the trainer edits the class, the retry still sends the OLD
  // body and writes a row for the OLD content". Expected to FAIL as an attack because the reset
  // effect (deps [payloadSignature]) clears BOTH refs when the content changes.
  it('A: after an edit, the retry sends the EDITED content under a fresh key', async () => {
    mocks.logClass.mockRejectedValueOnce(new Error('Network Error'));
    const { result, rerender } = renderHook(
      ({ value }: { value: GeneratedBootcamp }) => useBootcampTaughtLog(value),
      { initialProps: { value: bootcamp() } },
    );

    await act(async () => { await result.current.markTaught(); });
    expect(result.current.loggedId).toBeNull();
    expect(names(bodies()[0])).toEqual(['Goblet Squat', 'Push Up']);

    rerender({ value: bootcamp('Ring Row') });
    mocks.logClass.mockResolvedValueOnce(802);
    await act(async () => { await result.current.markTaught(); });

    const [first, second] = bodies();
    expect(second.operationKey).not.toBe(first.operationKey);
    expect(names(second)).toEqual(['Goblet Squat', 'Ring Row']);
    expect(result.current.loggedId).toBe(802);
  });

  // B) The only reachable divergence the freeze can create: the frozen `classDate`. Measured, not
  // argued: the retry's body keeps the FIRST attempt's date while the live payload has rolled.
  it('B: same-content midnight retry is byte-identical, and carries the FIRST attempt date', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-09-13T23:59:30'));
      mocks.logClass.mockRejectedValueOnce(new Error('Network Error'));
      const { result, rerender } = renderHook(
        ({ value }: { value: GeneratedBootcamp }) => useBootcampTaughtLog(value),
        { initialProps: { value: bootcamp() } },
      );
      await act(async () => { await result.current.markTaught(); });

      vi.setSystemTime(new Date('2026-09-14T00:00:30'));
      rerender({ value: bootcamp() });
      // The live payload HAS rolled over …
      expect(result.current.payload?.classDate).toBe('2026-09-14');

      mocks.logClass.mockResolvedValueOnce(778);
      await act(async () => { await result.current.markTaught(); });

      const [first, second] = bodies();
      expect(second).toEqual(first);                 // byte-identical → no 409
      expect(second.operationKey).toBe(first.operationKey);
      expect(second.classDate).toBe('2026-09-13');   // … but the row is dated 09-13
      // CONSEQUENCE: the frozen date is the attempt date, not the retry-clack date. It is only
      // reachable via retry-after-failure, and it is the identical body that makes the request
      // idempotent. Pre-fix this same request was a permanent 409 whenever attempt 1 had landed.
      expect(result.current.loggedId).toBe(778);
    } finally {
      vi.useRealTimers();
    }
  });

  // C) Pairing invariant: no operationKey may ever travel with two different bodies (that is
  // exactly what the server 409s), including the concurrent double-submit before `logging` flips.
  it('C: no key ever carries two bodies, and a same-tick double-submit mints ONE key', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-09-13T23:59:30'));
      mocks.logClass.mockRejectedValue(new Error('Network Error'));
      const { result, rerender } = renderHook(
        ({ value }: { value: GeneratedBootcamp }) => useBootcampTaughtLog(value),
        { initialProps: { value: bootcamp() } },
      );

      await act(async () => { await result.current.markTaught(); });          // 1: fail
      vi.setSystemTime(new Date('2026-09-14T00:10:00'));
      rerender({ value: bootcamp() });
      await act(async () => {
        const a = result.current.markTaught();                                 // 2+3: same tick
        const b = result.current.markTaught();
        await Promise.all([a, b]);
      });
      rerender({ value: bootcamp('Ring Row') });                               // 4: real edit
      await act(async () => { await result.current.markTaught(); });

      const all = bodies();
      const byKey = new Map<string, string[]>();
      for (const b of all) {
        const { operationKey, ...body } = b;
        byKey.set(operationKey, [...(byKey.get(operationKey) ?? []), JSON.stringify(body)]);
      }
      // Every key maps to exactly ONE distinct body (JSON stringify is order-stable here because
      // both sides come from the same builder).
      for (const [, seen] of byKey) expect(new Set(seen).size).toBe(1);
      // 1 key for the untouched class (calls 1-3), 1 fresh key for the edited class (call 4).
      expect(byKey.size).toBe(2);
      expect(all.length).toBe(4);
      expect(names(all[3])).toEqual(['Goblet Squat', 'Ring Row']);
    } finally {
      vi.useRealTimers();
    }
  });
});
