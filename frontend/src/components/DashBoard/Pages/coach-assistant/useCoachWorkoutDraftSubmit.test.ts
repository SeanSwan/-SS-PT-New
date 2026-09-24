import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CoachSessionDraftProvider } from './CoachSessionDraftContext';
import { useCoachSessionDraft } from './useCoachSessionDraft';
import { useCoachWorkoutDraftSubmit } from './useCoachWorkoutDraftSubmit';
import { createCoachWorkoutDraft } from '../../../../services/coachProposalService';

vi.mock('../../../../services/coachProposalService', () => ({
  createCoachWorkoutDraft: vi.fn(),
}));

const createDraft = vi.mocked(createCoachWorkoutDraft);
beforeEach(() => createDraft.mockReset());

describe('G04b submitted workout transport', () => {
  it('reuses the frozen request envelope for a transport retry', async () => {
    createDraft.mockResolvedValue({ success: true, intentId: 'intent-1', proposalId: 'proposal-1', idempotent: false });
    const wrapper = ({ children }: { children: ReactNode }) => createElement(
      CoachSessionDraftProvider,
      { actorId: 7, actorRole: 'trainer', children },
    );
    const { result } = renderHook(() => ({ draft: useCoachSessionDraft(), submit: useCoachWorkoutDraftSubmit() }), { wrapper });
    let scope: string | null = null;
    act(() => { scope = result.current.draft.begin(42, 'workout'); });
    act(() => {
      result.current.draft.edit(scope as string, 0, {
        content: {
          date: '2026-09-08',
          exercises: [{ exerciseInstanceId: 'instance-1', exerciseId: '33333333-3333-4333-8333-333333333333', exerciseName: 'Back Squat', unit: 'lb', sets: [{ setNumber: 1, reps: 5, weight: 135 }] }],
        },
      });
    });
    act(() => {
      result.current.draft.freezeForSubmit(scope as string, 1);
    });
    await act(async () => {
      await result.current.submit.submit();
      await result.current.submit.submit();
    });
    expect(createDraft).toHaveBeenCalledTimes(2);
    expect(createDraft.mock.calls[0]?.[0]).toEqual(createDraft.mock.calls[1]?.[0]);
    expect(createDraft.mock.calls[0]?.[0]).toMatchObject({ requestKey: expect.any(String), draftRevision: 1, targetUserId: 42 });
  });
});


type Response = Awaited<ReturnType<typeof createCoachWorkoutDraft>>;
const deferred = () => {let resolve!: (r:Response)=>void;let reject!: (e:Error)=>void;const promise=new Promise<Response>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const content={date:'2026-09-08',exercises:[{exerciseInstanceId:'instance-1',exerciseId:'33333333-3333-4333-8333-333333333333',exerciseName:'Back Squat',unit:'lb',sets:[{setNumber:1,reps:5,weight:135}]}]};
function mountedSubmit() {
  let actor=7; let role='trainer';
  const wrapper=({children}:{children:ReactNode})=>createElement(CoachSessionDraftProvider,{actorId:actor,actorRole:role,children});
  const hook=renderHook(()=>({draft:useCoachSessionDraft(),submit:useCoachWorkoutDraftSubmit()}),{wrapper});
  const prepare=(target=42)=>{let token='';act(()=>{token=hook.result.current.draft.begin(target,'workout')!;});act(()=>{hook.result.current.draft.edit(token,0,{content});});act(()=>{hook.result.current.draft.freezeForSubmit(token,1);});return token;};
  return {...hook,prepare,changeActor:(id:number,nextRole='trainer')=>{actor=id;role=nextRole;hook.rerender();}};
}
describe('HR2 submission identity and local-interest fences',()=>{
  it('coalesces repeated clicks while preserving the immutable retry envelope',async()=>{
    const wait=deferred();createDraft.mockReturnValue(wait.promise);const h=mountedSubmit();h.prepare();
    let a!:Promise<Response|null>;let b!:Promise<Response|null>;
    act(()=>{a=h.result.current.submit.submit();b=h.result.current.submit.submit();});
    const concurrentCalls=createDraft.mock.calls.length;
    await act(async()=>{wait.resolve({success:true,proposalId:'first'});await Promise.all([a,b]);});
    expect(concurrentCalls).toBe(1);
    const request=createDraft.mock.calls[0][0];createDraft.mockResolvedValue({success:true,proposalId:'first',idempotent:true});
    await act(async()=>{await h.result.current.submit.submit();});
    expect(createDraft).toHaveBeenCalledTimes(2);expect(createDraft.mock.calls[1][0]).toEqual(request);
  });
  it.each(['discard','target','revision','actor','role','pending-target'] as const)('ignores late success after %s retirement',async reason=>{
    const wait=deferred();createDraft.mockReturnValue(wait.promise);const h=mountedSubmit();const token=h.prepare();
    let pending!:Promise<Response|null>;act(()=>{pending=h.result.current.submit.submit();});
    if(reason==='actor')h.changeActor(8);else if(reason==='role')h.changeActor(7,'admin');else act(()=>{
      if(reason==='discard')h.result.current.draft.discard(token);
      if(reason==='target')h.result.current.draft.begin(43,'workout');
      if(reason==='revision')h.result.current.draft.edit(token,1,{content:{title:'new revision'}});
      if(reason==='pending-target')h.result.current.draft.requestTargetChange(43);
    });
    const retiredSubmitting=h.result.current.submit.submitting;
    let value:Response|null|undefined;await act(async()=>{wait.resolve({success:true,proposalId:'old-private-result'});value=await pending;});
    expect(retiredSubmitting).toBe(false);expect(value).toBeNull();expect(h.result.current.submit.lastResponse).toBeNull();expect(h.result.current.submit.error).toBeNull();
  });
  it('late error/finally from an old task cannot clear or overwrite a newer in-flight task',async()=>{
    const old=deferred();const next=deferred();createDraft.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
    const h=mountedSubmit();h.prepare();let a!:Promise<Response|null>;act(()=>{a=h.result.current.submit.submit();});
    h.prepare(43);let b!:Promise<Response|null>;act(()=>{b=h.result.current.submit.submit();});
    await act(async()=>{old.reject(new Error('old private failure'));await a;});
    const duringNewRequest={submitting:h.result.current.submit.submitting,error:h.result.current.submit.error};
    await act(async()=>{next.resolve({success:true,proposalId:'current'});await b;});
    expect(duringNewRequest.submitting).toBe(true);expect(duringNewRequest.error).toBeNull();
    expect(h.result.current.submit.lastResponse?.proposalId).toBe('current');expect(h.result.current.submit.submitting).toBe(false);
  });
  it('same-event discard fences a resolving promise before React renders',async()=>{
    const wait=deferred();createDraft.mockReturnValue(wait.promise);const h=mountedSubmit();const token=h.prepare();
    let pending!:Promise<Response|null>;act(()=>{pending=h.result.current.submit.submit();});
    let value:Response|null|undefined;await act(async()=>{h.result.current.draft.discard(token);wait.resolve({success:true,proposalId:'late'});value=await pending;});
    expect(value).toBeNull();expect(h.result.current.submit.lastResponse).toBeNull();
  });
  it('unmount retires local interest without claiming server rollback',async()=>{
    const wait=deferred();createDraft.mockReturnValue(wait.promise);const h=mountedSubmit();h.prepare();
    let pending!:Promise<Response|null>;act(()=>{pending=h.result.current.submit.submit();});h.unmount();
    wait.resolve({success:true,proposalId:'server-still-may-have-created'});
    expect(await pending).toBeNull();expect(createDraft).toHaveBeenCalledTimes(1);
  });
});


it('a retained submit callback cannot send a newer task',async()=>{
  createDraft.mockResolvedValue({success:true});const h=mountedSubmit();h.prepare();const oldSubmit=h.result.current.submit.submit;
  h.prepare(43);await act(async()=>{expect(await oldSubmit()).toBeNull();});expect(createDraft).not.toHaveBeenCalled();
});
it('replacement freeze retires the prior request without mutating its transmitted envelope',async()=>{
  const wait=deferred();createDraft.mockReturnValue(wait.promise);const h=mountedSubmit();const token=h.prepare();
  let pending!:Promise<Response|null>;act(()=>{pending=h.result.current.submit.submit();});
  const previous=createDraft.mock.calls[0][0];const before=JSON.stringify(previous);
  act(()=>{h.result.current.draft.freezeForSubmit(token,1);});
  expect(h.result.current.submit.request?.requestKey).not.toBe(previous.requestKey);
  let value:Response|null|undefined;await act(async()=>{wait.resolve({success:true,proposalId:'retired'});value=await pending;});
  expect(value).toBeNull();expect(h.result.current.submit.lastResponse).toBeNull();expect(JSON.stringify(previous)).toBe(before);
});


it('consumer mutation cannot change the frozen target or payload sent with the retry identity',async()=>{
  createDraft.mockResolvedValue({success:true});const h=mountedSubmit();h.prepare();
  const exposed=h.result.current.submit.request!;const originalKey=exposed.requestKey;
  try {exposed.targetUserId=43;} catch { /* immutable request rejects the write */ }
  try {exposed.workout.exercises[0].sets[0].weight=999;} catch { /* nested payload is immutable */ }
  await act(async()=>{await h.result.current.submit.submit();});
  expect(createDraft.mock.calls[0][0]).toMatchObject({targetUserId:42,requestKey:originalKey,workout:{exercises:[{sets:[{weight:135}]}]}});
});
