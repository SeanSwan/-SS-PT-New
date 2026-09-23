/**
 * brain-v4 (C2-adjacent): the thread history must load once the staff surface is
 * ADMITTED. useAIChat.listConversations returns [] while no publication snapshot
 * exists (plan 55), and staff admission is async (GET /api/ai-chat/target-access).
 * Listing only once on mount meant a coach's history never appeared until they
 * sent a message.
 */
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLoadCoachConversations } from './CoachCommandCenter.controllerEffects';

describe('useLoadCoachConversations × admission', () => {
  it('lists when the staff selection becomes ready (not only at mount)', () => {
    const listConversations = vi.fn();
    const { rerender } = renderHook(({ phase }) => useLoadCoachConversations({ listConversations }, phase), {
      initialProps: { phase: 'unadmitted' },
    });
    // A list while unadmitted is a guaranteed empty answer; it must not be the only one.
    expect(listConversations).not.toHaveBeenCalled();
    rerender({ phase: 'checking' });
    expect(listConversations).not.toHaveBeenCalled();
    rerender({ phase: 'ready' });
    expect(listConversations).toHaveBeenCalledTimes(1);
    expect(listConversations).toHaveBeenLastCalledWith('active', true);
  });

  it('re-lists after a re-admission (client switch: ready → checking → ready)', () => {
    const listConversations = vi.fn();
    const { rerender } = renderHook(({ phase }) => useLoadCoachConversations({ listConversations }, phase), {
      initialProps: { phase: 'ready' },
    });
    rerender({ phase: 'checking' });
    rerender({ phase: 'ready' });
    expect(listConversations).toHaveBeenCalledTimes(2);
  });

  it('CONTROL: a non-staff surface (no admission step) lists once at mount', () => {
    const listConversations = vi.fn();
    const { rerender } = renderHook(() => useLoadCoachConversations({ listConversations }, 'retired'));
    rerender();
    expect(listConversations).toHaveBeenCalledTimes(1);
  });
});
