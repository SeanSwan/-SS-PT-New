/**
 * PROBE (rule 55) — v2 batch cross-feature collision: P1.4 drafts vs P2.3 client rebind.
 *
 * CoachCommandCenter.controller.ts mounts BOTH hooks over the SAME commandText state:
 *   :174  useCoachClientNotebook({ clientId: effectiveClientId, ..., setCommandText })
 *   :177  useCoachComposerDraft(activeThreadId, commandText, setCommandText)
 *
 * The regression occurred when client rebinding cleared the shared composer and the
 * draft writer then deleted the prior client's stored draft. This probe mirrors the
 * real controller composition so the two hooks cannot silently collide again.
 *
 * EXPECTED (the product contract P1.4 claims): "A trainer interrupted mid-dictation
 * must not lose their words." Rebinding the pinned client is an interruption, not a send.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useState, useRef } from 'react';
import { useCoachComposerDraft, coachDraftKey } from './useCoachComposerDraft';
import { useCoachClientNotebook } from './useCoachClientNotebook';

vi.mock('../../../../../services/api.service', () => ({ default: { post: vi.fn(), get: vi.fn() } }));

/** Mirror of the controller's hook composition (lines 174 + 177). */
function useControllerLike(clientId: number | null, activeThreadId: number | null) {
  const [commandText, setCommandText] = useState('');
  const [, setSelectedStatus] = useState('');
  const commandTextRef = useRef<HTMLTextAreaElement>(null);

  useCoachClientNotebook({
    clientId,
    clientLabel: 'Client',
    commandText,
    commandTextRef,
    setCommandText,
    setSelectedStatus,
  });
  useCoachComposerDraft(activeThreadId, commandText, setCommandText, { actorId: 7, clientId });

  return { commandText, setCommandText };
}

describe('PROBE: P1.4 draft isolation across a P2.3 client rebind', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('preserves the original client draft without restoring it into the rebound client', () => {
    // Trainer is on an unsent new thread (activeThreadId=null -> key "new"), pinned to client 84.
    const { result, rerender } = renderHook(
      ({ clientId }) => useControllerLike(clientId, null),
      { initialProps: { clientId: 84 as number | null } },
    );

    // Dictates a note.
    act(() => { result.current.setCommandText('logged 3x12 goblet squat, form broke down on rep 8'); });
    act(() => { vi.advanceTimersByTime(500); });

    expect(window.sessionStorage.getItem(coachDraftKey('new', { actorId: 7, clientId: 84 })))
      .toBe('logged 3x12 goblet squat, form broke down on rep 8');

    // Taps a P2.3 recent-client chip -> rebinds to client 91. This is an interruption,
    // NOT a send. The original scoped draft must survive without leaking into client 91.
    rerender({ clientId: 91 });
    act(() => { vi.advanceTimersByTime(500); });

    expect(window.sessionStorage.getItem(coachDraftKey('new', { actorId: 7, clientId: 84 })))
      .toBe('logged 3x12 goblet squat, form broke down on rep 8');
    expect(window.sessionStorage.getItem(coachDraftKey('new', { actorId: 7, clientId: 91 }))).toBeNull();
    expect(result.current.commandText).toBe('');
  });
});
