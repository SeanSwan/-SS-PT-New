import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {validateOverride, validateOverrideCompletion} from './workflow-override-evidence.mjs';

export const policy = JSON.parse(fs.readFileSync(new URL('../references/review-policy.json', import.meta.url), 'utf8'));
export const hash = value => crypto.createHash('sha256').update(value).digest('hex');

const fail = message => { throw Error(message); };
const text = value => typeof value === 'string' && value.trim().length > 0;
const list = value => Array.isArray(value) && value.length > 0;
const HEX = /^[a-f0-9]{64}$/;
const route = Object.freeze(['glm', 'glmflash', 'astra']);
const roles = Object.freeze({
  planner: new Set(['planner', 'PLANNER', 'ASTRA_ARCHITECT']),
  builder: new Set(['builder', 'BUILDER']),
  repair: new Set(['repair', 'REPAIR', 'ASTRA_REPAIR']),
  glm: new Set(['reviewer', 'advisor', 'GLM_53', 'glm']),
  glmflash: new Set(['reviewer', 'advisor', 'GLM_53_FLASH', 'glmflash']),
  astra: new Set(['reviewer', 'final', 'ASTRA_FINAL', 'astra']),
});

export const requiredReviewRoute = () => [...route];
export const roleForSeat = seat => seat === 'glm' ? 'GLM_53' : seat === 'glmflash' ? 'GLM_53_FLASH' : 'ASTRA_FINAL';
export const reviewerForSeat = seat => policy.seats[seat];

export function confined(root, name) {
  if (!text(name) || path.isAbsolute(name)) fail('relative path required');
  const base = fs.realpathSync(root);
  const target = path.resolve(base, name);
  const rel = path.relative(base, target);
  if (rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) fail('path outside task');
  let existing = target;
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) fail('invalid path');
    existing = parent;
  }
  const real = fs.realpathSync(existing);
  const realRel = path.relative(base, real);
  if (realRel === '..' || realRel.startsWith('..' + path.sep) || path.isAbsolute(realRel)) fail('symlink outside task');
  return target;
}

export function readJson(root, name) {
  const file = confined(root, name);
  if (!fs.statSync(file).isFile() || fs.statSync(file).size > 1024 * 1024) fail('oversized evidence');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function snapshot(root, names) {
  if (!list(names) || names.length > 2000 || new Set(names).size !== names.length) fail('invalid file scope');
  const entries = [...names].sort().map(name => {
    const file = confined(root, name);
    if (!fs.existsSync(file)) return {path: name, sha256: null};
    if (!fs.statSync(file).isFile() || fs.statSync(file).size > 32 * 1024 * 1024) fail('invalid source');
    return {path: name, sha256: hash(fs.readFileSync(file))};
  });
  return {entries, digest: hash(JSON.stringify(entries) + JSON.stringify(policy))};
}

function profileFor(profile) {
  return profile ?? policy.defaultProfile ?? 'sequential-astra';
}

/** Resolve the only supported review route. `all-three` is a compatibility alias. */
export function resolveReviewers(profile, inventory, {extras = [], now = Date.now()} = {}) {
  const requested = profileFor(profile);
  const expected = [...route];
  const skipped = [];
  if (!['sequential-astra', 'all-three'].includes(requested)) {
    return {requested, selected: [], skipped: [{seat: requested, reason: 'strict sequential-astra profile required'}], grade: 'BLOCKED', reason: 'strict sequential-astra profile required'};
  }
  if (!Array.isArray(extras) || extras.length) {
    return {requested, selected: [], skipped: [{seat: 'extras', reason: 'unrequested reviewer seats are not permitted'}], grade: 'BLOCKED', reason: 'unrequested reviewer seats are not permitted'};
  }
  const selected = [];
  for (const seat of expected) {
    const spec = policy.seats[seat];
    const record = inventory?.[seat];
    const age = now - Date.parse(record?.checkedAt);
    const ok = Boolean(
      spec && record?.available === true && record.model === spec.model && record.provider === spec.provider &&
      record.billing === spec.billing && record.extraUsage === false && record.recipientAuthorized === true &&
      record.privacyApproved === true && record.entitlementVerified === true && record.quotaAvailable === true &&
      Number.isFinite(age) && age >= 0 && age < 300000 && (!spec.effort || record.effort === spec.effort) &&
      !policy.prohibitedModels.includes(record.model),
    );
    if (!ok) skipped.push({seat, reason: 'required seat unavailable, unverified, stale or denied'});
    else selected.push({seat, model: record.model, provider: record.provider, billing: record.billing, effort: record.effort || null});
  }
  if (skipped.length) return {requested, selected: [], skipped, grade: 'BLOCKED', reason: 'complete required review route unavailable'};
  return {requested, selected, skipped, grade: 'SELECTED_REVIEWERS'};
}

function reference(ref) {
  return Boolean(ref && text(ref.path) && HEX.test(ref.sha256 || ''));
}

export function evidenceReference(root, ref, label = 'evidence') {
  if (!reference(ref)) fail(`${label} reference required`);
  const file = confined(root, ref.path);
  if (!fs.existsSync(file)) fail(`${label} missing or oversized`);
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size > 1024 * 1024) fail(`${label} missing or oversized`);
  const raw = fs.readFileSync(file);
  const actual = hash(raw);
  if (actual !== ref.sha256) fail(`${label} changed`);
  return {value: JSON.parse(raw.toString('utf8')), path: ref.path, sha256: ref.sha256};
}

function actorRef(actor) {
  return actor?.toolEvidence || actor?.executionReceipt || actor?.toolReceipt || actor?.provenance;
}

function expectedIdentity(seatOrRole) {
  if (seatOrRole === 'planner') return policy.planner;
  if (seatOrRole === 'builder') return policy.defaultBuilder;
  if (seatOrRole === 'repair') return policy.planner;
  return policy.seats[seatOrRole];
}

/** Validate role identity and the hash-bound execution evidence carried by an actor receipt. */
export function validateActorReceipt(root, actor, {seatOrRole, expected: expectedOverride, boundDigest, packetDigest, attemptId} = {}) {
  if (!actor || typeof actor !== 'object') fail('actor receipt required');
  const expected = expectedOverride || expectedIdentity(seatOrRole);
  if (!expected) fail('unknown actor role');
  const allowed = roles[seatOrRole] || new Set();
  if (!allowed.has(actor.role)) fail(`${seatOrRole} role mismatch`);
  if (actor.requestedModel !== expected.model || actor.servedModel !== expected.model) fail('actor model mismatch');
  if (actor.provider !== expected.provider || actor.billing !== expected.billing) fail('actor billing/provider mismatch');
  if ((expected.effort || null) !== (actor.effort || null)) fail('actor effort mismatch');
  if (actor.status !== 'complete' && actor.status !== 'COMPLETE') fail('actor receipt incomplete');
  if (attemptId && actor.attemptId !== attemptId) fail('actor attempt mismatch');
  if (packetDigest && actor.packetDigest !== packetDigest) fail('actor packet mismatch or missing binding');
  const binding = actor.planDigest || actor.candidateDigest || actor.boundDigest || actor.sourceDigest;
  if (boundDigest && binding !== boundDigest) fail('actor evidence is not bound to current digest');
  const tool = actorRef(actor);
  if (!reference(tool)) fail('hash-bound tool evidence required');
  evidenceReference(root, tool, 'tool evidence');
  return actor;
}

export function validateReviewBody(root, body, seat, run, active) {
  if (!body || typeof body !== 'object') fail('review receipt required');
  const expected = policy.seats[seat];
  if (!expected || !roles[seat].has(body.role)) fail('review role mismatch');
  if (body.seat !== seat) fail('review seat identity missing or mismatched');
  if (body.requestedModel !== expected.model || body.servedModel !== expected.model) fail('review model mismatch');
  if (body.provider !== expected.provider || body.billing !== expected.billing || (body.effort || null) !== (expected.effort || null)) fail('review identity mismatch');
  if (body.status !== 'complete' && body.status !== 'COMPLETE') fail('review receipt incomplete');
  if (body.attemptId !== run.id || body.digest !== active.digest) fail('review attempt or source mismatch');
  if (body.packetDigest !== active.packet.sha256) fail('review packet mismatch');
  if (!run.dispatch || body.dispatchInputHash !== run.dispatch.inputHash) fail('review dispatch binding mismatch');
  if (!Number.isInteger(body.outputTokens) || body.outputTokens < 1 || body.outputTokens > policy.limits.outputTokensPerCall || body.truncated !== false) fail('review output incomplete or over limit');
  if (!text(body.output) || !['APPROVE', 'REVISE'].includes(body.verdict) || !Array.isArray(body.findings)) fail('invalid review verdict, full output or findings');
  if (seat !== 'astra' && ((body.adjudications?.length || 0) || (body.advisoryReceipts?.length || 0) || (body.advisoryRefs?.length || 0) || (body.priorReports?.length || 0))) fail('only Astra may receive prior reports or adjudicate findings');
  const tool = actorRef(body);
  if (!reference(tool)) fail('review tool evidence required');
  evidenceReference(root, tool, 'review tool evidence');
  return body;
}

const sameRef = (left, right) => reference(left) && reference(right) && left.path === right.path && left.sha256 === right.sha256;
const sameFiles = (left, right) => list(left) && list(right) && left.length === right.length && new Set(left).size === left.length && [...left].sort().every((name, index) => name === [...right].sort()[index]);

export function validateStateShape(state) {
  if (state?.schemaVersion === 4) return validateOverride(state);
  if (!state || state.schemaVersion !== 3 || !text(state.taskId) || !text(state.sessionId) || !text(state.repoRoot) || !HEX.test(state.policyHash || '') ||
      !list(state.slices) || !Number.isInteger(state.index) || state.index < 0 || state.index >= state.slices.length ||
      !['slice', 'final'].includes(state.stage) || !['active', 'paused', 'complete'].includes(state.status) ||
      !Number.isInteger(state.calls) || state.calls < 0 || !Array.isArray(state.events)) fail('invalid workflow state shape');
  for (const item of [...state.slices, ...(state.stage === 'final' ? [state.finalReview] : [])]) {
    if (!item || !text(item.id) || !list(item.files) || !['build', 'review', 'approved'].includes(item.status) ||
        !Number.isInteger(item.round) || item.round < 0 || !Array.isArray(item.reviews) || !item.findings || typeof item.findings !== 'object' || Array.isArray(item.findings)) fail('invalid workflow slice shape');
  }
  return state;
}

export function validateBuilderAssignment(root, slice, now = Date.now()) {
  const assignment = slice.builder || {}, expected = policy.defaultBuilder;
  const exact = ['model', 'provider', 'billing', 'effort'].every(key => assignment[key] === expected[key]);
  const selection = slice.builderSelectionEvidence || assignment.selectionEvidence;
  if (!exact) {
    if (!selection) fail('alternative builder requires explicit selection evidence');
    const body = evidenceReference(root, selection, 'builder selection evidence').value;
    const age = now - Date.parse(body.checkedAt);
    if (!text(assignment.model) || !text(assignment.provider) || !text(assignment.effort) || assignment.billing !== 'subscription' || policy.prohibitedModels.includes(assignment.model) ||
        body.selectedModel !== assignment.model || body.provider !== assignment.provider || body.effort !== assignment.effort || body.billing !== assignment.billing ||
        body.userSelected !== true || body.available !== true || body.extraUsage !== false || body.recipientAuthorized !== true || body.privacyApproved !== true ||
        body.entitlementVerified !== true || body.quotaAvailable !== true || !Number.isFinite(age) || age < 0 || age >= 300000) fail('alternative builder selection is not verified or fresh');
  }
  return {role: 'builder', model: assignment.model, provider: assignment.provider, billing: assignment.billing, effort: assignment.effort, selectionEvidence: selection || null, assignedAt: now};
}

/** Re-open evidence even immediately before dispatch. Summaries are never the authority. */
export function validateFrozenEvidence(workflow, active, {checkCurrent = false, requireFreezeRecord = true} = {}) {
  const root = workflow.repoRoot;
  if (workflow.policyHash !== hash(JSON.stringify(policy))) fail('workflow policy changed');
  evidenceReference(root, workflow.planReceipt, 'plan receipt');
  const planner = evidenceReference(root, workflow.plannerReceipt, 'planner receipt').value;
  validateActorReceipt(root, planner, {seatOrRole: 'planner', boundDigest: workflow.planReceipt.sha256});
  if (!sameFiles(active.files, active.snapshot?.map(entry => entry.path)) || active.digest !== hash(JSON.stringify(active.snapshot) + JSON.stringify(policy))) fail('frozen source scope or digest changed');
  if (checkCurrent && active.digest !== snapshot(root, active.files).digest) fail('source or plan changed; fix and freeze again');
  if (requireFreezeRecord) {
    const frozen = workflow.events.filter(event => event.type === 'frozen' && event.slice === active.id && event.round === active.round);
    if (frozen.length !== 1 || frozen[0].digest !== active.digest || !sameRef(frozen[0].packet, active.packet) || !sameRef(frozen[0].tests, active.tests?.evidence) || !sameRef(frozen[0].buildReceipt, active.buildReceipt) || !isDeepStrictEqual(frozen[0].builder, active.builder)) fail('frozen packet, tests or actor evidence changed');
  }
  const tests = evidenceReference(root, active.tests?.evidence, 'test evidence').value;
  if (tests.status !== 'PASS' || tests.digest !== active.digest || !text(tests.command)) fail('fresh passing test evidence required');
  const packet = evidenceReference(root, active.packet, 'review packet').value;
  if (packet.planDigest !== workflow.planReceipt.sha256 || packet.sourceDigest !== active.digest || packet.testsDigest !== active.tests.evidence.sha256 || !sameFiles(packet.files, active.files) || !text(packet.instructions)) fail('review packet plan, source, tests, scope or instructions mismatch');
  if (active.id === 'FINAL') {
    const combined = [...new Set(workflow.slices.flatMap(slice => slice.files))];
    if (!sameFiles(active.files, combined) || tests.scope !== 'final-combined' || tests.planDigest !== workflow.planReceipt.sha256 || !sameFiles(tests.files, combined) || workflow.slices.some(slice => slice.tests.evidence.path === active.tests.evidence.path)) fail('fresh final-combined regression over the complete union required');
  }
  const repair = active.builder?.role === 'repair';
  if (repair) {
    if (!active.repairReceipt || !text(active.previousDigest)) fail('Astra repair authorization missing');
    validateActorReceipt(root, evidenceReference(root, active.repairReceipt, 'repair authorization').value, {seatOrRole: 'repair', boundDigest: active.previousDigest});
    if (active.digest === active.previousDigest) fail('repair must produce a changed candidate');
  } else {
    if (!Number.isFinite(active.builder?.assignedAt)) fail('builder assignment provenance missing');
    validateBuilderAssignment(root, active, active.builder.assignedAt);
  }
  const build = evidenceReference(root, active.buildReceipt, 'build receipt').value;
  validateActorReceipt(root, build, {seatOrRole: repair ? 'repair' : 'builder', expected: repair ? policy.planner : active.builder, boundDigest: active.digest, packetDigest: active.packet.sha256});
  if (active.id === 'FINAL' && build.scope !== 'final-combined') fail('final-combined execution receipt required');
  return {tests, packet, build};
}

function admittedRun(workflow, active, review) {
  const expectedId = [workflow.taskId, active.id, active.round, review.seat, active.digest].join(':');
  if (review.attemptId !== expectedId) fail('review attempt binding changed');
  const admitted = workflow.events.filter(event => event.type === 'admitted' && event.attemptId === expectedId);
  const completed = workflow.events.filter(event => event.type === 'reviewed' && event.attemptId === expectedId);
  if (admitted.length !== 1 || completed.length !== 1 || !sameRef(completed[0].receipt, review) || workflow.events.indexOf(admitted[0]) >= workflow.events.indexOf(completed[0])) fail('review admission or completion evidence missing or changed');
  const run = admitted[0].run, completion = completed[0];
  if (!run || run.id !== expectedId || run.seat !== review.seat || run.digest !== active.digest || run.packetDigest !== active.packet.sha256 ||
      !Number.isFinite(run.startedAt) || !Number.isFinite(run.deadline) || run.deadline !== run.startedAt + policy.limits.deadlineSecondsPerCall * 1000 ||
      !Number.isFinite(completion.completedAt) || completion.completedAt < run.startedAt || completion.completedAt > run.deadline ||
      !text(run.dispatch?.toolName) || !HEX.test(run.dispatch?.inputHash || '')) fail('review admission timing or dispatch invalid');
  if (!isDeepStrictEqual(run.reviewer, active.route.selected.find(item => item.seat === review.seat))) fail('review admitted identity changed');
  return {run, admissionIndex: workflow.events.indexOf(admitted[0]), completionIndex: workflow.events.indexOf(completion)};
}

function applyFindings(root, findings, body, seat, receipt) {
  const ids = new Set();
  for (const finding of body.findings) {
    if (!text(finding.id) || finding.status !== 'open' || ids.has(finding.id)) fail('duplicate or invalid open finding');
    ids.add(finding.id);
    const key = seat + ':' + finding.id;
    findings[key] = {...finding, seat, findingKey: key, status: 'open', report: {path: receipt.path, sha256: receipt.sha256}};
  }
  if (seat !== 'astra') return;
  if (!Array.isArray(body.adjudications)) fail('Astra adjudications required');
  const seen = new Set();
  for (const adjudication of body.adjudications) {
    if (!Object.hasOwn(findings, adjudication.findingKey) || seen.has(adjudication.findingKey)) fail('unknown or duplicate Astra adjudication');
    if (!['resolved', 'rejected'].includes(adjudication.status) || !text(adjudication.reason)) fail('Astra adjudication requires status, reason and evidence');
    evidenceReference(root, adjudication.evidence, 'adjudication evidence');
    findings[adjudication.findingKey] = {...findings[adjudication.findingKey], status: adjudication.status, reason: adjudication.reason, evidence: adjudication.evidence, adjudicatedBy: 'astra'};
    seen.add(adjudication.findingKey);
  }
  if (body.verdict === 'APPROVE' && (seen.size !== Object.keys(findings).length || Object.values(findings).some(finding => !['resolved', 'rejected'].includes(finding.status)))) fail('Astra must adjudicate every finding before approval');
}

/** Derive findings from original bodies in every frozen round, never a mutable summary. */
export function validateReviewRound(workflow, active, {requireApproval = false, compareFindings = true} = {}) {
  const root = workflow.repoRoot, findings = {};
  const history = active.reviewHistory || [];
  if (!Array.isArray(history) || history.length !== active.round - 1) fail('review round history missing');
  let previousCompletion = -1;
  for (const [index, round] of [...history, active].entries()) {
    if (round.round !== index + 1 || round.id !== active.id || !Array.isArray(round.reviews) || round.reviews.length > route.length) fail('review round history invalid');
    validateFrozenEvidence(workflow, round);
    if (round.route?.selected?.map(item => item.seat).join(',') !== route.join(',')) fail('complete ordered reviewer route required');
    for (const [position, review] of round.reviews.entries()) {
      if (review.seat !== route[position] || review.status !== 'complete' || review.digest !== round.digest) fail('review order or source invalid');
      const {run, admissionIndex, completionIndex} = admittedRun(workflow, round, review);
      if (admissionIndex <= previousCompletion) fail('review admission and completion order invalid');
      previousCompletion = completionIndex;
      const body = evidenceReference(root, review, 'review evidence').value;
      validateReviewBody(root, body, review.seat, run, round);
      for (const key of ['verdict', 'packetDigest', 'role', 'requestedModel', 'servedModel', 'provider', 'billing', 'effort', 'attemptId']) if ((review[key] ?? null) !== (body[key] ?? null)) fail('review identity or verdict summary changed');
      if (review.seat === 'astra') {
        if (!Array.isArray(body.advisoryReceipts) || body.advisoryReceipts.length !== 2 || !body.advisoryReceipts.every((ref, i) => sameRef(ref, round.reviews[i]))) fail('Astra advisory report binding mismatch');
      }
      applyFindings(root, findings, body, review.seat, review);
    }
    const eventReviews = workflow.events.filter(event => event.type === 'reviewed' && event.slice === active.id && event.round === round.round);
    if (eventReviews.length !== round.reviews.length) fail('original review records removed');
    if (compareFindings && !isDeepStrictEqual(round.findings, findings)) fail('finding summary differs from original reports and Astra adjudications');
  }
  if (requireApproval && (active.reviews.length !== route.length || active.reviews[2].verdict !== 'APPROVE')) fail('Astra approval and complete ordered reviewer route required');
  if (requireApproval && Object.values(findings).some(finding => !['resolved', 'rejected'].includes(finding.status))) fail('unresolved findings');
  return findings;
}

export function validatePendingAttempt(workflow, active, {forDispatch = false} = {}) {
  const pending = workflow.inFlight;
  const admitted = workflow.events.filter(event => event.type === 'admitted' && event.attemptId === pending?.id);
  if (!pending || admitted.length !== 1 || pending.id !== [workflow.taskId, active.id, active.round, route[active.reviews.length], active.digest].join(':')) fail('pending admission identity changed');
  const {dispatched, ...original} = pending;
  if (!isDeepStrictEqual(original, admitted[0].run)) fail('pending dispatch differs from original admission');
  if (forDispatch) {
    const age = Date.now() - Date.parse(pending.preflightCheckedAt);
    if (!Number.isFinite(age) || age < 0 || age >= 300000) fail('dispatch preflight expired; reconcile without sending');
  }
  return pending;
}

export function validateWorkflowReceipt(workflow, root) {
  const errors = [];
  if (workflow?.schemaVersion === 4) {
    try { if (fs.realpathSync(root) !== fs.realpathSync(workflow.repoRoot)) fail('workflow root mismatch'); validateOverrideCompletion(workflow); }
    catch(error) { errors.push('workflow: ' + error.message); }
    return errors;
  }
  try {
    validateStateShape(workflow);
    if (workflow.status !== 'complete' || workflow.stage !== 'final' || !workflow.finalReview || workflow.inFlight) fail('workflow incomplete');
    if (fs.realpathSync(root) !== fs.realpathSync(workflow.repoRoot)) fail('workflow root mismatch');
    if (workflow.policyHash !== hash(JSON.stringify(policy))) fail('workflow policy changed');
    if (!workflow.plannerReceipt) fail('workflow planner receipt missing');
    const planner = evidenceReference(root, workflow.plannerReceipt, 'workflow planner receipt').value;
    validateActorReceipt(root, planner, {seatOrRole: 'planner', boundDigest: workflow.planReceipt.sha256});
    const admissions = workflow.events.filter(event => event.type === 'admitted');
    if (workflow.calls !== admissions.length || workflow.calls > policy.limits.reviewCallsPerTask || new Set(admissions.map(event => event.attemptId)).size !== admissions.length) fail('workflow call count or admission history invalid');
    for (const admission of admissions) {
      const terminals = workflow.events.filter(event => ['reviewed', 'reconciled'].includes(event.type) && event.attemptId === admission.attemptId);
      if (terminals.length !== 1 || workflow.events.indexOf(terminals[0]) <= workflow.events.indexOf(admission)) fail('unknown or duplicate terminal execution');
      if (terminals[0].type === 'reconciled') {
        const terminal = evidenceReference(root, terminals[0].receipt, 'terminal execution evidence').value;
        if (terminal.attemptId !== admission.attemptId || terminal.executionKnown !== true || !['NOT_SENT', 'FAILED', 'CANCELLED', 'COMPLETED_QUARANTINED'].includes(terminal.status) || !text(terminal.reason)) fail('terminal execution evidence invalid');
      }
    }
    let priorStageCompletion = -1;
    for (const active of [...workflow.slices, workflow.finalReview]) {
      if (active.status !== 'approved' || !text(active.digest) || active.openFindings !== 0 || active.tests?.status !== 'PASS' || active.tests.digest !== active.digest) fail('workflow requires tested, reviewed slices');
      if (active.round > policy.limits.reviewRoundsPerSlice) fail('workflow round cap exceeded');
      validateFrozenEvidence(workflow, active);
      validateReviewRound(workflow, active, {requireApproval: true});
      const firstFreeze = workflow.events.findIndex(event => event.type === 'frozen' && event.slice === active.id && event.round === 1);
      if (firstFreeze <= priorStageCompletion) fail('slice or final-combined stage order invalid');
      priorStageCompletion = workflow.events.findIndex(event => event.type === 'reviewed' && event.attemptId === active.reviews[2].attemptId);
    }
    if (workflow.finalReview.digest !== snapshot(root, workflow.finalReview.files).digest) fail('workflow final source changed');
  } catch (error) {
    errors.push('workflow: ' + error.message);
  }
  return errors;
}
