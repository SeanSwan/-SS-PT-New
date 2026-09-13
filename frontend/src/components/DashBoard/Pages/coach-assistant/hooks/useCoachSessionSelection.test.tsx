/**
 * ============================================================================
 * FILE: useCoachSessionSelection.test.tsx
 * PURPOSE: Plan 55 §3 C2 / plan 63 §6 — the pure contract, admission, the
 *          one-use commit, and the NEGATIVE CONTROL matrix.
 * ============================================================================
 * Real plan 51 owner + real plan 61 provider; mocked auth/roster/target-access
 * only. See `useCoachSessionSelection.ownerBranches.test.tsx` for the plan 51
 * branch matrix, and `useCoachSessionSelection.testHarness.tsx` for the fixture.
 */
import { act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
// The harness MUST be evaluated before any module that pulls in AuthContext: its
// hoisted `vi.mock` calls have to be registered first (the original single-file
// suite got that for free from file-level hoisting).
import {
  OBSERVATION,
  apiGetMock,
  authHolder,
  httpError,
  probeElement,
  receipt,
  renderProbe,
  seedDirtyDraft,
  sel,
  type Adapter,
} from './useCoachSessionSelection.testHarness';
import {
  COACH_TARGET_ACCESS_PATH,
  isCoachTargetAccessReceipt,
  parseSelectionQuery,
} from './useCoachSessionSelection';

afterEach(() => { vi.clearAllTimers(); });

describe('useCoachSessionSelection — pure contract', () => {
  it('rejects a duplicate clientId/threadId raw query instead of picking one', () => {
    expect(parseSelectionQuery('?clientId=42&clientId=43')).toMatchObject({ ok: false });
    expect(parseSelectionQuery('?threadId=9&threadId=9')).toMatchObject({ ok: false });
    expect(parseSelectionQuery('?clientId=042')).toMatchObject({ ok: false });
    expect(parseSelectionQuery('?clientId=42&threadId=9')).toMatchObject({ ok: true, targetUserId: 42, conversationId: 9 });
  });

  it('refuses a receipt with a missing key or a mismatched actor/role/target', () => {
    const request = { actorId: 7, rawRole: 'trainer', targetUserId: 42 };
    expect(isCoachTargetAccessReceipt(receipt().data, request)).toBe(true);
    const missing = receipt(); delete (missing.data.access as Record<string, unknown>).conversationId;
    expect(isCoachTargetAccessReceipt(missing.data, request)).toBe(false);
    expect(isCoachTargetAccessReceipt(receipt({ actorUserId: 9 }).data, request)).toBe(false);
    expect(isCoachTargetAccessReceipt(receipt({ actorRole: 'admin' }).data, request)).toBe(false);
    expect(isCoachTargetAccessReceipt(receipt({}, 43).data, request)).toBe(false);
    expect(isCoachTargetAccessReceipt(receipt({ scope: 'coach_target_write' }).data, request)).toBe(false);
  });
});

describe('useCoachSessionSelection — admission and the one-use commit', () => {
  it('publishes nothing until the commit is consumed AND acknowledged', async () => {
    renderProbe();
    expect(sel.adapter!.publicationBinding.getSnapshot()).toBeNull();

    let outcome: Awaited<ReturnType<Adapter['requestSelection']>> | null = null;
    await act(async () => { outcome = await sel.adapter!.requestSelection({ targetUserId: 42, origin: 'picker' }); });
    expect(outcome).toMatchObject({ status: 'accepted' });
    expect(apiGetMock).toHaveBeenCalledTimes(1);
    expect(apiGetMock.mock.calls[0][0]).toBe(COACH_TARGET_ACCESS_PATH);
    expect(apiGetMock.mock.calls[0][1].params).toMatchObject({ targetUserId: '42', audienceRole: 'trainer' });

    // Checked is not admitted: the publication stays masked until ack.
    expect(sel.adapter!.publicationBinding.getSnapshot()).toBeNull();
    const commitId = sel.adapter!.instructions!.commitId;

    let consumed: ReturnType<Adapter['consumeCommit']> = null;
    act(() => { consumed = sel.adapter!.consumeCommit(commitId); });
    expect(consumed).toMatchObject({ commitId, kind: 'admit', targetUserId: 42, pinCommitted: true });
    expect(sel.reference!.pinnedClientId).toBe(42);
    expect(sel.adapter!.publicationBinding.getSnapshot()).toBeNull();

    // ONE USE. A second consume of the same ticket mutates nothing.
    act(() => { expect(sel.adapter!.consumeCommit(commitId)).toBeNull(); });

    let acked = false;
    act(() => { acked = sel.adapter!.ackCommit(commitId, { targetUserId: 42, threadId: null }); });
    expect(acked).toBe(true);
    expect(sel.adapter!.phase).toBe('ready');
    expect(sel.adapter!.publicationBinding.getSnapshot()).toMatchObject({
      actorId: 7, rawRole: 'trainer', audienceRole: 'trainer', targetUserId: 42, threadId: null, enabled: true,
    });
  });

  it('consumes the commit in the SAME tick the request resolved', async () => {
    renderProbe();
    await act(async () => { await sel.adapter!.requestSelection({ targetUserId: 42, origin: 'picker' }); });
    const commitId = sel.adapter!.instructions!.commitId;
    // No intervening render/state flush: the ticket must already be live.
    let consumed: ReturnType<Adapter['consumeCommit']> = null;
    act(() => { consumed = sel.adapter!.consumeCommit(commitId); });
    expect(consumed).not.toBeNull();
  });

  it('treats an explicit null candidate as the unscoped lane and omits the query param', async () => {
    apiGetMock.mockResolvedValue(receipt({}, null));
    renderProbe();
    await act(async () => { await sel.adapter!.requestSelection({ targetUserId: null, origin: 'clear' }); });
    expect(apiGetMock.mock.calls[0][1].params).not.toHaveProperty('targetUserId');
    const commitId = sel.adapter!.instructions!.commitId;
    act(() => { sel.adapter!.consumeCommit(commitId); });
    act(() => { sel.adapter!.ackCommit(commitId, { targetUserId: null, threadId: null }); });
    expect(sel.adapter!.publicationBinding.getSnapshot()).toMatchObject({ targetUserId: null, enabled: true });
  });

  it('refuses stale / malformed candidate ids without issuing a request', async () => {
    renderProbe();
    for (const bad of ['042', 4.5, -1, 0, 'abc', true]) {
      let outcome: Awaited<ReturnType<Adapter['requestSelection']>> | null = null;
      await act(async () => { outcome = await sel.adapter!.requestSelection({ targetUserId: bad, origin: 'picker' }); });
      expect(outcome).toMatchObject({ status: 'invalid' });
    }
    expect(apiGetMock).not.toHaveBeenCalled();
  });
});

describe('useCoachSessionSelection — NEGATIVE CONTROLS', () => {
  it('an UNADMITTED selection is never committed', async () => {
    apiGetMock.mockRejectedValue(httpError(403));
    renderProbe();
    let outcome: Awaited<ReturnType<Adapter['requestSelection']>> | null = null;
    await act(async () => { outcome = await sel.adapter!.requestSelection({ targetUserId: 42, origin: 'picker' }); });
    expect(outcome).toMatchObject({ status: 'denied' });
    expect(sel.adapter!.phase).toBe('denied');
    expect(sel.adapter!.instructions).toBeNull();
    expect(sel.adapter!.publicationBinding.getSnapshot()).toBeNull();
    expect(sel.reference!.pinnedClientId).toBeNull();
    // No ticket exists, so no commit id can ever be consumed.
    act(() => { expect(sel.adapter!.consumeCommit('sel-made-up')).toBeNull(); });
    act(() => { expect(sel.adapter!.ackCommit('sel-made-up', { targetUserId: 42, threadId: null })).toBe(false); });
    expect(sel.reference!.pinnedClientId).toBeNull();
  });

  it('a STALE generation cannot commit, even when its HTTP response succeeds', async () => {
    let releaseFirst: ((value: unknown) => void) | null = null;
    apiGetMock.mockImplementationOnce(() => new Promise((resolve) => { releaseFirst = resolve; }));
    renderProbe();

    let first: Promise<unknown> | null = null;
    act(() => { first = sel.adapter!.requestSelection({ targetUserId: 43, origin: 'picker' }); });
    // Second request for a DIFFERENT target supersedes the first.
    await act(async () => { await sel.adapter!.requestSelection({ targetUserId: 51, origin: 'picker' }); });
    expect(sel.adapter!.phase).toBe('committing');
    const committedId = sel.adapter!.instructions!.commitId;
    expect(sel.adapter!.instructions!.targetUserId).toBe(51);
    // The superseded first response now lands — successfully, for target 43.
    await act(async () => { releaseFirst!(receipt({}, 43)); await first; });
    expect(sel.adapter!.instructions!.commitId).toBe(committedId);
    expect(sel.adapter!.instructions!.targetUserId).toBe(51);
    expect(sel.adapter!.phase).toBe('committing');
    act(() => { sel.adapter!.consumeCommit(committedId); });
    act(() => { sel.adapter!.ackCommit(committedId, { targetUserId: 51, threadId: null }); });
    expect(sel.adapter!.publicationBinding.getSnapshot()).toMatchObject({ targetUserId: 51 });
    expect(sel.reference!.pinnedClientId).toBe(51);
  });

  it('an A-B-A actor change does NOT revive a pending decision, and the old ticket is dead', async () => {
    const view = renderProbe();
    seedDirtyDraft(42);
    let outcome: Awaited<ReturnType<Adapter['requestSelection']>> | null = null;
    await act(async () => { outcome = await sel.adapter!.requestSelection({ targetUserId: 43, origin: 'picker' }); });
    expect(outcome).toMatchObject({ status: 'decision' });
    const staleCommitId = sel.adapter!.instructions!.commitId;
    const staleRequestId = sel.adapter!.pending!.requestId;
    const staleScope = sel.adapter!.pending!.scopeToken;

    // Actor A -> Actor B.
    authHolder.user = { id: 9, role: 'trainer' };
    await act(async () => { view.rerender(probeElement({ actorId: 9, rawRole: 'trainer', observation: OBSERVATION })); });
    // Actor B is a valid staff actor with NO admission of its own: 'unadmitted'
    // (not 'retired'), and emphatically not A's pending decision.
    expect(sel.adapter!.phase).toBe('unadmitted');
    expect(sel.adapter!.pending).toBeNull();
    expect(sel.adapter!.instructions).toBeNull();
    expect(sel.adapter!.publicationBinding.getSnapshot()).toBeNull();
    act(() => { expect(sel.adapter!.consumeCommit(staleCommitId)).toBeNull(); });
    act(() => { expect(sel.adapter!.ackCommit(staleCommitId, { targetUserId: 43, threadId: null })).toBe(false); });

    // Actor B -> Actor A again. The FIRST A's decision must not come back.
    authHolder.user = { id: 7, role: 'trainer' };
    await act(async () => { view.rerender(probeElement({ actorId: 7, rawRole: 'trainer', observation: OBSERVATION })); });
    expect(sel.adapter!.phase).toBe('unadmitted');
    expect(sel.adapter!.pending).toBeNull();
    expect(sel.adapter!.publicationBinding.getSnapshot()).toBeNull();
    act(() => { expect(sel.adapter!.consumeCommit(staleCommitId)).toBeNull(); });
    let decided: Awaited<ReturnType<Adapter['decide']>> | null = null;
    await act(async () => { decided = await sel.adapter!.decide(staleScope, staleRequestId, 'discard'); });
    expect(decided).toMatchObject({ status: 'invalid' });
  });

  it('a raw client/user/unknown actor never reaches the staff endpoint', async () => {
    for (const role of ['client', 'user', 'ghost']) {
      apiGetMock.mockClear();
      const view = renderProbe(7, role);
      let outcome: Awaited<ReturnType<Adapter['requestSelection']>> | null = null;
      await act(async () => { outcome = await sel.adapter!.requestSelection({ targetUserId: 42, origin: 'picker' }); });
      expect(outcome).toMatchObject({ status: 'retired' });
      expect(sel.adapter!.phase).toBe('retired');
      expect(sel.adapter!.publicationBinding.getSnapshot()).toBeNull();
      expect(apiGetMock).not.toHaveBeenCalled();
      view.unmount();
    }
  });

  it('a mismatched receipt (wrong actor role) is refused, not admitted', async () => {
    apiGetMock.mockResolvedValue(receipt({ actorRole: 'admin' }));
    renderProbe();
    let outcome: Awaited<ReturnType<Adapter['requestSelection']>> | null = null;
    await act(async () => { outcome = await sel.adapter!.requestSelection({ targetUserId: 42, origin: 'picker' }); });
    expect(outcome).toMatchObject({ status: 'unavailable', reason: 'RECEIPT_MISMATCH' });
    expect(sel.adapter!.instructions).toBeNull();
    expect(sel.reference!.pinnedClientId).toBeNull();
  });

  it('a wrong acknowledgment does not enable the publication', async () => {
    renderProbe();
    await act(async () => { await sel.adapter!.requestSelection({ targetUserId: 42, origin: 'picker' }); });
    const commitId = sel.adapter!.instructions!.commitId;
    act(() => { sel.adapter!.consumeCommit(commitId); });
    let acked = true;
    act(() => { acked = sel.adapter!.ackCommit(commitId, { targetUserId: 43, threadId: null }); });
    expect(acked).toBe(false);
    expect(sel.adapter!.publicationBinding.getSnapshot()).toBeNull();
    expect(sel.adapter!.phase).toBe('unavailable');
  });
});
