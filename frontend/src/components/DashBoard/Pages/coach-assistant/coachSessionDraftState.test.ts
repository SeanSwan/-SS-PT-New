import { describe, expect, it } from 'vitest';
import { beginDraft, createInitialDraftState, editDraft, freezeForSubmit, rememberSelection, requestTargetChange, resolveTargetChange } from './coachSessionDraftState';

const ids = (() => { let index = 0; return () => `00000000-0000-4000-8000-${String(++index).padStart(12, '0')}`; })();

describe('CoachSessionDraft state owner', () => {
  it('requires positive actor and target IDs', () => {
    expect(beginDraft(createInitialDraftState('0', 'trainer'), 4, 'workout', ids)).toMatchObject({ ok: false, code: 'NO_ACTOR' });
    expect(beginDraft(createInitialDraftState('42', 'trainer'), 0, 'workout', ids)).toMatchObject({ ok: false, code: 'INVALID_TARGET' });
  });

  it('shares one revision and rejects stale writes', () => {
    const started = beginDraft(createInitialDraftState('42', 'trainer'), 7, 'talk', ids);
    if (!started.ok) throw new Error('expected task');
    const edited = editDraft(started.state, started.scopeToken, 0, { content: { title: 'Upper body' } }, ids);
    expect(edited.ok).toBe(true);
    if (!edited.ok) return;
    expect(edited.draft.revision).toBe(1);
    expect(editDraft(edited.state, started.scopeToken, 0, { content: { title: 'stale' } }, ids)).toMatchObject({ ok: false, code: 'STALE_REVISION' });
  });

  it('freezes an immutable snapshot with a stable retry identity', () => {
    const started = beginDraft(createInitialDraftState('42', 'trainer'), 7, 'workout', ids);
    if (!started.ok) throw new Error('expected task');
    const edited = editDraft(started.state, started.scopeToken, 0, { content: { sets: [{ reps: 8, weight: 100 }] } }, ids);
    if (!edited.ok) throw new Error('expected edit');
    const frozen = freezeForSubmit(edited.state, started.scopeToken, 1, ids);
    expect(frozen.ok).toBe(true);
    if (!frozen.ok) return;
    expect(frozen.submitted.submittedRevision).toBe(1);
    expect(frozen.submitted.snapshot.taskId).toBe(edited.draft.taskId);
    expect(Object.isFrozen(frozen.submitted.snapshot)).toBe(true);
    expect(Object.isFrozen(frozen.submitted.snapshot.content)).toBe(true);
    expect(frozen.state.draft?.dirty).toBe(true);
  });

  it('models target Return and Discard without cancelling server work', () => {
    const started = beginDraft(createInitialDraftState('42', 'trainer'), 7, 'workout', ids);
    if (!started.ok) throw new Error('expected task');
    const requested = requestTargetChange(started.state, 8);
    if (!requested.ok) throw new Error('expected target change');
    const returned = resolveTargetChange(requested.state, started.scopeToken, requested.change.requestId, 'return');
    expect(returned.intent).toEqual({ kind: 'return', targetUserId: 7 });
    const requestedAgain = requestTargetChange(returned.state, 8);
    if (!requestedAgain.ok) throw new Error('expected target change');
    const discarded = resolveTargetChange(requestedAgain.state, started.scopeToken, requestedAgain.change.requestId, 'discard');
    expect(discarded.intent).toEqual({ kind: 'discard', targetUserId: 8 });
    expect(discarded.state.draft).toBeNull();
    expect(discarded.state.submitted).toBeNull();
  });
});


describe('HR2 raw staff-role authority', () => {
  it.each(['client','user','unknown','staff','coach'])('rejects ineligible raw role %s without minting task identity', role => {
    const initial = createInitialDraftState(7, role);
    let idCalls=0;
    const out=beginDraft(initial,42,'workout',()=>{idCalls++;return 'unreachable';});
    expect(out).toMatchObject({ok:false,code:'ROLE_NOT_AUTHORIZED'});
    expect(out.state).toBe(initial);expect(idCalls).toBe(0);
  });
  it.each(['admin','trainer'])('admits actual app staff role %s', role => {
    const out=beginDraft(createInitialDraftState(7,role),42,'workout',()=> 'synthetic-task-id');
    expect(out.ok).toBe(true);
  });
});

describe('G04.2a selection decision identity', () => {
  const anchor = {
    pathname: '/dashboard/trainer/coach-assistant',
    search: '?client=42&tab=workout',
    hash: '#draft',
    targetUserId: 42,
    pinnedClientId: 42,
    threadId: 9,
  };

  const dirtyState = () => {
    const started = beginDraft(createInitialDraftState(7, 'trainer'), 42, 'workout', ids);
    if (!started.ok) throw new Error('expected task');
    const edited = editDraft(started.state, started.scopeToken, 0, { content: { title: 'Dirty draft' } }, ids);
    if (!edited.ok) throw new Error('expected edit');
    return edited.state;
  };

  it('T-SEL1 accepts deliberate null destinations and rejects ambiguous IDs before minting identity', () => {
    const state = dirtyState();
    let idCalls = 0;
    const createRequestId = () => { idCalls += 1; return `request-${idCalls}`; };
    const invalidValues: unknown[] = [undefined, true, [], {}, '0', '01', 1.5, Number.MAX_SAFE_INTEGER + 1];
    for (const value of invalidValues) {
      const result = requestTargetChange(state, value, { origin: 'route', anchor }, createRequestId);
      expect(result).toMatchObject({ ok: false, code: 'INVALID_TARGET' });
    }
    for (const metadata of [null, [], true, new Date()]) {
      const result = requestTargetChange(state, 43, metadata as never, createRequestId);
      expect(result).toMatchObject({ ok: false, code: 'INVALID_ORIGIN' });
    }
    expect(idCalls).toBe(0);
    expect(requestTargetChange(state, 42, { origin: 'route', anchor }, createRequestId)).toMatchObject({ ok: false, code: 'INVALID_TARGET' });
    expect(requestTargetChange(state, 43, { origin: 'thread' }, createRequestId)).toMatchObject({ ok: false, code: 'INVALID_TARGET' });
    const unscoped = requestTargetChange(state, null, { origin: 'route', anchor: { ...anchor, targetUserId: 42 } }, createRequestId);
    expect(unscoped.ok).toBe(true);
    if (unscoped.ok) expect(unscoped.change.nextTargetUserId).toBeNull();
    expect(idCalls).toBe(1);
    expect(state.draft?.revision).toBe(1);
  });

  it('T-SEL2 uses first-request-wins identity and fences stale or double decisions', () => {
    const state = dirtyState();
    let idCalls = 0;
    const createRequestId = () => `request-${++idCalls}`;
    const first = requestTargetChange(state, 43, { origin: 'pin', nextThreadId: 10, anchor }, createRequestId);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.change.requestId).toBe('request-1');
    const repeated = requestTargetChange(first.state, 43, { origin: 'pin', nextThreadId: 10, anchor }, createRequestId);
    expect(repeated.ok).toBe(true);
    if (!repeated.ok) return;
    expect(repeated.change.requestId).toBe(first.change.requestId);
    const competing = requestTargetChange(repeated.state, 44, { origin: 'thread', nextThreadId: 11, anchor }, createRequestId);
    expect(competing.ok).toBe(true);
    if (!competing.ok) return;
    expect(competing.change.requestId).toBe(first.change.requestId);
    expect(competing.change.nextTargetUserId).toBe(43);
    expect(Object.isFrozen(first.change)).toBe(true);
    expect(idCalls).toBe(1);
    const returned = resolveTargetChange(competing.state, first.change.scopeToken, first.change.requestId, 'return');
    expect(returned.intent).toMatchObject({ kind: 'return', targetUserId: 42, anchor });
    const double = resolveTargetChange(returned.state, first.change.scopeToken, first.change.requestId, 'return');
    expect(double.intent.kind).toBe('none');
  });

  it('T-SEL3 stores a defensive frozen anchor without changing revision or content', () => {
    const state = dirtyState();
    const inputAnchor = { ...anchor };
    const remembered = rememberSelection(state, state.draft!.scopeToken, inputAnchor);
    expect(remembered.ok).toBe(true);
    if (!remembered.ok) return;
    expect(remembered.state.draft).toBe(state.draft);
    expect(remembered.state.draft?.revision).toBe(1);
    expect(remembered.state.draft?.requestKey).toBe(state.draft?.requestKey);
    expect(remembered.state.selectionAnchor).toEqual(anchor);
    expect(Object.isFrozen(remembered.state.selectionAnchor)).toBe(true);
    expect(Object.isFrozen(remembered.state.selectionAnchor?.pathname)).toBe(true);
    inputAnchor.pathname = '/mutated-after-call';
    expect(remembered.state.selectionAnchor?.pathname).toBe('/dashboard/trainer/coach-assistant');
    for (const pathname of ['https://evil.test', '/\\evil.example', '/dashboard?client=42', '/dashboard#draft']) {
      expect(rememberSelection(state, state.draft!.scopeToken, { ...anchor, pathname })).toMatchObject({ ok: false, code: 'INVALID_SELECTION_ANCHOR' });
    }
    expect(rememberSelection(state, state.draft!.scopeToken, { ...anchor, targetUserId: 43 })).toMatchObject({ ok: false, code: 'INVALID_SELECTION_ANCHOR' });
    expect(rememberSelection(state, 'stale-scope', anchor)).toMatchObject({ ok: false, code: 'STALE_SCOPE' });
    const restarted = beginDraft(remembered.state, 43, 'workout', ids);
    expect(restarted.ok).toBe(true);
    if (restarted.ok) expect(restarted.state.selectionAnchor).toBeNull();
  });

  it('T-SEL4 preserves the frozen draft on Return and retires draft/submitted/anchor on nullable Discard', () => {
    const state = dirtyState();
    const remembered = rememberSelection(state, state.draft!.scopeToken, anchor);
    if (!remembered.ok) return;
    const frozen = freezeForSubmit(remembered.state, state.draft!.scopeToken, 1, ids);
    if (!frozen.ok) throw new Error('expected frozen draft');
    const requested = requestTargetChange(frozen.state, null, { origin: 'route' }, ids);
    if (!requested.ok) throw new Error('expected nullable destination');
    const returned = resolveTargetChange(requested.state, state.draft!.scopeToken, requested.change.requestId, 'return');
    expect(returned.intent).toMatchObject({ kind: 'return', targetUserId: 42, anchor });
    expect(returned.state.draft?.content).toEqual(frozen.state.draft?.content);
    expect(returned.state.submitted).toBe(frozen.state.submitted);
    const requestedDiscard = requestTargetChange(returned.state, null, { origin: 'route' }, ids);
    if (!requestedDiscard.ok) throw new Error('expected nullable destination');
    const discarded = resolveTargetChange(requestedDiscard.state, state.draft!.scopeToken, requestedDiscard.change.requestId, 'discard');
    expect(discarded.intent).toMatchObject({ kind: 'discard', targetUserId: null });
    expect(discarded.state.draft).toBeNull();
    expect(discarded.state.submitted).toBeNull();
    expect(discarded.state.selectionAnchor).toBeNull();
  });
});


describe('G04.2a Astra metadata boundary regressions', () => {
  const anchor = { pathname:'/dashboard/trainer/coach-assistant', search:'?clientId=42&context=a%2Fb&context=second', hash:'#draft', targetUserId:42, pinnedClientId:42, threadId:9 };
  const started = () => { const out=beginDraft(createInitialDraftState(7,'trainer'),42,'workout',ids); if(!out.ok)throw Error('fixture'); return out; };
  it('rejects malformed nullable pin/thread identities without converting them into unscoped selection', () => {
    const out=started(); let calls=0;const id=()=>{calls++;return 'request';};
    const invalid:unknown[]=[undefined,true,false,[],{},0,-1,0.5,'','01',' 9','9 ','1e1','0x10',Number.MAX_SAFE_INTEGER+1];
    for(const value of invalid){
      for(const key of ['pinnedClientId','threadId']) expect(rememberSelection(out.state,out.scopeToken,{...anchor,[key]:value}).ok).toBe(false);
      expect(requestTargetChange(out.state,43,{origin:'thread',nextThreadId:value,anchor},id).ok).toBe(false);
    }
    expect(calls).toBe(0);
    expect(rememberSelection(out.state,out.scopeToken,{...anchor,pinnedClientId:null,threadId:null}).ok).toBe(true);
  });
  it('rejects explicit null and malformed origins before minting a pending request', () => {
    const out=started();let calls=0;const id=()=>{calls++;return 'request';};
    for(const origin of [null,false,0,[],{},'', 'PIN']) expect(requestTargetChange(out.state,43,{origin},id)).toMatchObject({ok:false,code:'INVALID_ORIGIN'});
    expect(calls).toBe(0);
    expect(requestTargetChange(out.state,43,{},id).ok).toBe(true);
  });
  it('bounds internal anchor parts and preserves the exact accepted URL and request identity', () => {
    const out=started();
    for(const patch of [{pathname:'//outside.test'},{pathname:'/x\n'},{pathname:'/'+ 'a'.repeat(512)},{search:'clientId=42'},{search:'?a=#frag'},{search:'?'+ 'x'.repeat(1024)},{hash:'draft'},{hash:'#'+ 'a'.repeat(512)}]) expect(rememberSelection(out.state,out.scopeToken,{...anchor,...patch}).ok).toBe(false);
    const remembered=rememberSelection(out.state,out.scopeToken,anchor);expect(remembered.ok).toBe(true);if(!remembered.ok)throw Error('fixture');
    const pending=requestTargetChange(remembered.state,43,{origin:'pin'},ids);expect(pending.ok).toBe(true);if(!pending.ok)throw Error('fixture');
    const stale=resolveTargetChange(pending.state,out.scopeToken,'different-request','discard');expect(stale.state).toBe(pending.state);expect(stale.intent.kind).toBe('none');
    const returned=resolveTargetChange(pending.state,out.scopeToken,pending.change.requestId,'return');expect(returned.intent).toMatchObject({kind:'return',anchor});expect(returned.state.draft).toBe(out.state.draft);
  });
});
