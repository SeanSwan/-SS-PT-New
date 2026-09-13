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
import { useCoachClientNotebook, coachNotebookDraftKey } from './useCoachClientNotebook';
import apiService from '../../../../../services/api.service';
import type { PublicationBinding, PublicationSnapshot } from '../../../../../hooks/coachPublicationScope';

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

/* ============================================================================
 * Plan 55 C4 (G04BC-R05, G04BC-T14) — the notebook is a WRITE lane to
 * `POST /api/notes/:clientId` plus a sessionStorage draft store. Both are
 * clinical, client-bound publications. While the mounted Coach has a live
 * publication binding that does NOT admit the current (actor, client) scope,
 * the notebook must not restore, persist, prefill or POST, and a completion
 * that lands after the admission retired must not publish.
 *
 * Every admission assertion below is paired with an ADMITTED control in the
 * same file, so a blanket deny cannot satisfy this describe block.
 * ========================================================================= */

const ADMITTED_ACTOR = 7;

function notebookSnapshot(overrides: Partial<PublicationSnapshot> = {}): PublicationSnapshot {
  return Object.freeze({
    actorId: ADMITTED_ACTOR,
    rawRole: 'trainer',
    audienceRole: 'client',
    generation: 1,
    targetUserId: CLIENT,
    threadId: 11,
    enabled: true,
    ...overrides,
  });
}

function liveBinding(getSnapshot: () => PublicationSnapshot | null): PublicationBinding {
  return { getSnapshot };
}

/** Mirrors the controller composition, with the admission binding injected. */
function useNotebookWithBinding(
  actorId: number | null,
  clientId: number | null,
  binding: PublicationBinding,
) {
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
    binding,
  });
  return { commandText, setCommandText, notebook };
}

const submitEvent = { preventDefault: vi.fn() } as unknown as Parameters<
  ReturnType<typeof useCoachClientNotebook>['handleSubmit']
>[0];

function renderNotebookWithBinding(live: { current: PublicationSnapshot | null }) {
  return renderHook(
    ({ tick }: { tick: number }) => {
      void tick;
      return useNotebookWithBinding(ADMITTED_ACTOR, CLIENT, liveBinding(() => live.current));
    },
    { initialProps: { tick: 0 } },
  );
}

describe('PLAN 55 C4: notebook writes obey the live publication admission', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
    vi.mocked(apiService.post).mockReset();
    vi.mocked(apiService.post).mockResolvedValue({ data: { success: true } } as never);
  });
  afterEach(() => vi.useRealTimers());

  it('refuses to POST a client note while the current selection is not admitted', async () => {
    const live = { current: notebookSnapshot({ enabled: false }) as PublicationSnapshot | null };
    const { result } = renderNotebookWithBinding(live);

    act(() => { result.current.notebook.dockControls.onToggle(); });
    act(() => { result.current.setCommandText(PRIVATE_NOTE); });
    await act(async () => { await result.current.notebook.handleSubmit(submitEvent); });

    expect(vi.mocked(apiService.post)).not.toHaveBeenCalled();
  });

  it('CONTROL: still POSTs the same note when the selection IS admitted', async () => {
    const live = { current: notebookSnapshot() as PublicationSnapshot | null };
    const { result } = renderNotebookWithBinding(live);

    act(() => { result.current.notebook.dockControls.onToggle(); });
    act(() => { result.current.setCommandText(PRIVATE_NOTE); });
    await act(async () => { await result.current.notebook.handleSubmit(submitEvent); });

    expect(vi.mocked(apiService.post)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(apiService.post).mock.calls[0][0]).toBe(`/api/notes/${CLIENT}`);
  });

  it('does not prefill the composer from the tab store while the selection is not admitted', () => {
    window.sessionStorage.setItem(coachNotebookDraftKey(ADMITTED_ACTOR, CLIENT), PRIVATE_NOTE);
    const live = { current: notebookSnapshot({ enabled: false }) as PublicationSnapshot | null };
    const { result } = renderNotebookWithBinding(live);

    act(() => { result.current.notebook.dockControls.onToggle(); });

    expect(result.current.commandText).toBe('');
  });

  it('CONTROL: prefills the same stored draft when the selection IS admitted', () => {
    window.sessionStorage.setItem(coachNotebookDraftKey(ADMITTED_ACTOR, CLIENT), PRIVATE_NOTE);
    const live = { current: notebookSnapshot() as PublicationSnapshot | null };
    const { result } = renderNotebookWithBinding(live);

    act(() => { result.current.notebook.dockControls.onToggle(); });

    expect(result.current.commandText).toBe(PRIVATE_NOTE);
  });

  it('stops persisting the composer once the selection stops being admitted', () => {
    const live = { current: notebookSnapshot() as PublicationSnapshot | null };
    const { result, rerender } = renderNotebookWithBinding(live);

    act(() => { result.current.notebook.dockControls.onToggle(); });
    act(() => { result.current.setCommandText(PRIVATE_NOTE); });
    expect(window.sessionStorage.getItem(coachNotebookDraftKey(ADMITTED_ACTOR, CLIENT))).toBe(PRIVATE_NOTE);

    // A candidate selection arrives: the mounted binding stops admitting this scope.
    live.current = notebookSnapshot({ generation: 2, enabled: false });
    rerender({ tick: 1 });
    act(() => { result.current.setCommandText(`${PRIVATE_NOTE} + late addition`); });
    act(() => { vi.advanceTimersByTime(600); });

    expect(window.sessionStorage.getItem(coachNotebookDraftKey(ADMITTED_ACTOR, CLIENT))).toBe(PRIVATE_NOTE);
  });

  it('CONTROL: keeps persisting while the same scope stays admitted across a rerender', () => {
    const live = { current: notebookSnapshot() as PublicationSnapshot | null };
    const { result, rerender } = renderNotebookWithBinding(live);

    act(() => { result.current.notebook.dockControls.onToggle(); });
    act(() => { result.current.setCommandText(PRIVATE_NOTE); });

    live.current = notebookSnapshot({ generation: 2 });
    rerender({ tick: 1 });
    act(() => { result.current.setCommandText(`${PRIVATE_NOTE} + more`); });
    act(() => { vi.advanceTimersByTime(600); });

    expect(window.sessionStorage.getItem(coachNotebookDraftKey(ADMITTED_ACTOR, CLIENT)))
      .toBe(`${PRIVATE_NOTE} + more`);
  });

  it('a save completing after its admission retired cannot clear the newer draft or composer', async () => {
    const live = { current: notebookSnapshot() as PublicationSnapshot | null };
    let resolvePost: (value: unknown) => void = () => undefined;
    vi.mocked(apiService.post).mockReturnValue(new Promise((resolve) => { resolvePost = resolve; }) as never);

    const { result, rerender } = renderNotebookWithBinding(live);
    act(() => { result.current.notebook.dockControls.onToggle(); });
    act(() => { result.current.setCommandText('first note'); });

    let inFlight: Promise<void> = Promise.resolve();
    act(() => { inFlight = result.current.notebook.handleSubmit(submitEvent); });
    expect(vi.mocked(apiService.post)).toHaveBeenCalledTimes(1);

    // Same actor and same client, but a NEW admission generation: the old save
    // belongs to a publication that no longer exists.
    live.current = notebookSnapshot({ generation: 2 });
    rerender({ tick: 1 });
    act(() => { result.current.setCommandText('second note'); });
    expect(window.sessionStorage.getItem(coachNotebookDraftKey(ADMITTED_ACTOR, CLIENT))).toBe('second note');

    await act(async () => { resolvePost({ data: { success: true } }); await inFlight; });

    expect(result.current.commandText).toBe('second note');
    expect(window.sessionStorage.getItem(coachNotebookDraftKey(ADMITTED_ACTOR, CLIENT))).toBe('second note');
  });

  it('CONTROL: a save that is still current still clears the composer and its stored draft', async () => {
    const live = { current: notebookSnapshot() as PublicationSnapshot | null };
    let resolvePost: (value: unknown) => void = () => undefined;
    vi.mocked(apiService.post).mockReturnValue(new Promise((resolve) => { resolvePost = resolve; }) as never);

    const { result } = renderNotebookWithBinding(live);
    act(() => { result.current.notebook.dockControls.onToggle(); });
    act(() => { result.current.setCommandText('first note'); });

    let inFlight: Promise<void> = Promise.resolve();
    act(() => { inFlight = result.current.notebook.handleSubmit(submitEvent); });

    await act(async () => { resolvePost({ data: { success: true } }); await inFlight; });

    expect(result.current.commandText).toBe('');
    expect(window.sessionStorage.getItem(coachNotebookDraftKey(ADMITTED_ACTOR, CLIENT))).toBeNull();
  });
});
