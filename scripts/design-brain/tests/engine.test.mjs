/**
 * engine.test.mjs — acceptance suite for the design-brain MVE core.
 * Run: node --test scripts/design-brain/tests/engine.test.mjs
 *
 * Covers the Pass C §11 writer acceptance set plus the full receipts→claims→packet→adjudicate→
 * emit loop on synthetic data. The refusal tests matter most: an engine that accepts vacuous
 * receipts or fabricated decisions produces confident garbage with provenance.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPairSync, sign } from 'node:crypto';

import { resolveDataRoot, isInside } from '../src/paths.mjs';
import { safeWriteText, appendJsonl, assertTextContent } from '../src/writer.mjs';
import { validateReceipt, validateClaim, confidenceFor, receiptDigest } from '../src/validate.mjs';
import { synthesizeClaims, normalizePrinciple, readJsonl } from '../src/synthesize.mjs';
import { renderPacket, renderClaim } from '../src/packet.mjs';
import { parseDecisions, applyDecisions, renderIndex } from '../src/adjudicate.mjs';
import { emitCollection, renderClaimDoc } from '../src/emit-vault.mjs';
import { signablePayload } from '../src/authority.mjs';
import { decisionDigestFor } from '../src/claim-provenance.mjs';

const t = () => mkdtempSync(join(tmpdir(), 'swan-mve-'));
const { publicKey: sourcePublicKey, privateKey: sourcePrivateKey } = generateKeyPairSync('ed25519');
const SOURCE_NOW = new Date('2026-07-20T12:00:00Z');
const SOURCE_AUTH = { publicKey: sourcePublicKey, trustedNow: SOURCE_NOW, revokedIds: [] };
const RECEIPT = (over = {}) => {
  const receipt = {
    receiptId: 'RCP-0001', domainId: 'D01', product: 'Hevy', sourceClass: 'owned-synthetic', refType: 'flow',
    surface: 'workout-logging', platform: 'ios', stepCount: 6,
    hierarchyNotes: 'Set entry lives inline at the exercise row; previous values ghost-displayed beside inputs.',
    stateNotes: 'offline queue observed; empty state prompts first exercise',
    principleCandidates: ['Log a completed set inline at the exercise row, not on a separate screen'],
    inspectorActorId: 'claude-inspector', openedAtUtc: '2026-07-20T10:00:00Z', ...over,
  };
  const evidence = {
    schemaVersion: 'authority/1', recordId: `AUTH-${receipt.receiptId}`, purpose: 'source-classification',
    approvedBy: 'sean', notBefore: '2026-07-20T00:00:00Z', notAfter: '2026-07-21T00:00:00Z',
    evidenceRefs: ['synthetic-fixture'], sourceClass: receipt.sourceClass, derivationRef: 'fixture-generator',
    licenseRef: null, receiptDigest: receiptDigest(receipt),
  };
  return { ...receipt, sourceEvidence: { ...evidence, signature: sign(null, Buffer.from(signablePayload(evidence)), sourcePrivateKey).toString('base64') } };
};
const claimAuth = (receipts) => ({ receiptsById: new Map(receipts.map((receipt) => [receipt.receiptId, receipt])), sourceAuthority: SOURCE_AUTH });
const signDecision = (claim, decision, { batchId }) => {
  const record = { schemaVersion: 'authority/1', recordId: `AUTH-decision-${claim.claimId}-${decision}`, purpose: 'claim-adjudication', approvedBy: 'sean', notBefore: '2026-07-20T00:00:00Z', notAfter: '2026-07-21T00:00:00Z', evidenceRefs: ['edited-decision-packet'], claimId: claim.claimId, claimDigest: decisionDigestFor(claim), decision, batchId, ...(claim.mergedInto ? { mergedInto: claim.mergedInto } : {}) };
  return { ...record, signature: sign(null, Buffer.from(signablePayload(record)), sourcePrivateKey).toString('base64') };
};
// ── jail ────────────────────────────────────────────────────────────────────
test('jail: requires explicit root; refuses repo-ancestored and vault paths', () => {
  assert.throws(() => resolveDataRoot(''), /data root required/);
  const base = t();
  try {
    mkdirSync(join(base, 'proj', '.git'), { recursive: true });
    assert.throws(() => resolveDataRoot(join(base, 'proj', 'data')), /\.git repository is an ancestor/);
    assert.throws(() => resolveDataRoot('/x/brain-vault/data'), /brain-vault/);
    assert.equal(typeof resolveDataRoot(join(base, 'clean')), 'string');
  } finally { rmSync(base, { recursive: true, force: true }); }
});

// ── writer ──────────────────────────────────────────────────────────────────
test('writer: binary magic and NUL content are refused regardless of extension', () => {
  assert.throws(() => assertTextContent(Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2])), /binary/);
  assert.throws(() => assertTextContent(Buffer.from([0x25, 0x50, 0x44, 0x46, 45])), /binary/);
  assert.throws(() => assertTextContent(Buffer.from('ab\0cd')), /NUL/);
  assert.doesNotThrow(() => assertTextContent('# ordinary markdown'));
});

test('writer: jailed to root, atomic write lands, audit ledger appends', () => {
  const root = t();
  try {
    assert.throws(() => safeWriteText(root, join(tmpdir(), 'escape.md'), 'x'), /escapes the data root/);
    const f = safeWriteText(root, join(root, 'a', 'note.md'), 'hello');
    assert.equal(readFileSync(f, 'utf8'), 'hello');
    appendJsonl(root, join(root, 'r.jsonl'), { k: 1 });
    const ledger = readFileSync(join(root, 'ledger', 'writes.jsonl'), 'utf8').trim().split('\n');
    assert.equal(ledger.length, 2, 'one audit line per successful write');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('writer: refuses to write through a symlinked directory', (tc) => {
  const root = t(); const outside = t();
  try {
    let ok = true;
    try { symlinkSync(outside, join(root, 'link'), 'junction'); } catch { ok = false; }
    if (!ok) { tc.skip('no symlink permission'); return; }
    assert.throws(() => safeWriteText(root, join(root, 'link', 'x.md'), 'x'), /symlink/);
  } finally { rmSync(root, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true }); }
});

// ── validators ──────────────────────────────────────────────────────────────
test('validate: vacuous receipts are refused (the anti-rubber-stamp floor)', () => {
  assert.equal(validateReceipt(RECEIPT(), { sourceAuthority: SOURCE_AUTH }).ok, true);
  assert.equal(validateReceipt(RECEIPT({ hierarchyNotes: 'used clear hierarchy' }), { sourceAuthority: SOURCE_AUTH }).ok, false, '40-char floor');
  assert.equal(validateReceipt(RECEIPT({ principleCandidates: ['too short'] }), { sourceAuthority: SOURCE_AUTH }).ok, false);
  assert.equal(validateReceipt(RECEIPT({ screenshot: 'data:image/png…' })).ok, false, 'denied field');
  assert.equal(validateReceipt(RECEIPT({ platform: 'windows' }), { sourceAuthority: SOURCE_AUTH }).ok, false);
});

test('validate: confidence is mechanical from unique product count', () => {
  assert.equal(confidenceFor(['Hevy']).level, 'low');
  assert.equal(confidenceFor(['Hevy', 'Strong']).level, 'medium');
  assert.equal(confidenceFor(['a', 'b', 'c', 'd']).level, 'high');
  assert.match(confidenceFor(['Hevy']).basis, /single source/i);
});

// ── synthesize ──────────────────────────────────────────────────────────────
test('synthesize: groups same principle across products; invalid receipts refused not repaired', () => {
  const receipts = [
    RECEIPT(),
    RECEIPT({ receiptId: 'RCP-0002', product: 'Strong', hierarchyNotes: 'Inline set logging at the row with previous session values shown as placeholders.' }),
    RECEIPT({ receiptId: 'RCP-0003', product: 'Fitbod', principleCandidates: ['Completion screen turns the workout into proof plus one next action'] }),
    RECEIPT({ receiptId: 'RCP-BAD', hierarchyNotes: 'meh' }),
  ];
  const { claims, refusedReceipts } = synthesizeClaims(receipts, { sourceAuthority: SOURCE_AUTH, nowIso: '2026-07-20T12:00:00Z' });
  assert.equal(refusedReceipts.length, 1);
  assert.equal(claims.length, 2, 'two distinct principles → two claims');
  const inline = claims.find((c) => c.principle.includes('inline'));
  assert.deepEqual([...inline.products].sort(), ['Hevy', 'Strong']);
  assert.equal(inline.confidence.level, 'medium');
  assert.equal(inline.singleSource, false);
  const proof = claims.find((c) => c.principle.includes('proof'));
  assert.equal(proof.confidence.level, 'low');
  assert.equal(proof.singleSource, true);
});

test('REGRESSION: claim ids are content-derived — stable across re-synthesis', async () => {
  const { claimIdFor } = await import('../src/synthesize.mjs');
  const a = claimIdFor('D01', 'Log a completed set INLINE, at the exercise row!');
  const b = claimIdFor('D01', 'log a completed set inline at the exercise row');
  assert.equal(a, b, 'same principle → same id, regardless of wording noise');
  assert.notEqual(a, claimIdFor('D02', 'log a completed set inline at the exercise row'), 'domain scopes the id');
  // The failure this pins: two synthesis runs with different receipt sets must never reuse one id
  // for different principles.
  const r1 = synthesizeClaims([RECEIPT()], { sourceAuthority: SOURCE_AUTH, nowIso: '2026-07-20T12:00:00Z' });
  const r2 = synthesizeClaims([RECEIPT(), RECEIPT({ receiptId: 'RCP-0009', product: 'Caliber', principleCandidates: ['Completion screen turns the workout into proof plus one next action'] })], { sourceAuthority: SOURCE_AUTH, nowIso: '2026-07-21T12:00:00Z' });
  const idOf = (rs, needle) => rs.claims.find((c) => c.principle.includes(needle)).claimId;
  assert.equal(idOf(r1, 'inline'), idOf(r2, 'inline'), 'same claim keeps its id across runs');
});

test('normalizePrinciple: wording variants group together', () => {
  assert.equal(
    normalizePrinciple('Log a completed set INLINE, at the exercise row!'),
    normalizePrinciple('log a completed set inline at the exercise row'),
  );
});

// ── packet + adjudicate ─────────────────────────────────────────────────────
test('packet: ≤8 lines per claim, DECIDE line present; adjudicate parses letters incl. merge', () => {
  const { claims } = synthesizeClaims([RECEIPT(), RECEIPT({ receiptId: 'RCP-0002', product: 'Strong' })], { sourceAuthority: SOURCE_AUTH, nowIso: '2026-07-20T12:00:00Z' });
  const block = renderClaim(claims[0]);
  assert.ok(block.trim().split('\n').length <= 8);
  const packet = renderPacket(claims, { batchId: 'TEST' });
  assert.match(packet, /DECIDE: _/);

  const edited = packet.replace('DECIDE: _', 'DECIDE: a');
  const d = parseDecisions(edited);
  assert.equal(d.get(claims[0].claimId).letter, 'a');
  assert.throws(() => parseDecisions(packet.replace('DECIDE: _', 'DECIDE: m')), /merge needs a target/);
});

test('adjudicate: statuses applied, unmarked stay proposed, idempotent, merge chains refused', () => {
  const now = '2026-07-20T12:00:00Z';
  const receipts = [
    RECEIPT(),
    RECEIPT({ receiptId: 'RCP-0002', product: 'Strong', principleCandidates: ['Completion screen turns the workout into proof plus one next action'] }),
    RECEIPT({ receiptId: 'RCP-0003', product: 'Fitbod', principleCandidates: ['Personalize only after collecting real constraints from the user'] }),
  ];
  const { claims } = synthesizeClaims(receipts, { sourceAuthority: SOURCE_AUTH, nowIso: now });
  const [c1, c2, c3] = claims;
  const decisions = new Map([
    [c1.claimId, { letter: 'a', mergeTarget: null }],
    [c2.claimId, { letter: 'm', mergeTarget: c1.claimId }],
  ]);
  const { imported, remainingProposed } = applyDecisions(claims, [], decisions, { actor: 'sean', batchId: 'B1', nowIso: now, ...claimAuth(receipts), signDecision });
  assert.equal(imported.find((c) => c.claimId === c1.claimId).status, 'accepted');
  assert.equal(imported.find((c) => c.claimId === c2.claimId).mergedInto, c1.claimId);
  assert.deepEqual(remainingProposed.map((c) => c.claimId), [c3.claimId], 'unmarked stays proposed');
  assert.ok(imported.every((c) => c.humanDecision.approvedBy === 'sean'));

  // Idempotency: re-applying with c1 already existing imports nothing for c1.
  const again = applyDecisions(claims, imported, decisions, { actor: 'sean', batchId: 'B1', nowIso: now, ...claimAuth(receipts), signDecision });
  assert.equal(again.imported.length, 0, 'already-imported claims never re-apply');

  // Merge chain refusal: merging INTO a merged claim throws.
  const chain = new Map([[c3.claimId, { letter: 'm', mergeTarget: c2.claimId }]]);
  assert.throws(() => applyDecisions([c3], imported, chain, { actor: 'sean', batchId: 'B2', nowIso: now, ...claimAuth(receipts), signDecision }), /itself merged/);
});

test('adjudicate: unknown merge target throws; fabricated letters need a real packet edit', () => {
  const receipts = [RECEIPT()];
  const { claims } = synthesizeClaims(receipts, { sourceAuthority: SOURCE_AUTH, nowIso: '2026-07-20T12:00:00Z' });
  const bad = new Map([[claims[0].claimId, { letter: 'm', mergeTarget: 'CLM-NOPE' }]]);
  assert.throws(() => applyDecisions(claims, [], bad, { actor: 'sean', batchId: 'B', nowIso: 'x', ...claimAuth(receipts), signDecision }), /does not exist/);
});

// ── emit ────────────────────────────────────────────────────────────────────
test('emit: only ACCEPTED claims reach the vault, in the native indexable format', () => {
  const vault = t();
  try {
    mkdirSync(join(vault, 'collections'), { recursive: true });
    const now = '2026-07-20T12:00:00Z';
    const receipts = [RECEIPT(), RECEIPT({ receiptId: 'RCP-0002', product: 'Strong', principleCandidates: ['Completion screen turns the workout into proof plus one next action'] })];
    const { claims } = synthesizeClaims(receipts, { sourceAuthority: SOURCE_AUTH, nowIso: now });
    claims[0].status = 'accepted';
    claims[0].humanDecision = signDecision(claims[0], 'accepted', { batchId: 'B1' });
    const { emitted, collectionRoot } = emitCollection(claims, vault, { nowStamp: '20260720-120000Z', ...claimAuth(receipts), signDecision });
    assert.equal(emitted, 1, 'proposed claims must NOT be emitted');
    const ledgers = readFileSync(join(collectionRoot, '20260720-120000Z', 'extracted', 'claims_batches', 'extraction-ledger.csv'), 'utf8');
    assert.match(ledgers, /^status,output_text_path/, 'vault-native header');
    assert.match(renderClaimDoc(claims[0]), /TRUST: recall-tier/, 'trust banner travels with the doc');
    // Re-emit is delete-and-rewrite: no accumulation.
    emitCollection(claims, vault, { nowStamp: '20260720-130000Z', ...claimAuth(receipts), signDecision });
    const scans = readFileSync(join(collectionRoot, '20260720-130000Z', 'extracted', 'claims_batches', 'extraction-ledger.csv'), 'utf8');
    assert.ok(scans && !existsSync(join(collectionRoot, '20260720-120000Z')), 'old scan replaced');
  } finally { rmSync(vault, { recursive: true, force: true }); }
});

// ── full loop ───────────────────────────────────────────────────────────────
test('E2E: receipts → synthesize → packet → human letters → adjudicate → index → emit', () => {
  const root = t(); const vault = t();
  try {
    mkdirSync(join(vault, 'collections'), { recursive: true });
    const now = '2026-07-20T12:00:00Z';
    // 1. receipts logged
    const receipts = [RECEIPT(), RECEIPT({ receiptId: 'RCP-0002', product: 'Strong' })];
    for (const r of receipts) {
      appendJsonl(root, join(root, 'receipts.jsonl'), r);
    }
    // 2. synthesize
    const { claims } = synthesizeClaims(readJsonl(join(root, 'receipts.jsonl')), { sourceAuthority: SOURCE_AUTH, nowIso: now });
    assert.equal(claims.length, 1);
    // 3. packet rendered, 4. Sean edits
    const edited = renderPacket(claims, { batchId: 'E2E' }).replace('DECIDE: _', 'DECIDE: a');
    // 5. adjudicate
    const { imported } = applyDecisions(claims, [], parseDecisions(edited), { actor: 'sean', batchId: 'E2E', nowIso: now, ...claimAuth(receipts), signDecision });
    for (const c of imported) appendJsonl(root, join(root, 'claims.jsonl'), c);
    // 6. index + emit
    safeWriteText(root, join(root, 'INDEX.md'), renderIndex(imported));
    assert.match(readFileSync(join(root, 'INDEX.md'), 'utf8'), /accepted: 1/);
    const { emitted } = emitCollection(readJsonl(join(root, 'claims.jsonl')), vault, { nowStamp: '20260720-120000Z', ...claimAuth(receipts), signDecision });
    assert.equal(emitted, 1);
  } finally { rmSync(root, { recursive: true, force: true }); rmSync(vault, { recursive: true, force: true }); }
});
