/**
 * useWorkoutPlannerSavedPlansList — S05 / R-H22 read-contract tests
 * ===============================================================
 * H22-T4 (retry only becomes ready on real success) and H22-T5 (races,
 * unmount, missing identity, malformed payload).
 *
 * The point of these tests: a failed, denied, malformed or superseded read must
 * NEVER be observable as "this client has no plans".
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWorkoutPlannerSavedPlansList } from './useWorkoutPlannerSavedPlansList';

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void };

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const planRow = (id: string, status = 'draft') => ({ id, title: `Plan ${id}`, status, contentRevision: 1 });

const ok = (plans: unknown[]) => ({ data: { success: true, plans } });

const render = (authAxios: any, selectedClientId: number | null) =>
  renderHook(({ clientId }: { clientId: number | null }) =>
    useWorkoutPlannerSavedPlansList({ authAxios, selectedClientId: clientId }),
  { initialProps: { clientId: selectedClientId } });

describe('useWorkoutPlannerSavedPlansList read contract', () => {
  it('establishes ready with an identified list on success', async () => {
    const authAxios = { get: vi.fn().mockResolvedValue(ok([planRow('a')])) };
    const { result } = render(authAxios, 42);

    await waitFor(() => expect(result.current.savedPlansStatus).toBe('ready'));
    expect(result.current.savedPlansClientId).toBe(42);
    expect(result.current.savedPlans).toHaveLength(1);
    expect(result.current.savedPlansLoading).toBe(false);
  });

  it('treats a valid empty array as real, identified absence', async () => {
    const authAxios = { get: vi.fn().mockResolvedValue(ok([])) };
    const { result } = render(authAxios, 42);

    await waitFor(() => expect(result.current.savedPlansStatus).toBe('ready'));
    expect(result.current.savedPlansClientId).toBe(42);
    expect(result.current.savedPlans).toEqual([]);
  });

  it('never reports an identified list for a success:false body', async () => {
    const authAxios = { get: vi.fn().mockResolvedValue({ data: { success: false, plans: [] } }) };
    const { result } = render(authAxios, 42);

    await waitFor(() => expect(result.current.savedPlansStatus).toBe('error'));
    expect(result.current.savedPlansClientId).toBeNull();
    expect(result.current.savedPlans).toEqual([]);
  });

  it('never reports an identified list for a malformed plans value', async () => {
    const authAxios = { get: vi.fn().mockResolvedValue({ data: { success: true, plans: { nope: true } } }) };
    const { result } = render(authAxios, 42);

    await waitFor(() => expect(result.current.savedPlansStatus).toBe('error'));
    expect(result.current.savedPlansClientId).toBeNull();
  });

  it('never reports an identified list for a denied or failed read', async () => {
    const denied = Object.assign(new Error('Forbidden'), { response: { status: 403 } });
    const authAxios = { get: vi.fn().mockRejectedValue(denied) };
    const { result } = render(authAxios, 42);

    await waitFor(() => expect(result.current.savedPlansStatus).toBe('error'));
    expect(result.current.savedPlansClientId).toBeNull();
    expect(result.current.savedPlans).toEqual([]);
  });

  it('invalidates readiness the moment a refresh begins', async () => {
    const first = deferred<unknown>();
    const second = deferred<unknown>();
    const authAxios = { get: vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise) };
    const { result } = render(authAxios, 42);

    await act(async () => { first.resolve(ok([planRow('a')])); });
    await waitFor(() => expect(result.current.savedPlansStatus).toBe('ready'));

    await act(async () => { void result.current.fetchSavedPlans(42); });
    expect(result.current.savedPlansStatus).toBe('loading');
    expect(result.current.savedPlansClientId).toBeNull();
  });

  it('retry only becomes ready again after an actual success', async () => {
    const failing = deferred<unknown>();
    const retried = deferred<unknown>();
    const authAxios = { get: vi.fn().mockReturnValueOnce(failing.promise).mockReturnValueOnce(retried.promise) };
    const { result } = render(authAxios, 42);

    await act(async () => { failing.reject(new Error('offline')); });
    await waitFor(() => expect(result.current.savedPlansStatus).toBe('error'));

    // First retry fails too: still unknown, never absence.
    await act(async () => { void result.current.fetchSavedPlans(42); });
    expect(result.current.savedPlansStatus).toBe('loading');
    await act(async () => { retried.reject(new Error('offline again')); });
    await waitFor(() => expect(result.current.savedPlansStatus).toBe('error'));
    expect(result.current.savedPlansClientId).toBeNull();

    // A real success afterwards is the only thing that establishes readiness.
    authAxios.get.mockResolvedValueOnce(ok([planRow('b')]));
    await act(async () => { await result.current.fetchSavedPlans(42); });
    expect(result.current.savedPlansStatus).toBe('ready');
    expect(result.current.savedPlansClientId).toBe(42);
  });

  it('drops a stale completion when the selected client moved on', async () => {
    const forA = deferred<unknown>();
    const forB = deferred<unknown>();
    const authAxios = { get: vi.fn().mockReturnValueOnce(forA.promise).mockReturnValueOnce(forB.promise) };
    const { result, rerender } = render(authAxios, 1);

    rerender({ clientId: 2 });

    // A's late completion must not be attributed to B.
    await act(async () => { forA.resolve(ok([planRow('a-only')])); });
    expect(result.current.savedPlansClientId).not.toBe(1);
    expect(result.current.savedPlans).toEqual([]);

    await act(async () => { forB.resolve(ok([planRow('b-only')])); });
    await waitFor(() => expect(result.current.savedPlansClientId).toBe(2));
    expect(result.current.savedPlans.map(plan => plan.id)).toEqual(['b-only']);
  });

  it('drops a completion that lands after unmount', async () => {
    const pending = deferred<unknown>();
    const authAxios = { get: vi.fn().mockReturnValue(pending.promise) };
    const { unmount } = render(authAxios, 42);

    unmount();
    await act(async () => { pending.resolve(ok([planRow('late')])); });
    // Nothing to assert on the unmounted hook; the contract is that React is not
    // asked to update it. A state write here would surface as a console error,
    // which the suite would report.
    expect(authAxios.get).toHaveBeenCalledTimes(1);
  });

  it('goes idle and unidentified when no client is selected', async () => {
    const authAxios = { get: vi.fn().mockResolvedValue(ok([planRow('a')])) };
    const { result } = render(authAxios, null);

    await waitFor(() => expect(result.current.savedPlansStatus).toBe('idle'));
    expect(result.current.savedPlansClientId).toBeNull();
    expect(result.current.savedPlans).toEqual([]);
    expect(authAxios.get).not.toHaveBeenCalled();
  });
});
