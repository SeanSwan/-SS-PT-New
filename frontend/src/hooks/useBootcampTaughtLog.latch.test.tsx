/**
 * Latch tests for useBootcampTaughtLog (hostile review, round 114 F3).
 *
 * The hook is the ONLY duplicate guard on the legacy taught-log path: the server keys uniqueness
 * on (trainerId, operationKey), and the operation key is minted client-side per teachable unit. So
 * if the latch releases without the class changing, the next click mints a SECOND key and writes a
 * SECOND class log for a class the trainer already logged.
 *
 * The previous dependency was the `bootcamp` OBJECT, and every slot action (delete, duplicate,
 * move) returns a fresh object — so an unrelated edit re-armed the button. These tests pin the
 * content-keyed latch: a new object with the same content must NOT release it, and a genuine
 * content change must.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  logClass: vi.fn(),
  getHistory: vi.fn(),
}));

vi.mock('./useBootcampAPI', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./useBootcampAPI')>();
  return {
    ...actual,
    useBootcampAPI: () => ({ logClass: mocks.logClass, getHistory: mocks.getHistory }),
  };
});

import useBootcampTaughtLog from './useBootcampTaughtLog';
import type { GeneratedBootcamp } from './useBootcampAPI';

const bootcamp = (): GeneratedBootcamp => ({
  id: 41,
  name: 'Bootcamp',
  dayType: 'full_body',
  totalClassMin: 45,
  exercises: [
    { exerciseName: 'Goblet Squat', durationSec: 45, restSec: 15, sortOrder: 1, stationIndex: 0 },
    { exerciseName: 'Push Up', durationSec: 40, restSec: 20, sortOrder: 2, stationIndex: 1 },
  ],
} as unknown as GeneratedBootcamp);

describe('useBootcampTaughtLog — the operation-identity latch survives an unrelated rebuild', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logClass.mockResolvedValue(777);
    mocks.getHistory.mockResolvedValue({ logs: [], total: 0 });
  });

  it('keeps the latch when a NEW object carries the SAME class content', async () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: GeneratedBootcamp }) => useBootcampTaughtLog(value),
      { initialProps: { value: bootcamp() } },
    );

    await act(async () => { await result.current.markTaught(); });
    expect(result.current.loggedId).toBe(777);
    const keysAfterFirst = mocks.logClass.mock.calls.map((call) => call[0].operationKey);

    // The slot actions hand back a fresh object for the same class — this is what used to
    // release the latch and mint a second key.
    rerender({ value: bootcamp() });

    expect(result.current.loggedId).toBe(777);
    await act(async () => { await result.current.markTaught(); });
    expect(mocks.logClass).toHaveBeenCalledTimes(1);
    expect(mocks.logClass.mock.calls.map((call) => call[0].operationKey)).toEqual(keysAfterFirst);
  });

  it('releases the latch when the class content actually changes', async () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: GeneratedBootcamp }) => useBootcampTaughtLog(value),
      { initialProps: { value: bootcamp() } },
    );

    await act(async () => { await result.current.markTaught(); });
    expect(result.current.loggedId).toBe(777);

    const changed = bootcamp();
    changed.exercises = [
      { exerciseName: 'Goblet Squat', durationSec: 45, restSec: 15, sortOrder: 1, stationIndex: 0 },
      { exerciseName: 'Ring Row', durationSec: 40, restSec: 20, sortOrder: 2, stationIndex: 1 },
    ] as unknown as GeneratedBootcamp['exercises'];
    rerender({ value: changed });

    expect(result.current.loggedId).toBeNull();
  });

  // Hostile review, round 116 R9: the signature deliberately EXCLUDES `classDate` (it is
  // `localDateString(new Date())`, so a session crossing local midnight would otherwise release the
  // latch and mint a second run key for the same class) — but nothing pinned that exclusion, so it
  // could have been re-added silently. This test moves the clock past midnight between two renders
  // of an IDENTICAL class and requires the latch to hold.
  it('keeps the latch across LOCAL MIDNIGHT, because classDate is excluded from the signature', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-09-13T23:59:30'));
      const { result, rerender } = renderHook(
        ({ value }: { value: GeneratedBootcamp }) => useBootcampTaughtLog(value),
        { initialProps: { value: bootcamp() } },
      );

      await act(async () => { await result.current.markTaught(); });
      expect(result.current.loggedId).toBe(777);

      // Same class content, new day — and the payload's classDate is recomputed, as it would be.
      vi.setSystemTime(new Date('2026-09-14T00:00:30'));
      rerender({ value: bootcamp() });

      expect(result.current.loggedId).toBe(777);
      await act(async () => { await result.current.markTaught(); });
      expect(mocks.logClass).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  // Hostile review, round 127 (HIGH). The test above pins the classDate EXCLUSION, and the exclusion
  // is what makes a retry unsafe: `classDate` is `localDateString(new Date())`, the retry resends
  // whatever the CURRENT payload holds, and the server hashes the whole body
  // (`bootcampCrud.mjs:101` → `hashTaughtPayload`). So a lost response followed by local midnight
  // sends ONE operationKey with TWO different payload hashes, and `resolveIdempotentLog`
  // (`bootcampCrud.mjs:131-135`) answers 409 "operationKey was already used with a different
  // payload" — permanently, because the key is not re-minted while the content signature holds.
  // The row IS already logged; the trainer sees an internal error string and the button stays armed.
  //
  // This is the exact retry the operation key exists to make safe. The assertion is body IDENTITY,
  // not call count: a call-count assertion passes while the body silently drifts, which is why the
  // midnight test above did not catch this.
  it('resends a byte-identical body on the retry after a lost response, even across local midnight', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-09-13T23:59:30'));
      mocks.logClass.mockRejectedValueOnce(new Error('Network Error'));
      const { result, rerender } = renderHook(
        ({ value }: { value: GeneratedBootcamp }) => useBootcampTaughtLog(value),
        { initialProps: { value: bootcamp() } },
      );

      // The response was lost. The write may have landed server-side, so the button stays armed.
      await act(async () => { await result.current.markTaught(); });
      expect(result.current.loggedId).toBeNull();
      expect(mocks.logClass).toHaveBeenCalledTimes(1);
      const firstBody = { ...mocks.logClass.mock.calls[0][0] };

      // Midnight passes, and a slot action hands back a fresh object for the SAME class content.
      vi.setSystemTime(new Date('2026-09-14T00:00:30'));
      rerender({ value: bootcamp() });

      mocks.logClass.mockResolvedValueOnce(778);
      await act(async () => { await result.current.markTaught(); });

      expect(mocks.logClass).toHaveBeenCalledTimes(2);
      const secondBody = { ...mocks.logClass.mock.calls[1][0] };
      expect(secondBody.operationKey).toBe(firstBody.operationKey);
      // Same key + same body = the server returns the original row. Same key + a moved classDate =
      // a permanent 409.
      expect(secondBody).toEqual(firstBody);
      expect(result.current.loggedId).toBe(778);
    } finally {
      vi.useRealTimers();
    }
  });

  // Hostile review, round 115 F5 (MED): a malformed 200 (no `logId`) used to latch the button
  // FOREVER with no message, because the guard is `loggedId !== null` and `undefined` passes it.
  // A `logId: null` would instead leave the latch OPEN and mint a second run key — a duplicate log.
  // Neither may happen: the hook must report the problem and stay usable.
  it('does NOT latch on a malformed 200, and says so', async () => {
    mocks.logClass.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useBootcampTaughtLog(bootcamp()));

    await act(async () => { await result.current.markTaught(); });

    expect(result.current.loggedId).toBeNull();
    expect(result.current.logError).toMatch(/did not confirm a class-log id/i);

    // …and the button still works on the retry, which is the point of not latching.
    mocks.logClass.mockResolvedValueOnce(778);
    await act(async () => { await result.current.markTaught(); });
    expect(result.current.loggedId).toBe(778);
  });
});
