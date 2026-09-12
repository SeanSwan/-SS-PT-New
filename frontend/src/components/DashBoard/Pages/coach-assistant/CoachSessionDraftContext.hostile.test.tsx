import { act, render, renderHook } from '@testing-library/react';
import { Fragment, StrictMode, useEffect, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { CoachSessionDraftProvider, useCoachSessionDraftContext, type CoachSessionDraftContextValue } from './CoachSessionDraftContext';
const wrapper = ({children}: {children: ReactNode}) => <CoachSessionDraftProvider actorId={7} actorRole="trainer">{children}</CoachSessionDraftProvider>;

describe('HR2 shell draft ownership regressions', () => {
  it('linearizes begin, edit and freeze in one event without waiting for a render', () => {
    const {result} = renderHook(() => useCoachSessionDraftContext(), {wrapper});
    let frozen: ReturnType<CoachSessionDraftContextValue['freezeForSubmit']> = null;
    act(() => {
      const token=result.current.begin(42,'workout')!;
      expect(result.current.edit(token,0,{content:{title:'Same event'}}).ok).toBe(true);
      frozen=result.current.freezeForSubmit(token,1);
    });
    expect(frozen).not.toBeNull();
    expect(frozen).toMatchObject({snapshot:{content:{title:'Same event'}}});
    expect(result.current.submitted).toBe(frozen);
  });
  it('admits consecutive revision compare-and-set edits in the same event', () => {
    const {result} = renderHook(() => useCoachSessionDraftContext(), {wrapper});
    let token=''; act(() => {token=result.current.begin(42,'workout')!;});
    act(() => {
      expect(result.current.edit(token,0,{content:{title:'First'}}).ok).toBe(true);
      expect(result.current.edit(token,1,{content:{title:'Second'}}).ok).toBe(true);
      expect(result.current.edit(token,1,{content:{title:'Stale'}}).ok).toBe(false);
    });
    expect(result.current.draft?.revision).toBe(2);
    expect(result.current.draft?.content.title).toBe('Second');
  });
  it.each(['actor','role','logout'] as const)('masks the old owner on the first %s render and rejects the old scope', change => {
    const frames: Array<{phase:string;actor:number|null;draftActor:number|null;submittedActor:number|null}>=[];
    let api: CoachSessionDraftContextValue;
    const Probe=({phase}:{phase:string}) => {api=useCoachSessionDraftContext();frames.push({phase,actor:api.actorId,draftActor:api.draft?.actorId??null,submittedActor:api.submitted?.actorId??null});return null;};
    const view=(actor:number|null,role:string|null,phase:string)=><CoachSessionDraftProvider actorId={actor} actorRole={role}><Probe phase={phase}/></CoachSessionDraftProvider>;
    const {rerender}=render(view(7,'trainer','before'));
    let token='';act(()=>{token=api!.begin(42,'workout')!;});
    act(()=>{api!.freezeForSubmit(token,0);});
    const staleEdit=api!.edit;
    rerender(view(change==='actor'?8:change==='logout'?null:7,change==='role'?'admin':change==='logout'?null:'trainer','after'));
    expect(frames.filter(f=>f.phase==='after').every(f=>f.draftActor===null&&f.submittedActor===null)).toBe(true);
    act(()=>{expect(staleEdit(token,0,{content:{title:'late'}}).ok).toBe(false);});
    rerender(view(7,'trainer','returned'));
    expect(api!.draft).toBeNull(); expect(api!.submitted).toBeNull();
  });
});


it('StrictMode replay retains one synchronous shell owner for both consumers', () => {
  const strictWrapper=({children}:{children:ReactNode})=><StrictMode><CoachSessionDraftProvider actorId={7} actorRole="trainer">{children}</CoachSessionDraftProvider></StrictMode>;
  const {result}=renderHook(()=>({first:useCoachSessionDraftContext(),second:useCoachSessionDraftContext()}),{wrapper:strictWrapper});
  act(()=>{const token=result.current.first.begin(42,'workout')!;result.current.second.edit(token,0,{content:{title:'Shared'}});expect(result.current.first.freezeForSubmit(token,1)).not.toBeNull();});
  expect(result.current.first.draft).toBe(result.current.second.draft);
  expect(result.current.first.submitted).toBe(result.current.second.submitted);
  expect(result.current.first.getSnapshot().draft).toBe(result.current.first.draft);
});


it.each(['client','user','unknown','staff','coach'])('provider cannot mint a staff draft for %s', role => {
  const denied=({children}:{children:ReactNode})=><CoachSessionDraftProvider actorId={7} actorRole={role}>{children}</CoachSessionDraftProvider>;
  const {result}=renderHook(()=>useCoachSessionDraftContext(),{wrapper:denied});
  let token:string|null=null;act(()=>{token=result.current.begin(42,'workout');});
  expect(token).toBeNull();expect(result.current.draft).toBeNull();expect(result.current.submitted).toBeNull();
});


it('an old begin callback cannot gain authority again after actor A to B to A', () => {
  let actor=7;
  const changing=({children}:{children:ReactNode})=><CoachSessionDraftProvider actorId={actor} actorRole="trainer">{children}</CoachSessionDraftProvider>;
  const {result,rerender}=renderHook(()=>useCoachSessionDraftContext(),{wrapper:changing});
  const oldBegin=result.current.begin;
  actor=8;rerender();actor=7;rerender();
  let token:string|null=null;act(()=>{token=oldBegin(42,'workout');});
  expect(token).toBeNull();expect(result.current.draft).toBeNull();
  act(()=>{expect(result.current.begin(43,'workout')).not.toBeNull();});
});

it('G04.2a T-SEL2 captures the pending request identity in the legacy two-argument resolver', () => {
  let actor = 7;
  const changing = ({ children }: { children: ReactNode }) => <CoachSessionDraftProvider actorId={actor} actorRole="trainer">{children}</CoachSessionDraftProvider>;
  const { result, rerender } = renderHook(() => useCoachSessionDraftContext(), { wrapper: changing });
  let firstToken = '';
  act(() => { firstToken = result.current.begin(42, 'workout')!; });
  let firstRequestId = '';
  act(() => {
    const first = result.current.requestTargetChange(43, {
      origin: 'pin',
      nextThreadId: 10,
      anchor: {
        pathname: '/dashboard/trainer/coach-assistant', search: '?client=42', hash: '#draft',
        targetUserId: 42, pinnedClientId: 42, threadId: 9,
      },
    });
    expect(first.ok).toBe(true);
    if (first.ok) firstRequestId = first.change.requestId;
  });
  expect(firstRequestId).not.toBe('');
  const resolveFirstRender = result.current.resolveTargetChange;
  act(() => { expect(resolveFirstRender(firstToken, 'return')).toMatchObject({ kind: 'return', targetUserId: 42 }); });
  const preDialogResolve = result.current.resolveTargetChange;
  let secondRequestId = '';
  act(() => {
    const second = result.current.requestTargetChange(44, { origin: 'thread', nextThreadId: 11 });
    expect(second.ok).toBe(true);
    if (second.ok) secondRequestId = second.change.requestId;
  });
  expect(secondRequestId).not.toBe('');
  act(() => { expect(resolveFirstRender(firstToken, 'return')).toMatchObject({ kind: 'none' }); });
  act(() => { expect(preDialogResolve(firstToken, 'discard')).toMatchObject({ kind: 'none' }); });
  expect(result.current.pendingTargetChange?.nextTargetUserId).toBe(44);
  expect(result.current.pendingTargetChange?.requestId).not.toBe(firstRequestId);
  const resolveSecondRender = result.current.resolveTargetChange;
  act(() => { expect(resolveSecondRender(firstToken, secondRequestId, 'discard')).toMatchObject({ kind: 'discard', targetUserId: 44 }); });
  expect(result.current.draft).toBeNull();
  actor = 8;
  rerender();
  actor = 7;
  rerender();
  expect(result.current.draft).toBeNull();
});

it('G04.2a T-SEL3 keeps remembered selection metadata through child remount and retires it on actor change', () => {
  let actor: number | null = 7;
  const changing = ({ children }: { children: ReactNode }) => <CoachSessionDraftProvider actorId={actor} actorRole="trainer">{children}</CoachSessionDraftProvider>;
  const { result, rerender } = renderHook(() => useCoachSessionDraftContext(), { wrapper: changing });
  let token = '';
  act(() => { token = result.current.begin(42, 'workout')!; });
  const anchor = { pathname: '/dashboard/trainer/coach-assistant', search: '?client=42', hash: '#draft', targetUserId: 42, pinnedClientId: 42, threadId: 9 };
  let remembered: ReturnType<typeof result.current.rememberSelection>;
  act(() => { remembered = result.current.rememberSelection(token, anchor); });
  expect(remembered!.ok).toBe(true);
  expect(result.current.selectionAnchor?.pathname).toBe(anchor.pathname);
  act(() => { expect(result.current.rememberSelection('stale-scope', anchor)).toMatchObject({ ok: false, code: 'STALE_SCOPE' }); });
  rerender();
  expect(result.current.selectionAnchor?.search).toBe('?client=42');
  actor = 8;
  rerender();
  expect(result.current.selectionAnchor).toBeNull();
  actor = null;
  rerender();
  expect(result.current.selectionAnchor).toBeNull();
  expect(result.current.resolveTargetChange(token, 'return')).toMatchObject({ kind: 'none' });
});


it('G04.2a Astra preserves selection through a real child unmount/remount and clears it on explicit discard', () => {
  let childKey=0,mounts=0,unmounts=0;
  const sameOwner=({children}:{children:ReactNode})=><CoachSessionDraftProvider actorId={7} actorRole="trainer"><Fragment key={childKey}>{children}</Fragment></CoachSessionDraftProvider>;
  const {result,rerender}=renderHook(()=>{useEffect(()=>{mounts++;return()=>{unmounts++;};},[]);return useCoachSessionDraftContext();},{wrapper:sameOwner});
  let token='';const anchor={pathname:'/dashboard/trainer/coach-assistant',search:'?clientId=42&context=a%2Fb&context=second',hash:'#draft',targetUserId:42,pinnedClientId:42,threadId:9};
  act(()=>{token=result.current.begin(42,'workout')!;result.current.edit(token,0,{content:{title:'Private synthetic draft'}});expect(result.current.rememberSelection(token,anchor).ok).toBe(true);});
  const before=result.current.getSnapshot();childKey++;rerender();
  expect(mounts).toBe(2);expect(unmounts).toBe(1);expect(result.current.draft).toBe(before.draft);expect(result.current.selectionAnchor).toBe(before.selectionAnchor);expect(result.current.selectionAnchor).toEqual(anchor);
  act(()=>result.current.discard(token));expect(result.current.draft).toBeNull();expect(result.current.selectionAnchor).toBeNull();expect(result.current.submitted).toBeNull();
});
