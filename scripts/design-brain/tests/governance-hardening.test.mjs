/** RED-first contracts for Opus/Kimi governance hardening. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as modes from '../src/reference-modes.mjs';
import * as provenance from '../src/provenance.mjs';
import * as contract from '../src/spec-contract.mjs';
import { validateReceipt, receiptDigest } from '../src/validate.mjs';
import { synthesizeClaims } from '../src/synthesize.mjs';
import { validateClaimProvenance } from '../src/claim-provenance.mjs';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const importMaybe = async (relative) => {
  try { return await import(pathToFileURL(join(ROOT, relative))); } catch { return null; }
};
const authority = await importMaybe('scripts/design-brain/src/authority.mjs');
const egress = await importMaybe('scripts/design-brain/src/egress-policy.mjs');
const denial = await importMaybe('scripts/design-brain/src/denial-audit.mjs');
import { recordProbe } from '../src/probe.mjs';
import * as emitter from '../src/emit-vault.mjs';

const NOW = new Date('2026-07-26T12:00:00.000Z');
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const signed = (record) => ({
  ...record,
  signature: sign(null, Buffer.from(authority.signablePayload(record)), privateKey).toString('base64'),
});
const activation = (over = {}) => signed({
  schemaVersion: 'authority/1', recordId: 'AUTH-spec-enable-001', purpose: 'spec-enable',
  approvedBy: 'sean', notBefore: '2026-07-26T00:00:00.000Z', notAfter: '2026-07-27T00:00:00.000Z',
  evidenceRefs: ['counsel-record', 'phase-gate-record'], termsVersion: '2026-05-16', configDigest: 'sha256:test-config', ...over,
});

const baseSpec = (over = {}) => ({
  schemaVersion: 'spec/2', specId: 'SDIR-client-progress-001', rev: 1,
  taskId: 'TASK-progress-proof', swanSurface: '/dashboard/client/progress', swanPattern: 'C6',
  job: 'understand current training progress and choose the next action',
  designQuestion: 'how should current progress proof lead into one useful next action',
  hierarchy: { primary: 'current progress proof', secondary: 'one next action', supporting: 'calm context and recovery state' },
  states: ['default', 'loading', 'empty', 'success', 'error', 'disabled', 'offline']
    .map((name) => ({ name, behavior: `${name} state stays explicit and preserves the primary job` })),
  responsive: [320, 375, 414, 768, 1024, 1440, 2560, 3840]
    .map((width) => ({ width, behavior: `at width ${width} the hierarchy remains linear and touch targets stay accessible` })),
  interactionIntent: 'one clear action follows the progress evidence',
  a11y: 'keyboard order follows hierarchy and status changes use a polite live region',
  originalityConstraints: ['use Swan grammar only'],
  swanGrammar: { tokens: ['accent-primary'], components: ['SheenCard'] },
  informingCategories: ['fitness', 'finance'], singleSourceFields: [], singleSourceFlagged: false,
  provenanceClass: 'owned-synthetic', dataClass: 'class-1', independentDerivation: true,
  safetyClass: 'standard', safetyReview: null,
  corroborationEligible: false, doctrineEligible: false, createdBy: 'codex',
  createdAt: '2026-07-26T07:00:00.000Z', ...over,
});

const tokenOptions = {
  tokens: { tokens: { 'accent-primary': '#60C0F0' }, spacingPx: [8, 16, 44] },
  lexicon: { properNouns: ['Swan'], reverseLookupExemptions: [] },
};

test('Inspect and every legacy letter are refused instead of privilege-mapped', () => {
  assert.deepEqual(modes.REFERENCE_MODES, ['P', 'S', 'D', 'X']);
  for (const legacy of ['I', 'H', 'T', 'L']) {
    assert.throws(() => modes.assertCurrentReferenceMode(legacy), (error) => error.code === 'E_LEGACY_MODE_REFUSED');
  }
});

test('Probe keeps one purpose-bound day heartbeat without research detail', () => {
  const root = mkdtempSync(join(tmpdir(), 'swan-probe-min-'));
  try {
    const first = recordProbe(root, { queries: 1, results: 1, tool: 'mobbin-mcp', outcome: 'available', question: 'forbidden detail' }, NOW);
    assert.deepEqual(first, {
      schemaVersion: 'probe/2', day: '2026-07-26', connector: 'mobbin-mcp', available: true,
      purpose: 'current connector availability',
    });
    recordProbe(root, { queries: 1, results: 1, tool: 'mobbin-mcp', outcome: 'unavailable' }, new Date('2026-07-27T01:00:00Z'));
    assert.equal(existsSync(join(root, 'probe.log')), false);
    assert.equal(existsSync(join(root, 'ledger', 'writes.jsonl')), false);
    assert.deepEqual(JSON.parse(readFileSync(join(root, 'probe.json'), 'utf8')), {
      schemaVersion: 'probe/2', day: '2026-07-27', connector: 'mobbin-mcp', available: false,
      purpose: 'current connector availability',
    });
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('source classes reject legacy owned and production-derived content', () => {
  assert.equal(provenance.validateSourceClass('owned-synthetic'), true);
  assert.throws(() => provenance.validateSourceClass('owned'), (error) => error.code === 'E_SOURCE_CLASS_LEGACY');
  assert.throws(() => provenance.validateSourceClass('owned-production'), (error) => error.code === 'E_SOURCE_PRODUCTION_BLOCKED');
});

test('X clearance is signed, time-bounded, and revocation-aware', () => {
  assert.ok(authority, 'authority.mjs must exist');
  const clearance = signed({
    schemaVersion: 'clearance/2', recordId: 'CLR-mobbin-001', purpose: 'source-corpus-clearance',
    sourceClass: 'mobbin', scope: 'source-corpus', termsVersion: '2026-05-16',
    decisionType: 'written-permission', approvedBy: 'sean', evidenceRefs: ['permission-record'],
    notBefore: '2026-07-26T00:00:00.000Z', notAfter: '2026-07-27T00:00:00.000Z',
  });
  assert.deepEqual(provenance.validateSourceClearance(clearance, { publicKey, trustedNow: NOW, revokedIds: [] }), { ok: true, errors: [] });
  assert.equal(provenance.validateSourceClearance(clearance, { publicKey, trustedNow: NOW, revokedIds: ['CLR-mobbin-001'] }).ok, false);
  assert.equal(provenance.validateSourceClearance({ ...clearance, signature: 'tampered' }, { publicKey, trustedNow: NOW, revokedIds: [] }).ok, false);
  assert.equal(provenance.validateSourceClearance(clearance, { publicKey }).ok, false, 'missing trusted clock fails closed');
});

test('Spec enablement requires a valid signed activation record', () => {
  assert.ok(authority, 'authority.mjs must exist');
  const enabled = { schemaVersion: 'spec-mode/2', enabled: true, termsVersion: '2026-05-16', activationRef: 'AUTH-spec-enable-001' };
  assert.throws(() => contract.assertSpecModeEnabled(enabled, {}), (error) => error.code === 'E_SPEC_ACTIVATION_REQUIRED');
  assert.doesNotThrow(() => contract.assertSpecModeEnabled(enabled, { activation: activation({ configDigest: contract.configDigestFor(enabled) }), publicKey, trustedNow: NOW, revokedIds: [] }));
  assert.throws(() => contract.assertSpecModeEnabled(enabled, {
    activation: activation({ notAfter: '2026-07-25T00:00:00.000Z', configDigest: contract.configDigestFor(enabled) }), publicKey, trustedNow: NOW,
  }), (error) => error.code === 'E_SPEC_ACTIVATION_INVALID');
});

test('safety-critical specs require extension states and reject prescriptions', () => {
  const missing = contract.validateSpec(baseSpec({ safetyClass: 'safety-critical', safetyReview: { reviewerRef: 'qualified-local-review' } }), tokenOptions);
  assert.equal(missing.ok, false);
  assert.ok(missing.errors.some((error) => error.includes('trainer-approval-required')));
  const extensions = ['screening-incomplete', 'contraindication-present', 'trainer-approval-required', 'stale-assessment']
    .map((name) => ({ name, behavior: `${name} blocks progression and routes to qualified human review` }));
  const prescribed = contract.validateSpec(baseSpec({
    safetyClass: 'safety-critical', safetyReview: { reviewerRef: 'qualified-local-review' },
    states: [...baseSpec().states, ...extensions], interactionIntent: 'increase load by 10 percent for 3 sets',
  }), tokenOptions);
  assert.ok(prescribed.errors.some((error) => error.includes('prescriptive')));
  assert.equal(contract.validateSpec(baseSpec(), tokenOptions).ok, true);
});

test('durable design-specs emission is absent while S remains experimental', () => {
  assert.equal(emitter.emitSpecsCollection, undefined);
});

test('egress is typed, deny-by-default, and never accepts class-2 or free text', () => {
  assert.ok(egress, 'egress-policy.mjs must exist');
  assert.equal(egress.authorizeEgress({
    dataClass: 'class-0', destination: 'external-model', fields: { taskId: 'TASK-audit', testCount: 67 },
  }).allowed, true);
  for (const request of [
    { dataClass: 'class-2', destination: 'external-model', fields: { taskId: 'TASK-client' } },
    { dataClass: 'class-0', destination: 'external-model', fields: { freeText: 'summarize this' } },
    { dataClass: 'class-1', destination: 'external-model', fields: { taskId: 'TASK-audit' } },
  ]) assert.equal(egress.authorizeEgress(request).allowed, false);
});

test('denial audit records only code, operation, and day', () => {
  assert.ok(denial, 'denial-audit.mjs must exist');
  const root = mkdtempSync(join(tmpdir(), 'swan-denial-'));
  try {
    const row = denial.recordDenial(root, { code: 'E_SOURCE_PRODUCTION_BLOCKED', operation: 'receipt-write', payload: 'must-not-persist' }, NOW);
    assert.deepEqual(row, { schemaVersion: 'denial/1', day: '2026-07-26', code: 'E_SOURCE_PRODUCTION_BLOCKED', operation: 'receipt-write' });
    assert.doesNotMatch(readFileSync(join(root, 'denials.jsonl'), 'utf8'), /must-not-persist/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('downstream validation refuses Mobbin receipts even when the writer is bypassed', () => {
  const receipt = {
    receiptId: 'RCP-mobbin-bypass', domainId: 'D01', product: 'ProviderProduct', sourceClass: 'mobbin',
    refType: 'screen', surface: 'progress', platform: 'web',
    hierarchyNotes: 'This deliberately long observation proves the downstream boundary is exercised.',
    principleCandidates: ['Provider-derived principles cannot enter claims through a bypass'],
    inspectorActorId: 'hostile-review', openedAtUtc: NOW.toISOString(),
  };
  assert.equal(validateReceipt(receipt).ok, false);
  assert.equal(synthesizeClaims([receipt], { nowIso: NOW.toISOString() }).claims.length, 0);
});

test('egress rejects nested values, free text in allowed keys, missing keys, and oversized scalars', () => {
  for (const fields of [
    { taskId: { freeText: 'provider payload' }, testCount: 1 },
    { taskId: 'TASK-audit', testCount: 'secret text' },
    { taskId: 'TASK-audit' },
    { taskId: `TASK-${'a'.repeat(65)}`, testCount: 1 },
  ]) assert.equal(egress.authorizeEgress({ dataClass: 'class-0', destination: 'external-model', fields }).allowed, false);
});

test('denial audit rejects caller-controlled code and operation strings', () => {
  const root = mkdtempSync(join(tmpdir(), 'swan-denial-shape-'));
  try {
    assert.throws(() => denial.recordDenial(root, { code: 'customer text', operation: 'provider payload' }, NOW), /E_DENIAL_AUDIT_SHAPE/);
    assert.equal(existsSync(join(root, 'denials.jsonl')), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('authority signatures cover nested fields and reject cross-config replay', () => {
  const config = { schemaVersion: 'spec-mode/2', enabled: true, termsVersion: '2026-05-16', activationRef: 'AUTH-spec-enable-001' };
  const record = activation({ evidenceRefs: ['counsel-record', 'phase-gate-record'], configDigest: contract.configDigestFor(config) });
  const tampered = { ...record, evidenceRefs: ['counsel-record', 'changed-record'] };
  assert.equal(contract.assertSpecModeEnabled(config, { activation: record, publicKey, trustedNow: NOW, revokedIds: [] }), true);
  assert.throws(() => contract.assertSpecModeEnabled(config, { activation: tampered, publicKey, trustedNow: NOW, revokedIds: [] }), (error) => error.code === 'E_SPEC_ACTIVATION_INVALID');
  assert.throws(() => contract.assertSpecModeEnabled({ ...config, unexpectedPolicy: true }, { activation: record, publicKey, trustedNow: NOW, revokedIds: [] }), (error) => error.code === 'E_SPEC_ACTIVATION_INVALID');
  assert.throws(() => contract.assertSpecModeEnabled({ ...config, termsVersion: 'changed' }, { activation: record, publicKey, trustedNow: NOW, revokedIds: [] }), (error) => error.code === 'E_SPEC_ACTIVATION_INVALID');
});
test('safety-critical prescription variants are all refused', () => {
  const extensions = ['screening-incomplete', 'contraindication-present', 'trainer-approval-required', 'stale-assessment'].map((name) => ({ name, behavior: `${name} blocks progression and routes to qualified human review` }));
  for (const interactionIntent of ['use 3 sets of 10 reps', '10 percent load increase', 'add 10 pounds weekly']) {
    const result = contract.validateSpec(baseSpec({ safetyClass: 'safety-critical', safetyReview: { reviewerRef: 'qualified-local-review' }, states: [...baseSpec().states, ...extensions], interactionIntent }), tokenOptions);
    assert.ok(result.errors.some((error) => error.includes('prescriptive')), interactionIntent);
  }
});
test('receipt runtime matches the closed schema and binds evidence to exact content', () => {
  const receipt = { receiptId: 'RCP-bound-001', domainId: 'D01', product: 'SyntheticFixture', sourceClass: 'owned-synthetic', refType: 'screen', surface: 'progress', platform: 'web', hierarchyNotes: 'A deliberately synthetic observation with enough detail to pass the substantive floor.', principleCandidates: ['Keep the primary action adjacent to the evidence it advances'], inspectorActorId: 'test-authority', openedAtUtc: NOW.toISOString() };
  const evidence = { schemaVersion: 'authority/1', recordId: 'AUTH-RCP-bound-001', purpose: 'source-classification', approvedBy: 'sean', notBefore: '2026-07-26T00:00:00.000Z', notAfter: '2026-07-27T00:00:00.000Z', evidenceRefs: ['synthetic-fixture'], sourceClass: 'owned-synthetic', derivationRef: 'fixture-generator', licenseRef: null, receiptDigest: receiptDigest(receipt) };
  const bound = { ...receipt, sourceEvidence: signed(evidence) };
  const sourceAuthority = { publicKey, trustedNow: NOW, revokedIds: [] };
  assert.equal(validateReceipt(bound, { sourceAuthority }).ok, true);
  assert.equal(validateReceipt({ ...bound, product: 'UnrelatedProduct' }, { sourceAuthority }).ok, false, 'signature cannot replay across content');
  assert.equal(validateReceipt({ ...bound, metadata: { screenshot: 'provider payload' } }, { sourceAuthority }).ok, false, 'unknown nested payload rejected');
  assert.equal(validateReceipt({ ...bound, stateNotes: { customerData: 'secret' } }, { sourceAuthority }).ok, false, 'nested denied key rejected');
});

test('safety-critical word-number and hidden-field prescriptions are refused', () => {
  const extensions = ['screening-incomplete', 'contraindication-present', 'trainer-approval-required', 'stale-assessment'].map((name) => ({ name, behavior: `${name} blocks progression and routes to qualified human review` }));
  for (const over of [
    { interactionIntent: 'increase load by ten percent for three sets' },
    { swanGrammar: { tokens: ['accent-primary'], components: ['use 3 sets of 10 reps'] } },
  ]) {
    const result = contract.validateSpec(baseSpec({ safetyClass: 'safety-critical', safetyReview: { reviewerRef: 'qualified-local-review' }, states: [...baseSpec().states, ...extensions], ...over }), tokenOptions);
    assert.ok(result.errors.some((error) => error.includes('prescriptive')));
  }
});
test('egress denial wrapper records the closed reason without payload data', () => {
  const root = mkdtempSync(join(tmpdir(), 'swan-egress-denial-'));
  try {
    const result = egress.authorizeAndAuditEgress(root, { dataClass: 'class-2', destination: 'external-model', fields: { freeText: 'must-not-persist' } }, NOW);
    assert.equal(result.allowed, false);
    const audit = readFileSync(join(root, 'denials.jsonl'), 'utf8');
    assert.match(audit, /E_EGRESS_DATA_CLASS/);
    assert.doesNotMatch(audit, /must-not-persist/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('orphaned accepted claims cannot emit without signed canonical receipts', () => {
  const vault = mkdtempSync(join(tmpdir(), 'swan-orphan-vault-'));
  try {
    const orphan = { ...baseSpec(), status: 'accepted' };
    assert.throws(() => emitter.emitCollection([orphan], vault, { nowStamp: '20260726', receiptsById: new Map(), sourceAuthority: {} }), /lacks signed canonical receipt provenance/);
  } finally { rmSync(vault, { recursive: true, force: true }); }
});

test('safety-critical protocols with rounds and repetitions are refused', () => {
  const extensions = ['screening-incomplete', 'contraindication-present', 'trainer-approval-required', 'stale-assessment'].map((name) => ({ name, behavior: `${name} blocks progression and routes to qualified human review` }));
  const result = contract.validateSpec(baseSpec({ safetyClass: 'safety-critical', safetyReview: { reviewerRef: 'qualified-local-review' }, states: [...baseSpec().states, ...extensions], interactionIntent: 'protocol comprises three rounds of ten repetitions' }), tokenOptions);
  assert.ok(result.errors.some((error) => error.includes('prescriptive')));
});
test('claim provenance rejects confidence and translation laundering', () => {
  const receipt = { receiptId: 'RCP-claim-bound', domainId: 'D01', product: 'SyntheticFixture', sourceClass: 'owned-synthetic', refType: 'screen', surface: 'progress', platform: 'web', hierarchyNotes: 'A synthetic observation with enough detail to generate one canonical claim safely.', principleCandidates: ['Keep the primary action adjacent to the evidence it advances'], inspectorActorId: 'test-authority', openedAtUtc: NOW.toISOString() };
  const evidence = { schemaVersion: 'authority/1', recordId: 'AUTH-RCP-claim-bound', purpose: 'source-classification', approvedBy: 'sean', notBefore: '2026-07-26T00:00:00.000Z', notAfter: '2026-07-27T00:00:00.000Z', evidenceRefs: ['synthetic-fixture'], sourceClass: 'owned-synthetic', derivationRef: 'fixture-generator', licenseRef: null, receiptDigest: receiptDigest(receipt) };
  const bound = { ...receipt, sourceEvidence: signed(evidence) };
  const sourceAuthority = { publicKey, trustedNow: NOW, revokedIds: [] };
  const [claim] = synthesizeClaims([bound], { nowIso: NOW.toISOString(), sourceAuthority }).claims;
  const receiptsById = new Map([[bound.receiptId, bound]]);
  assert.equal(validateClaimProvenance(claim, receiptsById, sourceAuthority), true);
  assert.equal(validateClaimProvenance({ ...claim, confidence: { level: 'high', basis: 'fabricated' } }, receiptsById, sourceAuthority), false);
  assert.equal(validateClaimProvenance({ ...claim, singleSource: false, swanTranslation: { stolen: 'provider text' } }, receiptsById, sourceAuthority), false);
});

test('safety-critical prescription units are refused regardless of number wording', () => {
  const extensions = ['screening-incomplete', 'contraindication-present', 'trainer-approval-required', 'stale-assessment'].map((name) => ({ name, behavior: `${name} blocks progression and routes to qualified human review` }));
  const result = contract.validateSpec(baseSpec({ safetyClass: 'safety-critical', safetyReview: { reviewerRef: 'qualified-local-review' }, states: [...baseSpec().states, ...extensions], interactionIntent: 'perform thirty repetitions' }), tokenOptions);
  assert.ok(result.errors.some((error) => error.includes('prescriptive')));
});
test('claim provenance refuses unsigned lifecycle revisions', () => {
  const claim = { claimId: 'CLM-lifecycle', domainId: 'D01', principle: 'A sufficiently substantive synthetic principle for lifecycle validation', workflowPhase: 'progress', userRole: 'client', products: ['Synthetic'], receiptRefs: ['RCP-none'], exceptions: [], contradictions: [], swanTranslation: {}, confidence: { level: 'low', basis: 'single source' }, singleSource: true, status: 'accepted', createdUtc: NOW.toISOString(), rev: 999 };
  assert.equal(validateClaimProvenance(claim, new Map(), {}), false);
});
test('an absent revocation list fails closed and is not treated as an empty list', () => {
  const record = activation();
  const ctx = { publicKey, trustedNow: NOW, purpose: 'spec-enable' };
  // Baseline: an explicitly-empty list is a real answer and verifies clean.
  assert.equal(authority.verifyAuthorityRecord(record, { ...ctx, revokedIds: [] }).ok, true);
  // A caller that omits the list must NOT verify -- absent is not the same as empty.
  const omitted = authority.verifyAuthorityRecord(record, ctx);
  assert.equal(omitted.ok, false, 'omitting revokedIds must fail closed');
  assert.ok(omitted.errors.some((e) => /revocation list/i.test(e)), 'error must name the missing revocation list');
  // Any non-array is an unusable list and fails the same way.
  for (const bad of [null, undefined, '', 'AUTH-spec-enable-001', {}, 0]) {
    assert.equal(
      authority.verifyAuthorityRecord(record, { ...ctx, revokedIds: bad }).ok, false,
      `revokedIds=${JSON.stringify(bad)} must fail closed`,
    );
  }
  // A genuinely revoked id still fails, as before.
  assert.equal(authority.verifyAuthorityRecord(record, { ...ctx, revokedIds: ['AUTH-spec-enable-001'] }).ok, false);
});
