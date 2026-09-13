/**
 * ============================================================================
 * FILE: useSprintAPI.confirmError.test.tsx
 *
 * WHY THIS EXISTS
 *   `SlotDetailPanel.test.tsx` mocks `useSprintAPI`, so it proves the PANEL renders a refusal once
 *   the hook hands it one — it proves nothing about whether the hook produces one, or clears it.
 *   Two hostile-review findings (round 114 F2, round 115 F2) live exactly there.
 *
 * WHICH TESTS PIN WHAT (round 116 R6 — this matters, because the reachable path and the defensive
 * one are different):
 *   - The REACHABLE refusal is a 4xx: `sprintRoutes.mjs:102-108` answers refusals with a status, so
 *     axios rejects and the hook's `catch` sets the message. The THROWN-failure test pins that.
 *   - The 200-with-`success:false` branch is DEFENSIVE — the route does not currently emit it — so
 *     the tests that hand the hook that shape verify a branch, not live behaviour. They are kept
 *     (and labelled) because the branch exists; they are not evidence that the silent-refusal defect
 *     is fixed. What fixed that was rendering `error` in the panel (round 114 F2).
 *   - Clearing is provided by the start-of-call reset in every action (probe M43 fails the suite if
 *     it is removed) AND by the panel unmounting on success (`SprintPlannerPage.tsx:288-291`).
 *
 * NOTE: `frontend/tsconfig.json` excludes test files, so the run is the only evidence.
 * ============================================================================
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  service: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  getToken: vi.fn(() => 'test-token'),
}));

vi.mock('../services/api.service', () => ({
  default: mocks.service,
  ProductionTokenManager: { getToken: mocks.getToken },
}));

import { useSprintAPI } from './useSprintAPI';

const ok = (data: Record<string, unknown> = {}) => ({ data: { success: true, ...data } });

describe('useSprintAPI — a refused confirmation is SURFACED and a successful one CLEARS it', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[reachable path] sets the error from a THROWN 4xx refusal', async () => {
    mocks.service.put.mockRejectedValueOnce({ response: { data: { error: 'This class has already been confirmed.' } } });
    const { result } = renderHook(() => useSprintAPI());

    await act(async () => { await result.current.confirmSlot(1, 2, '2026-03-02'); });

    expect(result.current.error).toBe('This class has already been confirmed.');
  });

  it('[defensive branch] sets the error from a 200 with success:false', async () => {
    mocks.service.put.mockResolvedValueOnce({ data: { success: false, message: 'That date is in the future.' } });
    const { result } = renderHook(() => useSprintAPI());

    let returned: boolean | undefined;
    await act(async () => { returned = await result.current.confirmSlot(1, 2, '2030-01-01'); });

    expect(returned).toBe(false);
    expect(result.current.error).toBe('That date is in the future.');
  });

  it('CLEARS the error on a later success (round 115 F2)', async () => {
    mocks.service.put
      .mockResolvedValueOnce({ data: { success: false, message: 'Not confirmable yet.' } })
      .mockResolvedValueOnce(ok());
    const { result } = renderHook(() => useSprintAPI());

    await act(async () => { await result.current.confirmSlot(1, 2, '2026-03-02'); });
    expect(result.current.error).toBe('Not confirmable yet.');

    let second: boolean | undefined;
    await act(async () => { second = await result.current.confirmSlot(1, 2, '2026-03-02'); });

    expect(second).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('clears a stale confirm error on a successful REGENERATE too', async () => {
    mocks.service.put.mockResolvedValueOnce({ data: { success: false, message: 'Not confirmable yet.' } });
    mocks.service.post.mockResolvedValueOnce(ok());
    const { result } = renderHook(() => useSprintAPI());

    await act(async () => { await result.current.confirmSlot(1, 2, '2026-03-02'); });
    expect(result.current.error).toBe('Not confirmable yet.');

    await act(async () => { await result.current.regenerateSlot(1, 2); });

    expect(result.current.error).toBeNull();
  });

  it('surfaces a refused REGENERATE as well (the planned-slot path)', async () => {
    mocks.service.post.mockResolvedValueOnce({ data: { success: false, message: 'This slot cannot be regenerated.' } });
    const { result } = renderHook(() => useSprintAPI());

    let returned: boolean | undefined;
    await act(async () => { returned = await result.current.regenerateSlot(1, 2); });

    expect(returned).toBe(false);
    expect(result.current.error).toBe('This slot cannot be regenerated.');
  });
});
