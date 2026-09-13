#!/usr/bin/env node
/** Local v3 workflow controller. No HTTP, credential reads, model calls or shell execution. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  policy, hash, confined, readJson, snapshot, resolveReviewers, requiredReviewRoute,
  evidenceReference, validateActorReceipt, validateReviewBody, validateWorkflowReceipt,
  validateBuilderAssignment, validateStateShape, validateFrozenEvidence, validateReviewRound, validatePendingAttempt,
} from './workflow-policy.mjs';
import {validateReceipt} from './check-readiness.mjs';
import {isOverride, overrideTransition, overrideSnapshot} from './workflow-override.mjs';

const fail = message => { throw Error(message); };
const text = value => typeof value === 'string' && value.trim().length > 0;
const HEX = /^[a-f0-9]{64}$/;
const active = state => state.stage === 'final' ? state.finalReview : state.slices[state.index];
const route = requiredReviewRoute();
function staleStatus(state) {
  validateStateShape(state);
  if (state.policyHash === hash(JSON.stringify(policy))) return state;
  return {
    status: 'STALE_POLICY',
    taskId: state.taskId,
    sessionId: state.sessionId,
    storedPolicyHash: state.policyHash,
    currentPolicyHash: hash(JSON.stringify(policy)),
    handoff: 'replan and reenroll; no automatic migration',
    validated: false,
  };
}

export function transact(file, fn) {
  const lock = file + '.lock';
  let fd;
  try {
    fd = fs.openSync(lock, 'wx');
    fs.writeFileSync(fd, JSON.stringify({pid: process.pid, createdAt: new Date().toISOString()}));
  } catch {
    if (fd !== undefined) fs.closeSync(fd);
    fail('workflow locked; inspect owner, never force-unlock automatically');
  }
  try {
    const state = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
    const {state: next, result} = fn(state);
    if (next) {
      const temp = file + '.' + process.pid + '.tmp';
      try {
        fs.writeFileSync(temp, JSON.stringify(next, null, 2), {flag: 'wx'});
        fs.renameSync(temp, file);
      } finally {
        if (fs.existsSync(temp)) fs.unlinkSync(temp);
      }
    }
    return result;
  } finally {
    fs.closeSync(fd);
    fs.unlinkSync(lock);
  }
}

function knownState(state) {
  validateStateShape(state);
  if (state?.schemaVersion !== 3 || state.policyHash !== hash(JSON.stringify(policy)) || !Array.isArray(state.slices) || !Number.isInteger(state.index)) {
    fail('invalid workflow or policy changed; replan required');
  }
}

function checkFile(root, ref) {
  return evidenceReference(root, ref, 'evidence').value;
}

function checkRef(root, ref, label = 'evidence') {
  return evidenceReference(root, ref, label);
}

function boundPlan(state) {
  const receipt = checkFile(state.repoRoot, state.planReceipt);
  const errors = validateReceipt(receipt, path.dirname(confined(state.repoRoot, state.planReceipt.path)));
  if (errors.length) fail('bound plan is no longer ready: ' + errors.join('; '));
  return receipt;
}

function planClosure(root, ref, receipt) {
  const folder = path.dirname(confined(root, ref.path));
  const refs = [
    ...Object.values(receipt.sections || {}).flatMap(section => section.evidence || []),
    ...(receipt.tests || []).flatMap(test => test.evidence || []),
  ];
  return [...new Set([ref.path, ...refs.map(item => path.relative(root, path.resolve(folder, item.path)))])];
}

function current(state, slice) {
  if (slice.digest !== snapshot(state.repoRoot, slice.files).digest) fail('source or plan changed; fix and freeze again');
}

function refFrom(input, ...names) {
  for (const name of names) if (input?.[name]) return input[name];
  return null;
}

function requirePacket(state, input, sourceDigest, testsRef) {
  const packetRef = refFrom(input, 'packet', 'reviewPacket', 'commonPacket');
  if (!packetRef) fail('common review packet required');
  const packet = checkRef(state.repoRoot, packetRef, 'common review packet').value;
  if (!packet || typeof packet !== 'object') fail('common review packet must be an object');
  const packetPlan = packet.planDigest || packet.planHash || packet.plan?.sha256 || packet.planReceipt?.sha256;
  const packetSource = packet.sourceDigest || packet.candidateDigest || packet.snapshotDigest || packet.source?.digest || packet.scope?.digest;
  const packetTests = packet.testsDigest || packet.testDigest || packet.tests?.sha256 || packet.testEvidence?.sha256;
  if (packetPlan !== state.planReceipt.sha256) fail('common review packet plan mismatch');
  if (packetSource !== sourceDigest) fail('common review packet source mismatch');
  if (packetTests !== testsRef.sha256 && packetTests !== testsRef.value?.digest) fail('common review packet tests mismatch');
  if (!text(packet.instructions || packet.commonInstructions || packet.reviewerInstructions)) fail('common review instructions required');
  return {ref: packetRef, value: packet};
}

function remainingBudget(state) {
  const remainingStages = state.stage === 'final' ? 1 : state.slices.length - state.index + 1;
  if (state.calls + route.length * remainingStages > policy.limits.reviewCallsPerTask) fail('remaining review-call budget cannot complete required stages');
}

function archiveRound(slice) {
  const {reviewHistory, ...round} = slice;
  reviewHistory.push(structuredClone(round));
}

function dispatchBinding(dispatch) {
  if (!dispatch || !text(dispatch.toolName) || !HEX.test(dispatch.inputHash || '')) fail('native dispatch binding required');
  return {toolName: dispatch.toolName, inputHash: dispatch.inputHash};
}

function nextSeat(slice) {
  const done = new Set((slice.reviews || []).filter(review => review.status === 'complete' && review.digest === slice.digest).map(review => review.seat));
  return route.find(seat => !done.has(seat));
}

function allFindingsResolved(slice) {
  return Object.values(slice.findings || {}).every(finding => ['resolved', 'rejected'].includes(finding.status));
}

export function transition(state, command, input = {}) {
  if (isOverride(state) || ['migrate','override-init'].includes(command)) return overrideTransition(state, command, input);
  if (command === 'init') {
    if (state) fail('workflow already exists');
    const profile = input.profile ?? policy.defaultProfile;
    if (!input.taskId || !input.sessionId || !['sequential-astra', 'all-three'].includes(profile) || !Array.isArray(input.slices) || !input.slices.length) fail('task, native session, strict reviewer profile and slices required');
    if (route.length * (input.slices.length + 1) > policy.limits.reviewCallsPerTask) fail('planned minimum review calls exceed task budget');
    if (input.extras?.length) fail('unrequested reviewer seats are not permitted');
    const root = fs.realpathSync(input.repoRoot);
    if (!input.planReceipt) fail('approved plan receipt required');
    const planReceipt = checkRef(root, input.planReceipt, 'plan receipt');
    const receiptErrors = validateReceipt(planReceipt.value, path.dirname(confined(root, input.planReceipt.path)));
    if (receiptErrors.length) fail('plan not ready: ' + receiptErrors.join('; '));
    if (!input.plannerReceipt) fail('hash-bound Astra planner receipt required');
    const planner = checkFile(root, input.plannerReceipt);
    validateActorReceipt(root, planner, {seatOrRole: 'planner', boundDigest: input.planReceipt.sha256});
    if (!Array.isArray(input.planFiles) || !input.planFiles.length) fail('plan files required');
    const slices = input.slices.map(slice => {
      if (!slice.id || slice.id === 'FINAL' || !Array.isArray(slice.files) || !slice.files.length) fail('bounded unique non-FINAL slice files required');
      const builder = validateBuilderAssignment(root, slice);
      snapshot(root, slice.files);
      return {
        id: slice.id,
        files: [...new Set([...slice.files, ...input.planFiles, ...planClosure(root, input.planReceipt, planReceipt.value)])],
        allowedFiles: slice.files,
        builder,
        status: 'build', round: 0, reviews: [], findings: {}, reviewHistory: [],
      };
    });
    if (new Set(slices.map(slice => slice.id)).size !== slices.length) fail('duplicate slice ID');
    return {
      schemaVersion: 3, taskId: input.taskId, sessionId: input.sessionId, repoRoot: root,
      profile, extras: [], localModel: null, policyHash: hash(JSON.stringify(policy)), index: 0,
      stage: 'slice', status: 'active', calls: 0, inFlight: null, slices, events: [],
      planReceipt: input.planReceipt, plannerReceipt: input.plannerReceipt,
    };
  }

  if (command === 'status') return staleStatus(state);
  knownState(state);
  state = structuredClone(state);
  if (state.status === 'complete') fail('workflow complete; start a new task for further changes');
  if (command === 'pause') { state.previousStatus = state.status; state.status = 'paused'; return state; }
  if (command === 'resume') { if (state.status !== 'paused') fail('not paused'); state.status = 'active'; return state; }
  if (state.status === 'paused') fail('workflow paused');

  const slice = active(state);
  if (command === 'admit' && state.inFlight) fail('one review already in flight or execution uncertain');
  if (['freeze', 'admit', 'review', 'fix', 'advance'].includes(command)) boundPlan(state);

  if (command === 'freeze') {
    if (slice.status !== 'build' || state.inFlight) fail('not in build phase or attempt unresolved');
    if (slice.round >= policy.limits.reviewRoundsPerSlice) fail('review round cap; replan with user');
    remainingBudget(state);
    const snap = snapshot(state.repoRoot, slice.files);
    if (slice.previousDigest && slice.previousDigest === snap.digest) fail('repair must produce a changed candidate');
    const testsRef = input.tests;
    const tests = checkRef(state.repoRoot, testsRef, 'test evidence').value;
    if (tests.status !== 'PASS' || tests.digest !== snap.digest || !tests.command) fail('fresh passing tests required');
    const packet = requirePacket(state, input, snap.digest, {sha256: testsRef.sha256, value: tests});
    if (!input.buildReceipt) fail('hash-bound builder receipt required');
    const build = checkFile(state.repoRoot, input.buildReceipt);
    validateActorReceipt(state.repoRoot, build, {seatOrRole: slice.builder.role === 'repair' ? 'repair' : 'builder', expected: slice.builder.role === 'repair' ? policy.planner : slice.builder, boundDigest: snap.digest, packetDigest: packet.ref.sha256});
    if (state.stage === 'final' && build.scope !== 'final-combined' && build.finalCombined !== true) fail('final combined builder receipt required');
    const routeResult = resolveReviewers(state.profile, input.inventory, {extras: [], now: Date.now()});
    if (routeResult.grade !== 'SELECTED_REVIEWERS' || routeResult.selected.length !== route.length) fail('complete required reviewer route unavailable');
    slice.route = routeResult;
    slice.digest = snap.digest;
    slice.snapshot = snap.entries;
    slice.tests = {...tests, evidence: testsRef};
    slice.packet = packet.ref;
    slice.buildReceipt = input.buildReceipt;
    slice.round++;
    slice.reviews = [];
    slice.adjudications = [];
    slice.status = 'review';
    validateFrozenEvidence(state, slice, {requireFreezeRecord: false});
    state.events.push({type: 'frozen', slice: slice.id, round: slice.round, digest: slice.digest, packet: slice.packet, tests: slice.tests.evidence, buildReceipt: slice.buildReceipt, builder: slice.builder});
  } else if (command === 'admit') {
    current(state, slice);
    if (slice.status !== 'review') fail('review phase required');
    if (state.inFlight) fail('one review already in flight or execution uncertain');
    validateReviewRound(state, slice);
    if (!slice.route || slice.route.selected.map(item => item.seat).join(',') !== route.join(',')) fail('complete ordered route required');
    const expectedSeat = nextSeat(slice);
    if (input.seat !== expectedSeat) fail('review seats must be admitted in GLM, GLM Flash, Astra order');
    if (state.events.some(event => event.attemptId && event.attemptId === [state.taskId, slice.id, slice.round, input.seat, slice.digest].join(':'))) fail('duplicate attempt; read existing status');
    if (state.calls >= policy.limits.reviewCallsPerTask) fail('task review-call cap reached');
    if (input.privacyApproved !== true) fail('final outbound payload approval required');
    const fresh = resolveReviewers(state.profile, input.inventory, {extras: [], now: Date.now()}).selected.find(item => item.seat === input.seat);
    const reviewer = slice.route.selected.find(item => item.seat === input.seat);
    if (!fresh || !reviewer || fresh.model !== reviewer.model || fresh.provider !== reviewer.provider || fresh.effort !== reviewer.effort) fail('preflight expired or identity changed');
    const dispatch = dispatchBinding(input.dispatch);
    const id = [state.taskId, slice.id, slice.round, input.seat, slice.digest].join(':');
    state.calls++;
    const startedAt = Date.now();
    state.inFlight = {id, seat: input.seat, dispatch, reviewer, digest: slice.digest, packetDigest: slice.packet.sha256, preflightCheckedAt: input.inventory[input.seat].checkedAt, startedAt, deadline: startedAt + policy.limits.deadlineSecondsPerCall * 1000};
    state.events.push({type: 'admitted', attemptId: id, seat: input.seat, slice: slice.id, round: slice.round, run: structuredClone(state.inFlight), at: new Date(startedAt).toISOString()});
  } else if (command === 'review') {
    current(state, slice);
    const run = state.inFlight;
    if (!run) fail('no admitted attempt');
    if (Date.now() > run.deadline) fail('late result quarantined; reconcile attempt');
    validatePendingAttempt(state, slice);
    validateReviewRound(state, slice);
    const receiptRef = input.receipt;
    const result = checkRef(state.repoRoot, receiptRef, 'review receipt').value;
    validateReviewBody(state.repoRoot, result, run.seat, run, slice);
    slice.reviews.push({seat: run.seat, status: 'complete', verdict: result.verdict, digest: slice.digest, packetDigest: slice.packet.sha256, role: result.role, requestedModel: result.requestedModel, servedModel: result.servedModel, provider: result.provider, billing: result.billing, effort: result.effort, attemptId: run.id, path: receiptRef.path, sha256: receiptRef.sha256});
    state.events.push({type: 'reviewed', attemptId: run.id, seat: run.seat, slice: slice.id, round: slice.round, receipt: receiptRef, completedAt: Date.now()});
    slice.findings = validateReviewRound(state, slice, {compareFindings: false});
    if (run.seat === 'astra') slice.adjudications = result.adjudications;
    state.inFlight = null;
  } else if (command === 'reconcile') {
    if (!state.inFlight) fail('no attempt to reconcile');
    validatePendingAttempt(state, slice);
    const terminal = checkFile(state.repoRoot, input.receipt);
    if (terminal.attemptId !== state.inFlight.id || !['NOT_SENT', 'FAILED', 'CANCELLED', 'COMPLETED_QUARANTINED'].includes(terminal.status) || terminal.executionKnown !== true || !text(terminal.reason)) fail('terminal execution evidence required');
    state.events.push({type: 'reconciled', attemptId: state.inFlight.id, slice: slice.id, round: slice.round, receipt: input.receipt});
    state.inFlight = null;
    archiveRound(slice);
    slice.status = 'build';
    slice.reviews = [];
  } else if (command === 'fix') {
    if (slice.status !== 'review' || state.inFlight) fail('finish or reconcile review first');
    if (slice.round >= policy.limits.reviewRoundsPerSlice) fail('review round cap; replan required');
    remainingBudget(state);
    if (!slice.reviews.some(review => review.seat === 'astra')) fail('Astra repair authorization required');
    validateReviewRound(state, slice);
    const repairRef = refFrom(input, 'repairReceipt', 'repair');
    if (!repairRef) fail('hash-bound Astra repair receipt required');
    const repair = checkFile(state.repoRoot, repairRef);
    validateActorReceipt(state.repoRoot, repair, {seatOrRole: 'repair', boundDigest: slice.digest});
    archiveRound(slice);
    slice.repairReceipt = repairRef;
    slice.previousDigest = slice.digest;
    slice.builder = {...policy.planner, role: 'repair'};
    slice.status = 'build';
    slice.reviews = [];
    slice.adjudications = [];
  } else if (command === 'advance') {
    current(state, slice);
    if (slice.status !== 'review' || state.inFlight) fail('review phase with no in-flight call required');
    validateReviewRound(state, slice, {requireApproval: true});
    slice.status = 'approved';
    slice.openFindings = 0;
    if (state.stage === 'final') {
      state.status = 'complete';
      const errors = validateWorkflowReceipt(state, state.repoRoot);
      if (errors.length) fail(errors.join('; '));
    } else if (state.index + 1 < state.slices.length) {
      state.index++;
    } else {
      state.stage = 'final';
      state.finalReview = {id: 'FINAL', files: [...new Set(state.slices.flatMap(item => item.files))], allowedFiles: [...new Set(state.slices.flatMap(item => item.allowedFiles))], builder: validateBuilderAssignment(state.repoRoot, {builder: policy.defaultBuilder}), status: 'build', round: 0, reviews: [], findings: {}, reviewHistory: []};
    }
  } else {
    fail('unknown workflow command');
  }
  state.events.push({type: command, slice: slice.id, round: slice.round, at: new Date().toISOString()});
  return state;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, file, arg] = process.argv.slice(2);
    if (!command || !file) fail('Usage: node workflow.mjs COMMAND STATE.json [INPUT.json]');
    const stateFile = path.resolve(file);
    const input = arg ? JSON.parse(fs.readFileSync(arg, 'utf8')) : {};
    if (['migrate','override-init'].includes(command)) {
      const candidate = transition(fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile,'utf8')) : null, command, input);
      confined(candidate.repoRoot, path.relative(candidate.repoRoot,stateFile));
      if (process.argv[5] === '--check') {
        console.log(JSON.stringify({valid:true,write:false,taskId:candidate.taskId,sessionId:candidate.sessionId,calls:candidate.calls,cap:candidate.authorization.reviewCallsPerTask,cadence:candidate.authorization.cadence}));
        process.exit(0);
      }
      if (process.argv.length > 5) fail('unsupported migration argument');
    }
    if (command === 'snapshot') {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      if (isOverride(state)) { transition(state,'status'); console.log(JSON.stringify(overrideSnapshot(state))); process.exit(0); }
      knownState(state);
      console.log(JSON.stringify(snapshot(state.repoRoot, active(state).files)));
      process.exit(0);
    }
    if (command === 'status') {
      const currentState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      console.log(JSON.stringify(transition(currentState, 'status'), null, 2));
      process.exit(0);
    }
    const result = transact(stateFile, currentState => {
      const next = transition(currentState, command, input);
      return {state: next, result: {status: next.status, stage: next.stage, index: next.index, calls: next.calls, active: active(next), inFlight: next.inFlight}};
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
