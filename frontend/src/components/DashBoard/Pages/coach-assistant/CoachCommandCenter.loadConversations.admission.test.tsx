/**
 * brain-v4 (C2-adjacent): the thread history must load once the staff surface is
 * ADMITTED. useAIChat.listConversations returns [] while no publication snapshot
 * exists (plan 55), and staff admission is async (GET /api/ai-chat/target-access).
 * Listing only once on mount meant a coach's history never appeared until they
 * sent a message.
 */
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { StrictMode, createElement, type ReactNode } from 'react';
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

  it('re-lists after New chat empties the history (hostile review #2: the sidebar went blank)', () => {
    const listConversations = vi.fn();
    const one = [{ id: 501 }];
    const { rerender } = renderHook(({ list }) => useLoadCoachConversations({ listConversations, conversations: list }, 'ready'), {
      initialProps: { list: [] as unknown[] },
    });
    expect(listConversations).toHaveBeenCalledTimes(1);
    rerender({ list: one });
    rerender({ list: [] }); // useAIChat.newChat() does setConversations([])
    expect(listConversations).toHaveBeenCalledTimes(2);
  });

  it('re-admission re-lists even when the history is already populated', () => {
    const listConversations = vi.fn();
    const list = [{ id: 501 }];
    const { rerender } = renderHook(({ phase }) => useLoadCoachConversations({ listConversations, conversations: list }, phase), {
      initialProps: { phase: 'ready' },
    });
    rerender({ phase: 'checking' });
    rerender({ phase: 'ready' });
    expect(listConversations).toHaveBeenCalledTimes(2);
  });

  it('waits for the chat scope to commit: ready + not-yet-visible, then visible → one list', () => {
    const listConversations = vi.fn();
    const { rerender } = renderHook(({ visible }) => useLoadCoachConversations({ listConversations, conversations: [], publicationVisible: visible }, 'ready'), {
      initialProps: { visible: false },
    });
    expect(listConversations, 'a list before the scope commits is refused, so it must not be the only one').not.toHaveBeenCalled();
    rerender({ visible: true });
    expect(listConversations).toHaveBeenCalledTimes(1);
  });

  it('StrictMode replay lists again (the first list is aborted by the chat hook\'s replayed cleanup)', () => {
    const listConversations = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }) => createElement(StrictMode, null, children);
    renderHook(() => useLoadCoachConversations({ listConversations, conversations: [] }, 'retired'), { wrapper });
    expect(listConversations).toHaveBeenCalledTimes(2);
  });

  it('CONTROL: an empty answer does not loop (a coach with no threads lists once)', () => {
    const listConversations = vi.fn();
    const { rerender } = renderHook(({ list }) => useLoadCoachConversations({ listConversations, conversations: list }, 'ready'), {
      initialProps: { list: [] as unknown[] },
    });
    rerender({ list: [] });
    rerender({ list: [] });
    expect(listConversations).toHaveBeenCalledTimes(1);
  });

  it('CONTROL: a non-staff surface (no admission step) lists once at mount', () => {
    const listConversations = vi.fn();
    const { rerender } = renderHook(() => useLoadCoachConversations({ listConversations }, 'retired'));
    rerender();
    expect(listConversations).toHaveBeenCalledTimes(1);
  });
});
