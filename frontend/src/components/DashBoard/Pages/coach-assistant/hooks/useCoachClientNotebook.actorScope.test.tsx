/**
 * PROBE (rule 55) — Codex finding #1: the notebook draft store is not actor-scoped.
 *
 * `useCoachComposerDraft` was re-keyed to actor:client:thread in 448755211, but the OTHER
 * draft store in the same directory was never touched:
 *   useCoachClientNotebook.ts:17  NOTE_DRAFT_PREFIX = 'ss-coach-client-note-draft:'
 *   useCoachClientNotebook.ts:37  function draftKey(clientId: number)   // <- no actor
 *
 * sessionStorage is per-TAB, not per-identity, and the Coach surface is explicitly built for a
 * shared floor device. So staff user A's unsent note about a client survives into staff user B's
 * session in the same tab, and B can reload it by toggling notebook mode on the same client.
 *
 * Codex's own hostile review raised this as P1. This probe is the contract for the fix.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useState, useRef } from 'react';
import { useCoachClientNotebook } from './useCoachClientNotebook';

vi.mock('../../../../../services/api.service', () => ({ default: { post: vi.fn(), get: vi.fn() } }));

const PRIVATE_NOTE = 'flagged: recurring shoulder impingement, avoid overhead press';
const CLIENT = 84;

/** Mirrors the controller's composition, with the actor as a prop the way the page supplies it. */
function useNotebookLike(actorId: number | null, clientId: number | null) {
  const [commandText, setCommandText] = useState('');
  const [, setSelectedStatus] = useState('');
  const commandTextRef = useRef<HTMLTextAreaElement>(null);
  const notebook = useCoachClientNotebook({
    actorId,
    clientId,
    clientLabel: 'Client',
    commandText,
    commandTextRef,
    setCommandText,
    setSelectedStatus,
  });
  return { commandText, setCommandText, notebook };
}

describe('PROBE: notebook drafts must not cross staff identities in one tab', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it("does not reload staff A's client note into staff B's session", () => {
    // Staff A pins the client, turns notebook mode on, types a private note.
    const a = renderHook(({ actorId }) => useNotebookLike(actorId, CLIENT), {
      initialProps: { actorId: 7 as number | null },
    });
    act(() => { a.result.current.notebook.dockControls.onToggle(); });        // notebook ON for client 84
    act(() => { a.result.current.setCommandText(PRIVATE_NOTE); });
    act(() => { vi.advanceTimersByTime(600); });                 // persisted under A's key
    a.unmount();

    // Staff B signs in on the SAME device/tab (sessionStorage survives) and opens the same client.
    const b = renderHook(({ actorId }) => useNotebookLike(actorId, CLIENT), {
      initialProps: { actorId: 91 as number | null },
    });
    act(() => { b.result.current.notebook.dockControls.onToggle(); });        // notebook ON -> restores a draft

    expect(b.result.current.commandText).not.toBe(PRIVATE_NOTE);
  });

  it('still restores the SAME staff member their own draft', () => {
    const first = renderHook(({ actorId }) => useNotebookLike(actorId, CLIENT), {
      initialProps: { actorId: 7 as number | null },
    });
    act(() => { first.result.current.notebook.dockControls.onToggle(); });
    act(() => { first.result.current.setCommandText(PRIVATE_NOTE); });
    act(() => { vi.advanceTimersByTime(600); });
    first.unmount();

    const again = renderHook(({ actorId }) => useNotebookLike(actorId, CLIENT), {
      initialProps: { actorId: 7 as number | null },
    });
    act(() => { again.result.current.notebook.dockControls.onToggle(); });

    expect(again.result.current.commandText).toBe(PRIVATE_NOTE);
  });
});
