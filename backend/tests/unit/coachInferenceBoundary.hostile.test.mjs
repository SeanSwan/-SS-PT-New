import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { runCoachInference } from '../../services/ai/coachInferenceBoundary.mjs';
import { clearCoachContextCache } from '../../services/ai/coachContextCache.mjs';
const ids=['context_summary','exercise_lookup','recent_workout','progress_evidence'];
const tools=()=>Object.fromEntries(ids.map(toolId=>[toolId,vi.fn(async()=>({toolId,state:'ok',payload:{synthetic:true}}))]));
const input=evidenceTools=>({actor:{id:7,role:'admin'},targetClientId:42,sequelize:{},message:'Show progress',providerName:'gemini',providerGenerate:vi.fn(async()=>({ok:true,content:'Synthetic answer'})),deps:{evidenceTools,authorizationCheck:async()=>({allowed:true}),contextCacheEnabled:false}});
beforeEach(()=>clearCoachContextCache());
afterEach(()=>vi.useRealTimers());
test('denied context stops all dependent reads and provider egress',async()=>{
  const readers=tools(); readers.context_summary.mockResolvedValue({toolId:'context_summary',state:'denied',accessDenied:true});
  const args=input(readers); const out=await runCoachInference(args);
  expect(out.result.type).toBe('unavailable');
  expect(readers.recent_workout).not.toHaveBeenCalled();
  expect(readers.progress_evidence).not.toHaveBeenCalled();
  expect(args.providerGenerate).not.toHaveBeenCalled();
});
test.each(['tool','provider'])('hung %s cannot hold the request beyond its wall budget',async(lane)=>{
  vi.useFakeTimers(); const readers=tools(); const args=input(readers);
  args.deps.budgetMs=50;
  if(lane==='tool') readers.context_summary.mockImplementation(()=>new Promise(()=>{}));
  else args.providerGenerate.mockImplementation(()=>new Promise(()=>{}));
  let result; const pending=runCoachInference(args).then(out=>{result=out;});
  await vi.advanceTimersByTimeAsync(51);
  expect(result?.reasonCode).toBe('BUDGET_EXHAUSTED');
  expect(result?.result.type).toBe('unavailable');
  await pending;
});

test.each(['unavailable','stale','empty',null])('unverified context %s stops dependent reads and egress',async(state)=>{
  const readers=tools(); readers.context_summary.mockResolvedValue(state ? {toolId:'context_summary',state} : null);
  const args=input(readers); const out=await runCoachInference(args);
  expect(out.reasonCode).toBe('CONTEXT_UNAVAILABLE');
  expect(readers.recent_workout).not.toHaveBeenCalled();
  expect(args.providerGenerate).not.toHaveBeenCalled();
});

test.each(['admin','trainer'])('no-target %s does not read personal records',async(role)=>{
  const readers=tools();const args={...input(readers),actor:{id:7,role},targetClientId:null};
  const out=await runCoachInference(args);
  expect(out.result.type).toBe('answer');
  expect(readers.context_summary).not.toHaveBeenCalled();
  expect(readers.recent_workout).not.toHaveBeenCalled();
  expect(readers.progress_evidence).not.toHaveBeenCalled();
  expect(JSON.stringify(args.providerGenerate.mock.calls[0][0])).not.toContain('Bound target client');
});
test.each(['context_summary','recent_workout','progress_evidence'])('revocation during %s discards gathered evidence and prevents egress',async(toolId)=>{
  const readers=tools();const args=input(readers);let allowed=true;
  args.deps.authorizationCheck=vi.fn(async()=>({allowed}));
  readers[toolId].mockImplementation(async()=>{allowed=false;return {toolId,state:'ok',payload:{secret:'TARGET_PRIVATE'}};});
  const out=await runCoachInference(args);
  expect(out.reasonCode).toBe('CONTEXT_ACCESS_DENIED');
  expect(out.toolFindings).toEqual([]);
  expect(args.providerGenerate).not.toHaveBeenCalled();
  if(toolId==='context_summary')expect(readers.recent_workout).not.toHaveBeenCalled();
});
test.each(['tool','provider'])('caller cancellation aborts %s and discards late completion',async(lane)=>{
  const readers=tools();const args=input(readers);const controller=new AbortController();args.signal=controller.signal;
  let start;const started=new Promise(resolve=>{start=resolve;});let finish;let receivedSignal;
  const wait=(signal)=>{receivedSignal=signal;start();return new Promise(resolve=>{finish=resolve;});};
  if(lane==='tool')readers.context_summary.mockImplementation(({signal})=>wait(signal));
  else args.providerGenerate.mockImplementation((_messages,{signal})=>wait(signal));
  const pending=runCoachInference(args);await started;controller.abort();
  const out=await pending;expect(out.reasonCode).toBe('REQUEST_CANCELLED');expect(out.toolFindings).toEqual([]);
  expect(receivedSignal.aborted).toBe(true);
  finish(lane==='tool'?{toolId:'context_summary',state:'ok',payload:{secret:'late'}}:{ok:true,content:'late'});
  if(lane==='tool')expect(args.providerGenerate).not.toHaveBeenCalled();
});
test('consent withdrawal is checked after pending context collection',async()=>{
  let withdrawn=false;const readers=tools();const args=input(readers);delete args.deps.authorizationCheck;
  args.sequelize={query:vi.fn(async(sql)=>sql.includes('ai_privacy_profiles')?[{aiEnabled:!withdrawn,withdrawnAt:withdrawn?new Date():null}]:[])};
  readers.context_summary.mockImplementation(async()=>{withdrawn=true;return {toolId:'context_summary',state:'ok',payload:{secret:'private'}};});
  const out=await runCoachInference(args);expect(out.reasonCode).toBe('CONTEXT_ACCESS_DENIED');
  expect(args.providerGenerate).not.toHaveBeenCalled();expect(out.toolFindings).toEqual([]);
});
