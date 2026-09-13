/** Explicit task policy: local evidence and accounting, never provider dispatch. */
import fs from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {policy, hash, confined, snapshot} from './workflow-policy.mjs';

export const fail = message => { throw Error(message); };
export const text = value => typeof value === 'string' && value.trim().length > 0;
export const activeOverride = state => state.stage === 'final' ? state.finalReview : state.slices[state.index];
export function rawEvidence(root, ref) {
  if (!ref || !text(ref.path) || !/^[a-f0-9]{64}$/.test(ref.sha256 || '')) fail('hash-bound evidence required');
  const file = confined(root, ref.path), stat = fs.statSync(file);
  if (!stat.isFile() || !stat.size || stat.size > 1024 * 1024) fail('invalid evidence file');
  const bytes = fs.readFileSync(file);
  if (hash(bytes) !== ref.sha256) fail('evidence changed');
  return bytes;
}
export function validateCarriedCalls(root, carriedCalls, {initial = false} = {}) {
  if (!Array.isArray(carriedCalls) || new Set(carriedCalls.map(item => item?.id)).size !== carriedCalls.length ||
      carriedCalls.some(item => !item || !text(item.id) || !Number.isSafeInteger(item.calls) || item.calls < 0 || !text(item.reason)))
    fail('explicit nonduplicate historical accounting required');
  for (const item of carriedCalls) {
    if (item.evidence !== undefined && !Array.isArray(item.evidence)) fail('historical evidence list required');
    if (initial && (item.calls < 1 || !Array.isArray(item.evidence) || !item.evidence.length))
      fail('initial historical carry requires positive calls and hash-bound evidence');
    for (const ref of item.evidence || []) rawEvidence(root, ref);
  }
  return carriedCalls;
}
export const jsonEvidence = (root, ref) => JSON.parse(rawEvidence(root, ref));
export const contractHash = state => hash(JSON.stringify({taskId:state.taskId, sessionId:state.sessionId,
  repoRoot:state.repoRoot, authorization:state.authorization, origin:state.origin,
  planFiles:state.planFiles, scopes:state.scopes}));
export function overrideSnapshot(state, slice = activeOverride(state)) {
  const snap = snapshot(state.repoRoot, slice.files);
  return {...snap, digest:hash(JSON.stringify(snap.entries) + state.contractDigest)};
}
export function validateOverride(state) {
  if (state?.schemaVersion !== 4 || state.mode !== 'explicit-task-override' || !text(state.taskId) || !text(state.sessionId)) fail('invalid override task');
  const auth = state.authorization;
  if (auth?.authorizedBy !== 'user' || !text(auth.instruction) || auth.cadence !== 'final-astra' ||
      !Number.isSafeInteger(auth.reviewCallsPerTask) || auth.reviewCallsPerTask < 1) fail('explicit user authorization and bounded task cap required');
  if (auth.builder !== undefined &&
      (!auth.builder || typeof auth.builder !== 'object' || Array.isArray(auth.builder) ||
       auth.builder?.model !== 'gpt-5.6-luna' || auth.builder?.effort !== 'xhigh' ||
       Object.keys(auth.builder).some(key => !['model','effort'].includes(key))))
    fail('task-scoped builder must be Luna xhigh');
  if (state.contractDigest !== contractHash(state)) fail('override authorization or scope changed');
  if (!['slice','final'].includes(state.stage) || !['active','paused','complete'].includes(state.status) ||
      !Array.isArray(state.slices) || !state.slices.length || !Number.isInteger(state.index) || state.index < 0 || state.index >= state.slices.length) fail('invalid override stage');
  if (!Array.isArray(state.events) || !Number.isSafeInteger(state.calls)) fail('invalid cumulative accounting');
  const origin = state.origin;
  if (!origin || !Number.isSafeInteger(origin.calls) || origin.calls < 0 || !Array.isArray(origin.events) ||
      !Object.hasOwn(origin, 'state') || !Object.hasOwn(origin, 'carriedCalls') ||
      !isDeepStrictEqual(state.events.slice(0, origin.events.length), origin.events)) fail('preserved admission history changed');
  const carriedCalls = validateCarriedCalls(state.repoRoot, origin.carriedCalls, {initial: !origin.previousState && origin.carriedCalls.length > 0});
  const carriedTotal = carriedCalls.reduce((total, item) => total + item.calls, 0);
  if (!Number.isSafeInteger(carriedTotal)) fail('historical accounting exceeds safe integer range');
  if (origin.previousState) {
    const prior = jsonEvidence(state.repoRoot, origin.previousState);
    if (!isDeepStrictEqual(prior, origin.state) || prior.taskId !== state.taskId || fs.realpathSync(prior.repoRoot) !== state.repoRoot ||
        prior.inFlight || origin.calls !== prior.calls + carriedTotal ||
        !isDeepStrictEqual(prior.events, origin.events)) fail('preserved predecessor or accounting changed');
  } else {
    if (carriedCalls.length > 0 && auth.allowInitialHistoricalCalls !== true)
      fail('initial historical carry requires explicit authorization');
    if (origin.state !== null || origin.events.length || origin.calls !== carriedTotal)
      fail('new task cannot invent previous admission history or accounting');
  }
  const journal = state.events.slice(origin.events.length);
  const admitted = journal.filter(e => e.type === 'override-admitted');
  if (state.calls !== origin.calls + admitted.length || state.calls > auth.reviewCallsPerTask ||
      new Set(admitted.map(e => e.run.id)).size !== admitted.length) fail('cumulative call count or cap invalid');
  for (const entry of origin.carriedCalls || []) for (const ref of entry.evidence || []) rawEvidence(state.repoRoot,ref);
  for (const [i, slice] of state.slices.entries()) {
    if (!isDeepStrictEqual(slice.allowedFiles,state.scopes[i]?.files) || slice.id !== state.scopes[i]?.id ||
        !isDeepStrictEqual(slice.files,[...new Set([...slice.allowedFiles,...(state.scopes[i].planFiles || state.planFiles)])]) ||
        !['build','tested','approved'].includes(slice.status)) fail('override slice scope or status changed');
  }
  if (state.stage === 'final') {
    const union=[...new Set(state.slices.flatMap(s=>s.files))];
    if (!state.finalReview || !isDeepStrictEqual(state.finalReview.files,union) || state.finalReview.id !== 'FINAL' ||
        !['build','review','approved'].includes(state.finalReview.status)) fail('final combined scope changed');
    const recorded=journal.filter(e=>e.type==='override-reviewed').map(e=>e.review);
    if(!isDeepStrictEqual(recorded,state.finalReview.reviews))fail('final review history changed');
  }
  return state;
}
export function validateBuild(state, slice, {current = true} = {}) {
  const root = state.repoRoot;
  if (!slice.frozen) fail('fresh build and test freeze required');
  if (current && overrideSnapshot(state,slice).digest !== slice.digest) fail('source or plan changed; rerun build/test freeze');
  const tests=jsonEvidence(root,slice.frozen.tests), build=jsonEvidence(root,slice.frozen.build);
  if (tests.status !== 'PASS' || tests.digest !== slice.digest || !text(tests.command)) fail('current passing test evidence required');
  rawEvidence(root,tests.toolEvidence);
  const actorModel = typeof build.actor === 'string' ? build.actor : build.actor?.model;
  const actorEffort = typeof build.actor === 'object' ? build.actor?.effort : build.effort;
  if (build.status !== 'complete' || build.digest !== slice.digest || !text(actorModel) || !text(build.summary)) fail('actual build execution evidence required');
  rawEvidence(root,build.toolEvidence);
  if (slice.id === 'FINAL' && (tests.scope !== 'final-combined' || !isDeepStrictEqual(tests.files,slice.files))) fail('final combined regression required');
  if (state.authorization.builder) {
    if (actorModel !== state.authorization.builder.model || actorEffort !== state.authorization.builder.effort)
      fail('build evidence does not match task-scoped builder');
  } else if (slice.repairRequired && actorModel !== 'gpt-6-astra') fail('final repairs require Astra execution evidence');
  const frozen=state.events.filter(e=>e.type==='override-frozen' && e.slice===slice.id && e.digest===slice.digest && isDeepStrictEqual(e.frozen,slice.frozen));
  if (!frozen.length) fail('build/test freeze journal missing');
}
export function validateOverridePending(state, {forDispatch = false, checkCurrent = true} = {}) {
  validateOverride(state);
  const run=state.inFlight, slice=activeOverride(state);
  const event=state.events.find(e=>e.type==='override-admitted' && e.run.id===run?.id);
  const {dispatched,...binding}=run || {};
  if (!run || !event || !isDeepStrictEqual(event.run,binding) || run.digest !== slice.digest || state.stage !== 'final' || slice.status !== 'review') fail('pending override admission changed');
  if (forDispatch && (Date.now() > run.deadline || Date.now()-Date.parse(run.preflight.checkedAt) >= 300000)) fail('native preflight or deadline expired');
  if(checkCurrent)validateBuild(state,slice);
}
export function validateFinalReview(state, review) {
  const body=jsonEvidence(state.repoRoot,review.receipt), slice=state.finalReview;
  const event=state.events.find(e=>e.type==='override-admitted' && e.run.id===body.attemptId);
  if (!event || body.attemptId !== review.attemptId || body.digest !== review.digest || body.dispatchInputHash !== event.run.dispatch.inputHash) fail('final review admission binding missing');
  if (body.status !== 'complete' || body.requestedModel !== 'gpt-6-astra' ||
      ![null,'gpt-6-astra'].includes(body.servedModel) || body.provider !== 'openai-codex' || body.billing !== 'subscription' || body.effort !== 'xhigh') fail('actual native Astra identity or completion required');
  if (!(body.outputTokens === null || (Number.isInteger(body.outputTokens) && body.outputTokens>0 && body.outputTokens<=policy.limits.outputTokensPerCall)) ||
      body.truncated !== false || !text(body.output) || !['APPROVE','REVISE'].includes(body.verdict)) fail('native output invalid; unreported metadata must be explicit null');
  rawEvidence(state.repoRoot,body.toolEvidence);
  if (!Array.isArray(body.findings) || !Array.isArray(body.adjudications)) fail('findings and adjudications required');
  const findings={};
  for (const prior of slice.reviews || []) {
    if (prior === review) break;
    const old=jsonEvidence(state.repoRoot,prior.receipt);
    for (const finding of old.findings) findings[finding.id]=finding;
  }
  const ids=new Set();
  for (const finding of body.findings) {
    if (!text(finding.id) || finding.status !== 'open' || ids.has(finding.id)) fail('invalid or duplicate finding');
    findings[finding.id]=finding; ids.add(finding.id);
  }
  const decisions=new Set();
  for (const item of body.adjudications) {
    if (!findings[item.id] || decisions.has(item.id) || !['resolved','rejected'].includes(item.status) || !text(item.reason)) fail('invalid finding adjudication');
    rawEvidence(state.repoRoot,item.evidence); decisions.add(item.id);
  }
  if (body.verdict==='APPROVE' && decisions.size!==Object.keys(findings).length) fail('unresolved final findings');
  return body;
}
export function validateOverrideCompletion(state) {
  validateOverride(state);
  if (state.status!=='complete' || state.stage!=='final' || state.inFlight) fail('final Astra review required before completion');
  for (const slice of state.slices) {
    if (slice.status!=='tested' || slice.reviewDisposition!=='deferred-to-final') fail('all slices must pass build/test gates');
    validateBuild(state,slice,{current:false});
    if (!state.events.some(e=>e.type==='override-tested' && e.slice===slice.id && e.digest===slice.digest)) fail('tested slice journal missing');
  }
  validateBuild(state,state.finalReview);
  const journal=state.events.slice(state.origin.events.length);
  const completed=journal.filter(e=>e.type==='override-reviewed');
  for (const admitted of journal.filter(e=>e.type==='override-admitted')) {
    const terminals=state.events.filter(e=>['override-reviewed','override-reconciled'].includes(e.type)&&e.attemptId===admitted.run.id);
    if (terminals.length!==1) fail('missing or duplicate terminal execution');
    if(terminals[0].type==='override-reconciled') {
      const terminal=jsonEvidence(state.repoRoot,terminals[0].receipt);
      if(terminal.attemptId!==admitted.run.id||terminal.executionKnown!==true||!text(terminal.reason)||!['NOT_SENT','FAILED','CANCELLED','COMPLETED_QUARANTINED'].includes(terminal.status))fail('terminal evidence changed');
    }
  }
  for (const review of state.finalReview.reviews) {
    if (!completed.some(e=>isDeepStrictEqual(e.review,review))) fail('final review history missing');
    validateFinalReview(state,review);
  }
  const last=state.finalReview.reviews.at(-1);
  if (!last || last.digest!==state.finalReview.digest || validateFinalReview(state,last).verdict!=='APPROVE') fail('current final Astra approval required');
}
