/** Task-local user override controller. Default schema-3 policy is untouched. */
import fs from 'node:fs';
import {policy, hash, confined, validateStateShape} from './workflow-policy.mjs';
import {fail, text, rawEvidence, jsonEvidence, contractHash, overrideSnapshot,
  validateOverride, validateBuild, validateOverridePending, validateFinalReview, validateCarriedCalls,
  validateOverrideCompletion, activeOverride} from './workflow-override-evidence.mjs';
export {overrideSnapshot, validateOverride, validateOverridePending, validateOverrideCompletion};
export const isOverride = state => state?.schemaVersion === 4;

function initialize(input, migrating) {
  const root=fs.realpathSync(input.repoRoot), authorization=structuredClone(input.authorization);
  if (authorization?.authorizedBy!=='user' || !text(authorization.instruction) || authorization.cadence!=='final-astra' ||
      !Number.isSafeInteger(authorization.reviewCallsPerTask) || authorization.reviewCallsPerTask<1) fail('explicit user authorization and bounded task cap required');
  if (authorization.builder !== undefined &&
      (!authorization.builder || typeof authorization.builder !== 'object' || Array.isArray(authorization.builder) ||
       authorization.builder?.model !== 'gpt-5.6-luna' || authorization.builder?.effort !== 'xhigh' ||
       Object.keys(authorization.builder).some(key => !['model','effort'].includes(key))))
    fail('task-scoped builder must be Luna xhigh');
  if (!text(input.taskId) || !text(input.sessionId) || !Array.isArray(input.planFiles) || !input.planFiles.length || !Array.isArray(input.slices) || !input.slices.length) fail('task, session, plan and exact slices required');
  const scopes=input.slices.map(s=>({id:s.id,files:s.files}));
  if (new Set(scopes.map(s=>s.id)).size!==scopes.length || scopes.some(s=>!text(s.id)||s.id==='FINAL'||!Array.isArray(s.files)||!s.files.length||new Set(s.files).size!==s.files.length)) fail('unique bounded slices required');
  for (const file of [...input.planFiles,...scopes.flatMap(s=>s.files)]) confined(root,file);
  let prior=null;
  const carriedCalls=structuredClone(input.carriedCalls || []);
  validateCarriedCalls(root, carriedCalls, {initial: !migrating && carriedCalls.length > 0});
  if (migrating) {
    prior=jsonEvidence(root,input.previousState); validateStateShape(prior);
    if (prior.taskId!==input.taskId || fs.realpathSync(prior.repoRoot)!==root) fail('migration must preserve task identity and repository');
    if (prior.inFlight) fail('uncertain execution must be reconciled before migration');
    if (prior.sessionId!==input.sessionId && authorization.sessionRebind!==true) fail('explicit session rebind authorization required');
    const oldFiles=prior.slices.flatMap(s=>s.allowedFiles || s.files);
    const newFiles=new Set([...scopes.flatMap(s=>s.files),...input.planFiles]);
    if (oldFiles.some(file=>!newFiles.has(file))) fail('migration cannot drop previous owned scope');
    const admissions=prior.events.filter(e=>['admitted','override-admitted'].includes(e.type));
    if (!isOverride(prior) && admissions.length!==prior.calls) fail('old admission history disagrees with consumption');
    for (const e of admissions) {
      const id=e.attemptId || e.run?.id;
      if (!prior.events.some(t=>['reviewed','reconciled','override-reviewed','override-reconciled'].includes(t.type)&&t.attemptId===id)) fail('old admission has no terminal history');
    }
  } else if (input.previousState) fail('existing task consumption requires explicit migrate');
  else if (carriedCalls.length) {
    if (authorization.allowInitialHistoricalCalls !== true) fail('initial historical carry requires explicit authorization');
  }
  const calls=(prior?.calls || 0)+carriedCalls.reduce((n,c)=>n+c.calls,0);
  if (calls+1>authorization.reviewCallsPerTask) fail('task cap must retain at least one final Astra admission');
  const origin={previousState:input.previousState || null,state:prior,calls,carriedCalls,events:structuredClone(prior?.events || [])};
  const slices=scopes.map(s=>({...s,allowedFiles:s.files,files:[...new Set([...s.files,...input.planFiles])],status:'build',round:0,reviews:[],findings:{}}));
  const state={schemaVersion:4,mode:'explicit-task-override',taskId:input.taskId,sessionId:input.sessionId,repoRoot:root,
    policyHash:hash(JSON.stringify(policy)),authorization,origin,planFiles:input.planFiles,scopes,
    calls,events:structuredClone(origin.events),status:'active',stage:'slice',index:0,inFlight:null,slices};
  state.contractDigest=contractHash(state);
  state.events.push({type:migrating?'explicit-migration':'explicit-override',at:new Date().toISOString(),
    previousSessionId:prior?.sessionId || null,sessionId:state.sessionId,previousPolicyHash:prior?.policyHash || null,
    previousCalls:prior?.calls || 0,carriedCalls:calls-(prior?.calls || 0),calls,authorization,contractDigest:state.contractDigest});
  validateOverride(state);
  return state;
}
function preflight(input) {
  const p=input.preflight, age=Date.now()-Date.parse(p?.checkedAt);
  if (!p || p.model!=='gpt-6-astra' || p.effort!=='xhigh' || p.provider!=='openai-codex' || p.billing!=='subscription' ||
      p.available!==true || p.entitlementVerified!==true || p.quotaAvailable!==true || p.extraUsage!==false ||
      p.recipientAuthorized!==true || p.privacyApproved!==true || !Number.isFinite(age) || age<0 || age>=300000) fail('verified included-subscription native Astra preflight required');
  if (!text(input.dispatch?.toolName) || !/^[a-f0-9]{64}$/.test(input.dispatch.inputHash || '')) fail('exact native dispatch binding required');
}
export function overrideTransition(state, command, input={}) {
  if (['migrate','override-init'].includes(command)) {
    if (state) fail('destination workflow already exists');
    return initialize(input,command==='migrate');
  }
  validateOverride(state);
  if (command==='status') return state;
  if (state.policyHash!==hash(JSON.stringify(policy))) fail('base policy changed; explicit migration required');
  if (state.status==='complete') fail('workflow complete; explicit migration required for further changes');
  state=structuredClone(state);
  if (command==='pause') {state.previousStatus=state.status;state.status='paused';return state;}
  if (command==='resume') {if(state.status!=='paused')fail('not paused');state.status='active';return state;}
  if (state.status==='paused') fail('workflow paused');
  const slice=activeOverride(state);
  if (command==='append-slice') {
    if (state.authorization.allowAdditionalSlices!==true) fail('task authorization does not permit additional bounded slices');
    if (slice.status==='tested') fail('advance the tested slice first, then append at build or untouched FINAL');
    if (state.inFlight || (state.stage==='final' && (slice.status!=='build'||slice.round!==0))) fail('append slices before final review starts');
    const next=input.slice;
    if (!next || !text(next.id) || next.id==='FINAL' || state.slices.some(s=>s.id===next.id) ||
        !Array.isArray(next.files)||!next.files.length||new Set(next.files).size!==next.files.length||
        !Array.isArray(input.planFiles)||!input.planFiles.length||!text(input.reason)) fail('bounded next slice, plan files and reason required');
    for (const file of [...next.files,...input.planFiles]) confined(state.repoRoot,file);
    const previousContractDigest=state.contractDigest;
    const scope={id:next.id,files:next.files,planFiles:input.planFiles};
    state.scopes.push(scope);
    state.slices.push({id:next.id,allowedFiles:next.files,files:[...new Set([...next.files,...input.planFiles])],status:'build',round:0,reviews:[],findings:{}});
    state.contractDigest=contractHash(state);
    state.events.push({type:'override-scope-appended',scope,reason:input.reason,previousContractDigest,contractDigest:state.contractDigest});
    if(state.stage==='final'){state.stage='slice';state.index=state.slices.length-1;delete state.finalReview;}
  } else if (command==='freeze') {
    if (state.inFlight || slice.status!=='build') fail('build phase with no unresolved execution required');
    const snap=overrideSnapshot(state,slice);
    if (snap.entries.some(e=>!e.sha256)) fail('all scoped source and plan files must exist at freeze');
    if (slice.previousDigest===snap.digest) fail('final repair must produce changed source or plan');
    if (slice.id==='FINAL' && (state.calls>=state.authorization.reviewCallsPerTask || slice.round>=policy.limits.reviewRoundsPerSlice)) fail('final review cap exhausted; explicit replan required');
    slice.digest=snap.digest;slice.frozen={tests:input.tests,build:input.build};
    state.events.push({type:'override-frozen',slice:slice.id,digest:slice.digest,frozen:slice.frozen});
    validateBuild(state,slice);
    slice.status=slice.id==='FINAL'?'review':'tested';
    if(slice.id==='FINAL')slice.round++;
  } else if(command==='advance') {
    if(state.inFlight)fail('review execution unresolved');
    validateBuild(state,slice);
    if(state.stage==='slice') {
      if(slice.status!=='tested')fail('passing slice tests required');
      slice.reviewDisposition='deferred-to-final';
      state.events.push({type:'override-tested',slice:slice.id,digest:slice.digest});
      if(state.index+1<state.slices.length)state.index++;
      else {state.stage='final';state.finalReview={id:'FINAL',files:[...new Set(state.slices.flatMap(s=>s.files))],
        allowedFiles:[...new Set(state.slices.flatMap(s=>s.allowedFiles))],status:'build',round:0,reviews:[],findings:{}};}
    } else {
      state.status='complete';slice.status='approved';validateOverrideCompletion(state);
    }
  } else if(command==='admit') {
    if(state.stage!=='final'||slice.status!=='review')fail('reviews deferred until final combined gate');
    if(state.inFlight)fail('one native review already in flight');
    validateBuild(state,slice);preflight(input);
    if(state.calls>=state.authorization.reviewCallsPerTask)fail('cumulative task call cap exhausted');
    if(slice.reviews.some(r=>r.digest===slice.digest))fail('review already completed; advance or fix');
    const startedAt=Date.now();
    state.inFlight={id:[state.taskId,state.contractDigest,'FINAL',slice.round,state.calls+1,slice.digest].join(':'),
      seat:'astra',digest:slice.digest,dispatch:input.dispatch,preflight:input.preflight,startedAt,
      deadline:startedAt+policy.limits.deadlineSecondsPerCall*1000};
    state.calls++;state.events.push({type:'override-admitted',run:structuredClone(state.inFlight)});
  } else if(command==='review') {
    validateOverridePending(state);
    if(Date.now()>state.inFlight.deadline)fail('late result requires terminal reconciliation');
    const receipt=input.receipt, review={attemptId:state.inFlight.id,digest:slice.digest,receipt};
    validateFinalReview(state,review);
    slice.reviews.push(review);state.events.push({type:'override-reviewed',attemptId:review.attemptId,review});state.inFlight=null;
  } else if(command==='fix') {
    if(state.stage!=='final'||slice.status!=='review'||state.inFlight||!slice.reviews.length)fail('completed final Astra review required for repair');
    const body=validateFinalReview(state,slice.reviews.at(-1));
    if(body.digest!==slice.digest)fail('current Astra repair decision required');
    if(state.calls>=state.authorization.reviewCallsPerTask || slice.round>=policy.limits.reviewRoundsPerSlice)fail('final repair budget exhausted; explicit replan required');
    slice.previousDigest=slice.digest;slice.repairRequired=true;slice.status='build';
  } else if(command==='reconcile') {
    validateOverridePending(state,{checkCurrent:false});
    const terminal=jsonEvidence(state.repoRoot,input.receipt);
    if(terminal.attemptId!==state.inFlight.id||terminal.executionKnown!==true||!text(terminal.reason)||
      !['NOT_SENT','FAILED','CANCELLED','COMPLETED_QUARANTINED'].includes(terminal.status))fail('terminal execution evidence required');
    state.events.push({type:'override-reconciled',attemptId:terminal.attemptId,receipt:input.receipt});
    state.inFlight=null;slice.status='build';
  } else fail('unknown override command');
  state.events.push({type:command,slice:slice.id,at:new Date().toISOString()});
  validateOverride(state);
  return state;
}
