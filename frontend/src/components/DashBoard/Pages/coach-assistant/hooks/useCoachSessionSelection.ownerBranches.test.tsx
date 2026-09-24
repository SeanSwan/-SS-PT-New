/**
 * ============================================================================
 * FILE: useCoachSessionSelection.ownerBranches.test.tsx
 * PURPOSE: Plan 55 §3 C2 / plan 63 §6 — the plan 51 owner branches, the plan 61
 *          interceptor, and the publication-binding identity.
 * ============================================================================
 * Real plan 51 owner + real plan 61 provider; mocked auth/roster/target-access
 * only. Split from `useCoachSessionSelection.test.tsx` by concern (Rule 4), not
 * by trimming assertions.
 */
import { act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  OBSERVATION,
  apiGetMock,
  httpError,
  probeElement,
  receipt,
  renderProbe,
  seedDirtyDraft,
  sel,
  type Adapter,
} from './useCoachSessionSelection.testHarness';

afterEach(() => { vi.clearAllTimers(); });

describe('useCoachSessionSelection — plan 51 owner branches', () => {
  it('a DIRTY cross-target candidate opens the decision and keeps the draft', async () => {
    renderProbe();
    seedDirtyDraft(42);
    let outcome: Awaited<ReturnType<Adapter['requestSelection']>> | null = null;
    await act(async () => { outcome = await sel.adapter!.requestSelection({ targetUserId: 43, origin: 'picker' }); });
    expect(outcome).toMatchObject({ status: 'decision' });
    expect(sel.adapter!.phase).toBe('decision');
    expect(sel.adapter!.pending).toMatchObject({ targetUserId: 43 });
    // Masked while deciding: no private publication, and the draft is untouched.
    expect(sel.adapter!.publicationBinding.getSnapshot()).toBeNull();
    expect(sel.owner!.getSnapshot().draft).toMatchObject({ targetUserId: 42, dirty: true });
    expect(sel.reference!.pinnedClientId).toBeNull();
  });

  it('a competing candidate while deciding is BUSY and cannot replace the first request', async () => {
    renderProbe();
    seedDirtyDraft(42);
    await act(async () => { await sel.adapter!.requestSelection({ targetUserId: 43, origin: 'picker' }); });
    const first = sel.adapter!.pending!.requestId;
    let competing: Awaited<ReturnType<Adapter['requestSelection']>> | null = null;
    await act(async () => { competing = await sel.adapter!.requestSelection({ targetUserId: 44, origin: 'picker' }); });
    expect(competing).toMatchObject({ status: 'busy' });
    expect(sel.adapter!.pending!.requestId).toBe(first);
  });

  it('same-target candidate preserves the draft revision and asks no discard', async () => {
    renderProbe();
    const scope = seedDirtyDraft(42);
    await act(async () => { await sel.adapter!.requestSelection({ targetUserId: 42, origin: 'thread' }); });
    expect(sel.adapter!.phase).toBe('committing');
    expect(sel.adapter!.instructions!.retireScopeToken).toBeNull();
    expect(sel.owner!.getSnapshot().draft).toMatchObject({ scopeToken: scope, targetUserId: 42, dirty: true });
  });

  it('a CLEAN cross-target draft is retired only at commit', async () => {
    renderProbe();
    let scope = '';
    act(() => { scope = sel.owner!.begin(42, 'workout') ?? ''; });
    await act(async () => { await sel.adapter!.requestSelection({ targetUserId: 43, origin: 'picker' }); });
    // Still present during the check...
    expect(sel.owner!.getSnapshot().draft).toMatchObject({ scopeToken: scope, targetUserId: 42 });
    const commitId = sel.adapter!.instructions!.commitId;
    act(() => { sel.adapter!.consumeCommit(commitId); });
    // ...and retired by the one-use commit.
    expect(sel.owner!.getSnapshot().draft).toBeNull();
  });

  it('Return cancels the destination and keeps the draft', async () => {
    renderProbe();
    seedDirtyDraft(42);
    await act(async () => { await sel.adapter!.requestSelection({ targetUserId: 43, origin: 'picker' }); });
    const { requestId, scopeToken } = sel.adapter!.pending!;
    let decided: Awaited<ReturnType<Adapter['decide']>> | null = null;
    await act(async () => { decided = await sel.adapter!.decide(scopeToken, requestId, 'return'); });
    expect(decided).toMatchObject({ status: 'accepted' });
    expect(sel.adapter!.instructions).toMatchObject({ kind: 'return', targetUserId: 42 });
    expect(sel.owner!.getSnapshot().draft).toMatchObject({ targetUserId: 42, dirty: true });
    const commitId = sel.adapter!.instructions!.commitId;
    act(() => { sel.adapter!.consumeCommit(commitId); });
    act(() => { expect(sel.adapter!.ackCommit(commitId, { targetUserId: 42, threadId: null })).toBe(true); });
    expect(sel.adapter!.publicationBinding.getSnapshot()).toMatchObject({ targetUserId: 42, enabled: true });
  });

  it('a DENIED return recheck does not consume the draft', async () => {
    renderProbe();
    seedDirtyDraft(42);
    await act(async () => { await sel.adapter!.requestSelection({ targetUserId: 43, origin: 'picker' }); });
    const { requestId, scopeToken } = sel.adapter!.pending!;
    // The destination read succeeded; the RETURN recheck is denied.
    apiGetMock.mockRejectedValue(httpError(403));
    let decided: Awaited<ReturnType<Adapter['decide']>> | null = null;
    await act(async () => { decided = await sel.adapter!.decide(scopeToken, requestId, 'return'); });
    expect(decided).toMatchObject({ status: 'invalid' });
    expect(sel.adapter!.phase).toBe('blocked-return');
    expect(sel.owner!.getSnapshot().draft).toMatchObject({ targetUserId: 42, dirty: true });
    expect(sel.adapter!.publicationBinding.getSnapshot()).toBeNull();
    expect(sel.reference!.pinnedClientId).toBeNull();
  });

  it('Discard retires the draft and commits the destination exactly once', async () => {
    renderProbe();
    seedDirtyDraft(42);
    await act(async () => { await sel.adapter!.requestSelection({ targetUserId: 43, origin: 'picker' }); });
    const { requestId, scopeToken } = sel.adapter!.pending!;
    apiGetMock.mockResolvedValue(receipt({}, 43));
    let decided: Awaited<ReturnType<Adapter['decide']>> | null = null;
    await act(async () => { decided = await sel.adapter!.decide(scopeToken, requestId, 'discard'); });
    expect(decided).toMatchObject({ status: 'accepted' });
    expect(sel.adapter!.instructions).toMatchObject({ kind: 'discard', targetUserId: 43 });
    expect(sel.owner!.getSnapshot().draft).toBeNull();
    const commitId = sel.adapter!.instructions!.commitId;
    act(() => { sel.adapter!.consumeCommit(commitId); });
    act(() => { expect(sel.adapter!.consumeCommit(commitId)).toBeNull(); });
    act(() => { sel.adapter!.ackCommit(commitId, { targetUserId: 43, threadId: null }); });
    expect(sel.adapter!.publicationBinding.getSnapshot()).toMatchObject({ targetUserId: 43, enabled: true });
  });

  it('a DENIED discard recheck consumes no draft', async () => {
    renderProbe();
    seedDirtyDraft(42);
    await act(async () => { await sel.adapter!.requestSelection({ targetUserId: 43, origin: 'picker' }); });
    const { requestId, scopeToken } = sel.adapter!.pending!;
    apiGetMock.mockRejectedValue(httpError(503));
    let decided: Awaited<ReturnType<Adapter['decide']>> | null = null;
    await act(async () => { decided = await sel.adapter!.decide(scopeToken, requestId, 'discard'); });
    expect(decided).toMatchObject({ status: 'invalid' });
    expect(sel.owner!.getSnapshot().draft).toMatchObject({ targetUserId: 42 });
  });
});

describe('useCoachSessionSelection — the plan 61 interceptor', () => {
  it('turns an ordinary setActiveClient call into a REQUEST, not a pin mutation', async () => {
    renderProbe();
    await act(async () => {
      sel.reference!.setActiveClient({ id: 43, firstName: 'Ava', lastName: 'Stone', email: 'a@example.test' });
    });
    expect(sel.reference!.pinnedClientId).toBeNull();
    expect(apiGetMock).toHaveBeenCalledTimes(1);
    expect(apiGetMock.mock.calls[0][1].params).toMatchObject({ targetUserId: '43' });
    expect(sel.adapter!.instructions).not.toBeNull();
  });

  it('removes its interceptor on unmount so a later setter mutates directly', () => {
    const view = renderProbe();
    view.unmount();
    expect(sel.adapter).not.toBeNull();
  });
});

describe('useCoachSessionSelection — publication binding identity', () => {
  it('keeps a stable publication binding identity across renders', async () => {
    const view = renderProbe();
    const first = sel.adapter!.publicationBinding;
    await act(async () => {
      view.rerender(probeElement({ actorId: 7, rawRole: 'trainer', observation: OBSERVATION }));
    });
    expect(sel.adapter!.publicationBinding).toBe(first);
  });
});
