/**
 * HOSTILE ROUND 1 — the two draft stores, COMPOSED (the thing no unit test covered).
 *
 * The whole v2 draft bug class exists because every feature was unit-tested in ISOLATION
 * while the real controller mounts BOTH stores over ONE `commandText`:
 *     controller.ts:174  useCoachClientNotebook({ actorId, clientId, ..., setCommandText })
 *     controller.ts:177  useCoachComposerDraft(activeThreadId, commandText, setCommandText,
 *                                              { actorId, clientId })
 *
 * Codex's finding #1 named the second half of this explicitly: "while notebook mode is active,
 * changing activeThreadId changes the composer key; useCoachComposerDraft restores the other
 * thread into the shared commandText, then the notebook write effect sees the changed or empty
 * text and can remove the notebook draft."
 *
 * These assert the composed contract. If they pass, both stores are actor-scoped AND they do not
 * corrupt each other.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useState, useRef } from 'react';
import { useCoachClientNotebook } from './useCoachClientNotebook';
import { useCoachComposerDraft, coachDraftKey } from './useCoachComposerDraft';

vi.mock('../../../../../services/api.service', () => ({ default: { post: vi.fn(), get: vi.fn() } }));

const NOTE = 'shoulder impingement flare, drop overhead work this week';
const CHAT = 'log 3x12 goblet squat at 40lb';

/** Faithful mirror of controller.ts:174 + :177. */
function useControllerLike(actorId: number | null, clientId: number | null, threadId: number | null) {
  const [commandText, setCommandText] = useState('');
  const [, setSelectedStatus] = useState('');
  const commandTextRef = useRef<HTMLTextAreaElement>(null);
  const notebook = useCoachClientNotebook({
    actorId, clientId, clientLabel: 'Client', commandText, commandTextRef, setCommandText, setSelectedStatus,
  });
  useCoachComposerDraft(threadId, commandText, setCommandText, { actorId, clientId },
    !notebook.dockControls.active);
  return { commandText, setCommandText, notebook };
}

describe('HOSTILE: both draft stores mounted together', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('neither store leaks across staff identities in the same tab', () => {
    const a = renderHook(({ actorId }) => useControllerLike(actorId, 84, null), {
      initialProps: { actorId: 7 as number | null },
    });
    act(() => { a.result.current.setCommandText(CHAT); });   // composer draft, notebook OFF
    act(() => { vi.advanceTimersByTime(600); });
    a.unmount();

    const b = renderHook(({ actorId }) => useControllerLike(actorId, 84, null), {
      initialProps: { actorId: 91 as number | null },
    });
    act(() => { vi.advanceTimersByTime(600); });
    expect(b.result.current.commandText).not.toBe(CHAT);
  });

  it('a thread switch while notebook mode is ACTIVE does not destroy the notebook draft', () => {
    const { result, rerender } = renderHook(
      ({ threadId }) => useControllerLike(7, 84, threadId),
      { initialProps: { threadId: null as number | null } },
    );
    act(() => { result.current.notebook.dockControls.onToggle(); }); // notebook ON
    act(() => { result.current.setCommandText(NOTE); });
    act(() => { vi.advanceTimersByTime(600); });

    // Composer key flips underneath notebook mode.
    rerender({ threadId: 55 });
    act(() => { vi.advanceTimersByTime(600); });

    // The trainer's clinical note must still be retrievable for this actor+client.
    expect(window.sessionStorage.getItem('ss-coach-client-note-draft:7:84')).toBe(NOTE);
  });

  it('the two stores use distinct, actor-scoped keys (no collision)', () => {
    const { result } = renderHook(() => useControllerLike(7, 84, null));
    act(() => { result.current.setCommandText(CHAT); });
    act(() => { vi.advanceTimersByTime(600); });

    // Composer store: actor:client:thread
    expect(window.sessionStorage.getItem(coachDraftKey('new', { actorId: 7, clientId: 84 }))).toBe(CHAT);
    // Notebook store is a different namespace and must not have been written (notebook OFF).
    expect(window.sessionStorage.getItem('ss-coach-client-note-draft:7:84')).toBeNull();
  });
});
