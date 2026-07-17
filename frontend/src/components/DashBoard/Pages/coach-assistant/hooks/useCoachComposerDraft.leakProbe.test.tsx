/**
 * PROBE (rule 55) - cross-client draft isolation regression.
 *
 * The former thread-only key shared one new-thread bucket across clients and users.
 * This test mirrors the real controller composition and proves actor + client + thread
 * scoping prevents a draft for client A from appearing after rebinding to client B.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useState, useRef } from 'react';
import { useCoachComposerDraft, coachDraftKey } from './useCoachComposerDraft';
import { useCoachClientNotebook } from './useCoachClientNotebook';

vi.mock('../../../../../services/api.service', () => ({ default: { post: vi.fn(), get: vi.fn() } }));

const SENSITIVE = 'client A: poor adherence to plan, knee pain flaring on squats';

/** Mirror of CoachCommandCenter.controller.ts lines 174 + 177. */
function useControllerLike(clientId: number | null, activeThreadId: number | null) {
  const [commandText, setCommandText] = useState('');
  const [, setSelectedStatus] = useState('');
  const commandTextRef = useRef<HTMLTextAreaElement>(null);
  useCoachClientNotebook({
    clientId, clientLabel: 'Client', commandText, commandTextRef, setCommandText, setSelectedStatus,
  });
  useCoachComposerDraft(activeThreadId, commandText, setCommandText, { actorId: 7, clientId });
  return { commandText, setCommandText };
}

describe('PROBE: cross-client draft isolation for new threads', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('does not surface client A\'s unsent draft in a new chat pinned to client B', () => {
    const { result, rerender } = renderHook(
      ({ clientId, threadId }) => useControllerLike(clientId, threadId),
      { initialProps: { clientId: 84 as number | null, threadId: null as number | null } },
    );

    // 1. Sensitive note typed for client A on an unsent new thread.
    act(() => { result.current.setCommandText(SENSITIVE); });
    act(() => { vi.advanceTimersByTime(500); });
    expect(window.sessionStorage.getItem(coachDraftKey('new', { actorId: 7, clientId: 84 }))).toBe(SENSITIVE);

    // 2. Open an existing thread for client B (key 'new' -> '91'; first write skipped).
    rerender({ clientId: 91, threadId: 91 });
    act(() => { vi.advanceTimersByTime(500); });

    // 3. Tap "New chat" while pinned to client B (key '91' -> 'new' -> restore fires).
    rerender({ clientId: 91, threadId: null });
    act(() => { vi.advanceTimersByTime(500); });

    // Client B's composer must NOT contain client A's note.
    expect(result.current.commandText).not.toBe(SENSITIVE);
  });
});
