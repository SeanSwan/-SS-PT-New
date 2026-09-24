/**
 * ============================================================================
 * FILE: useCoachCommandCenterPendingFood.admission.test.tsx
 * PURPOSE: Plan 55 C4 (G04BC-R05, G04BC-T14) â€” the pending-food lane must not
 *   publish a macro message, refresh history or raise a paywall into a coaching
 *   scope that is no longer admitted.
 * ============================================================================
 *
 * Plan 55 Â§3 C4 names `hooks/useCoachCommandCenterPendingFood.ts`; plan 55 Â§5
 * (line 125) adds the exact seam `hooks/useSwanCoachPendingFoodQuery.ts`, which
 * reads a global sessionStorage key on mount and can later send a message and
 * raise a paywall. Both subjects are covered here.
 *
 * This is the ONE new test file admitted by the delegating agent (B2's
 * `CoachCommandCenterPage.test.harness.tsx` admission was already consumed).
 * Test-only: it changes no product file, dependency or config.
 *
 * PARENT-APPROVED SCOPE AMENDMENT â€” recorded so the admission is visible in the
 * audit trail rather than looking like an unapproved file addition.
 *
 * Negative controls: every blocked assertion is paired with an admitted control
 * in the same file, so neither a blanket deny nor a blanket allow can pass.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCoachCommandCenterPendingFood } from './useCoachCommandCenterPendingFood';
import {
  PENDING_COACH_FOOD_STORAGE_KEY,
  useSwanCoachPendingFoodQuery,
} from './useSwanCoachPendingFoodQuery';
import type { PublicationBinding, PublicationSnapshot } from '../../../../../hooks/coachPublicationScope';

const showPaywallMock = vi.hoisted(() => vi.fn());

vi.mock('../../../../../context/PaywallContext', () => ({
  usePaywall: () => ({ showPaywall: showPaywallMock }),
}));

type CommandCenterChat = Parameters<typeof useCoachCommandCenterPendingFood>[0]['chat'];

const FOOD_ACTOR = 7;
const FOOD_CLIENT = 84;
const FOOD_TEXT = 'ate 500 kcal chicken and rice';
const FOOD_CONTEXT = { meal: 'lunch', calories: 500 };

function foodSnapshot(overrides: Partial<PublicationSnapshot> = {}): PublicationSnapshot {
  return Object.freeze({
    actorId: FOOD_ACTOR,
    rawRole: 'trainer',
    audienceRole: 'client',
    generation: 1,
    targetUserId: FOOD_CLIENT,
    threadId: 11,
    enabled: true,
    ...overrides,
  });
}

function foodBinding(getSnapshot: () => PublicationSnapshot | null): PublicationBinding {
  return { getSnapshot };
}

function makeChat(overrides: Partial<Record<keyof CommandCenterChat, unknown>> = {}): {
  chat: CommandCenterChat;
  send: ReturnType<typeof vi.fn>;
  list: ReturnType<typeof vi.fn>;
} {
  const send = vi.fn().mockResolvedValue({ role: 'assistant', message: 'logged' });
  const list = vi.fn().mockResolvedValue([]);
  const chat = {
    listConversations: list,
    sendMessageWithConversation: send,
    sending: false,
    ...overrides,
  } as unknown as CommandCenterChat;
  return { chat, send, list };
}

function seedPendingFood(payload: unknown = { message: FOOD_TEXT, foodContext: FOOD_CONTEXT }) {
  window.sessionStorage.setItem(PENDING_COACH_FOOD_STORAGE_KEY, JSON.stringify(payload));
}

describe('Plan 55 C4: pending-food send obeys the live publication admission', () => {
  beforeEach(() => {
    showPaywallMock.mockReset();
    window.sessionStorage.clear();
  });
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('refuses to send or refresh history while the selection is not admitted', async () => {
    const { chat, send, list } = makeChat();
    const live = { current: foodSnapshot({ enabled: false }) as PublicationSnapshot | null };
    const { result } = renderHook(() => useCoachCommandCenterPendingFood({
      chat,
      targetClientId: FOOD_CLIENT,
      binding: foodBinding(() => live.current),
    }));

    await act(async () => { await result.current(FOOD_TEXT, FOOD_CONTEXT); });

    expect(send).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
  });

  it('CONTROL: sends the exact message and food context once the selection IS admitted', async () => {
    const { chat, send, list } = makeChat();
    const live = { current: foodSnapshot() as PublicationSnapshot | null };
    const { result } = renderHook(() => useCoachCommandCenterPendingFood({
      chat,
      targetClientId: FOOD_CLIENT,
      binding: foodBinding(() => live.current),
    }));

    await act(async () => { await result.current(FOOD_TEXT, FOOD_CONTEXT); });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]).toEqual([
      FOOD_TEXT, 'macro_logging', 'Nutrition Coach', FOOD_CLIENT, 'both', FOOD_CONTEXT,
    ]);
    expect(list).toHaveBeenCalledTimes(1);
    expect(list.mock.calls[0]).toEqual(['active', true]);
  });

  it('refuses a candidate whose target is not the admitted target', async () => {
    const { chat, send } = makeChat();
    const { result } = renderHook(() => useCoachCommandCenterPendingFood({
      chat,
      targetClientId: 43,
      binding: foodBinding(() => foodSnapshot()),
    }));

    await act(async () => { await result.current(FOOD_TEXT, FOOD_CONTEXT); });

    expect(send).not.toHaveBeenCalled();
  });

  it('a send completing after its admission retired cannot refresh history', async () => {
    let resolveSend: (value: unknown) => void = () => undefined;
    const { chat, send, list } = makeChat();
    send.mockReturnValue(new Promise((resolve) => { resolveSend = resolve; }));
    const live = { current: foodSnapshot() as PublicationSnapshot | null };
    const { result, rerender } = renderHook(({ tick }: { tick: number }) => {
      void tick;
      return useCoachCommandCenterPendingFood({
        chat,
        targetClientId: FOOD_CLIENT,
        binding: foodBinding(() => live.current),
      });
    }, { initialProps: { tick: 0 } });

    let pending: Promise<unknown> = Promise.resolve();
    act(() => { pending = result.current(FOOD_TEXT, FOOD_CONTEXT); });

    live.current = foodSnapshot({ generation: 2 });
    rerender({ tick: 1 });

    await act(async () => { resolveSend({ role: 'assistant', message: 'logged' }); await pending; });

    expect(list).not.toHaveBeenCalled();
    expect(await pending).toBeNull();
  });

  it('CONTROL: a send that is still current refreshes history and returns its response', async () => {
    const { chat, send, list } = makeChat();
    const live = { current: foodSnapshot() as PublicationSnapshot | null };
    const { result } = renderHook(() => useCoachCommandCenterPendingFood({
      chat,
      targetClientId: FOOD_CLIENT,
      binding: foodBinding(() => live.current),
    }));

    let response: unknown = null;
    await act(async () => { response = await result.current(FOOD_TEXT, FOOD_CONTEXT); });

    expect(send).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledTimes(1);
    expect(response).toMatchObject({ role: 'assistant' });
  });
});

describe('Plan 55 C4: restored pending-food payload obeys the live admission', () => {  beforeEach(() => {
    showPaywallMock.mockReset();
    window.sessionStorage.clear();
  });
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('leaves an unowned stored payload unsent and undeleted while the selection is not admitted', () => {
    seedPendingFood();
    const send = vi.fn();
    const live = { current: foodSnapshot({ enabled: false }) as PublicationSnapshot | null };

    renderHook(() => useSwanCoachPendingFoodQuery(send, { binding: foodBinding(() => live.current) }));

    expect(send).not.toHaveBeenCalled();
    expect(showPaywallMock).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(PENDING_COACH_FOOD_STORAGE_KEY)).not.toBeNull();
  });

  it('CONTROL: consumes the same stored payload and clears it on assistant success', async () => {
    seedPendingFood();
    const send = vi.fn().mockResolvedValue({ role: 'assistant', message: 'logged' });
    const live = { current: foodSnapshot() as PublicationSnapshot | null };

    renderHook(() => useSwanCoachPendingFoodQuery(send, { binding: foodBinding(() => live.current) }));

    await act(async () => { await Promise.resolve(); });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]).toEqual([FOOD_TEXT, FOOD_CONTEXT]);
    expect(window.sessionStorage.getItem(PENDING_COACH_FOOD_STORAGE_KEY)).toBeNull();
  });

  it('a paywall resolving after the admission retired is not shown', async () => {
    seedPendingFood();
    let resolveSend: (value: unknown) => void = () => undefined;
    const send = vi.fn().mockReturnValue(new Promise((resolve) => { resolveSend = resolve; }));
    const live = { current: foodSnapshot() as PublicationSnapshot | null };
    const { rerender } = renderHook(({ tick }: { tick: number }) => {
      void tick;
      return useSwanCoachPendingFoodQuery(send, { binding: foodBinding(() => live.current) });
    }, { initialProps: { tick: 0 } });

    expect(send).toHaveBeenCalledTimes(1);

    live.current = foodSnapshot({ generation: 2 });
    rerender({ tick: 1 });

    await act(async () => {
      resolveSend({ paywallRequired: true, requiredTier: 'elite', message: 'Upgrade required' });
      await Promise.resolve();
    });

    expect(showPaywallMock).not.toHaveBeenCalled();
  });

  it('CONTROL: shows the same paywall while the admission is still current', async () => {
    seedPendingFood();
    const send = vi.fn().mockResolvedValue({ paywallRequired: true, requiredTier: 'elite', message: 'Upgrade required' });
    const live = { current: foodSnapshot() as PublicationSnapshot | null };

    renderHook(() => useSwanCoachPendingFoodQuery(send, { binding: foodBinding(() => live.current) }));

    await act(async () => { await Promise.resolve(); });

    expect(showPaywallMock).toHaveBeenCalledTimes(1);
  });
});
