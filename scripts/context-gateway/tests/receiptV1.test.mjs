/**
 * receiptV1.test.mjs — the consult lane's audit record (S0 of the flywheel).
 * Run: node --test scripts/context-gateway/tests/receiptV1.test.mjs
 *
 * The load-bearing tests here are the NEGATIVE ones. A receipt writer is only trustworthy if it
 * CANNOT record a prompt, a response, or an absolute path — so those are asserted as absences
 * (Rule 79: a positive-only assertion lets a leak creep back in silently).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  buildReceiptV1, writeReceiptV1, recordConsult, relativizePath, sha256,
  RECEIPT_SCHEMA, OUTCOMES, ERROR_CODES,
} from '../src/receiptV1.mjs';

const STAMP = '20260813T170000Z';
const base = (over = {}) => ({ stamp: STAMP, root: '/repo', providerName: 'kimi', ...over });

test('records the operational fields a routing decision needs', () => {
  const r = buildReceiptV1(base({
    provider: { model: 'moonshotai/kimi-k3', ceiling: 'design' },
    result: { model: 'moonshotai/kimi-k3', inTok: 3423, outTok: 3247, cost: 0.059, wallMs: 106900 },
    spend: { estimate: 0.9384, cap: 3 },
    effort: 'high', maxTokens: 60000, outcome: 'ok',
  }));
  assert.equal(r.schema, RECEIPT_SCHEMA);
  assert.equal(r.lane, 'consult');
  assert.equal(r.model, 'moonshotai/kimi-k3');
  assert.equal(r.ceiling, 'design');
  assert.equal(r.inTok, 3423);
  assert.equal(r.costUsd, 0.059);
  assert.equal(r.spendCapUsd, 3);
  assert.equal(r.outcome, 'ok');
});

test('panel calls can record stage, run provenance, and finding calibration without content', () => {
  const r = buildReceiptV1(base({
    panelRunId: 'aabbccddeeff0011', panelStage: 'fanout',
    findingsRaised: 7, findingsUpheld: 5,
    findingClaims: ['must never be recorded'],
  }));
  assert.equal(r.panelRunId, 'aabbccddeeff0011');
  assert.equal(r.panelStage, 'fanout');
  assert.equal(r.findingsRaised, 7);
  assert.equal(r.findingsUpheld, 5);
  assert.ok(!JSON.stringify(r).includes('must never be recorded'));
});

// ---- the allowlist is the security contract -------------------------------------------------

test('NEVER records prompt or response content, even when handed it', () => {
  const SECRET_ANSWER = 'the full model response text that must never be persisted';
  const r = buildReceiptV1(base({
    // `text` is the real field name callProvider returns — the exact leak this guards.
    result: { model: 'm', text: SECRET_ANSWER, inTok: 1, outTok: 2, cost: 0, wallMs: 1 },
    prompt: 'the full prompt', reasoning: 'chain of thought',
  }));
  const serialized = JSON.stringify(r);
  assert.ok(!serialized.includes(SECRET_ANSWER), 'response text leaked into the receipt');
  assert.ok(!serialized.includes('chain of thought'), 'reasoning leaked into the receipt');
  assert.ok(!('text' in r), 'receipt must not carry a `text` field');
  assert.ok(!('prompt' in r), 'receipt must not carry a `prompt` field');
  assert.ok(!('reasoning' in r), 'receipt must not carry a `reasoning` field');
});

test('an arbitrary extra key cannot widen the record', () => {
  const r = buildReceiptV1(base({ somethingNew: 'should not appear', clientEmail: 'a@b.co' }));
  assert.ok(!('somethingNew' in r));
  assert.ok(!('clientEmail' in r));
  assert.ok(!JSON.stringify(r).includes('a@b.co'));
});

test('redaction KINDS are recorded but never the matched values', () => {
  const r = buildReceiptV1(base({ redactions: 2, redactionKinds: ['EMAIL', 'JWT', 'EMAIL'] }));
  assert.equal(r.redactions, 2);
  assert.deepEqual(r.redactionKinds, ['EMAIL', 'JWT'], 'kinds should dedupe');
});

test('an unknown redaction kind normalizes to OTHER instead of storing caller text', () => {
  // "bounded class name" must be true by construction, not by trusting the producer. A leaked
  // VALUE arriving in the kinds array must not be persisted verbatim.
  const r = buildReceiptV1(base({ redactionKinds: ['EMAIL', 'sk-live-totally-a-secret-value'] }));
  assert.deepEqual(r.redactionKinds, ['EMAIL', 'OTHER']);
  assert.ok(!JSON.stringify(r).includes('sk-live-totally'), 'caller text leaked via redactionKinds');
});

// ---- paths: quasi-PII, so absolute paths must not survive --------------------------------------

test('a path outside the repo is recorded as <external>, not the real path', () => {
  const r = buildReceiptV1(base({ docPath: 'C:/Users/SomePerson/AppData/Local/Temp/packet.md' }));
  assert.equal(r.docPath, '<external>');
  assert.ok(!JSON.stringify(r).includes('SomePerson'), 'OS username leaked via path');
});

test('a path inside the repo is recorded relative, never absolute', () => {
  const r = buildReceiptV1(base({ root: '/repo', docPath: '/repo/docs/plan.md' }));
  assert.equal(r.docPath, 'docs/plan.md');
});

test('a missing seed stays null rather than becoming <external>', () => {
  assert.equal(buildReceiptV1(base({ seedPath: null })).seedPath, null);
  assert.equal(relativizePath('/repo', null), null);
});

test('content identity is preserved by hash instead of by path', () => {
  const body = 'document body';
  const r = buildReceiptV1(base({ docSha: sha256(body), docBytes: Buffer.byteLength(body) }));
  assert.equal(r.docSha, sha256(body));
  assert.equal(r.docBytes, 13);
  assert.ok(!JSON.stringify(r).includes(body), 'document body leaked into the receipt');
});

// ---- enums + idempotency -----------------------------------------------------------------------

test('unknown outcome and error code normalize instead of being stored raw', () => {
  const r = buildReceiptV1(base({ outcome: 'totally-made-up', errorCode: 'WEIRD' }));
  assert.equal(r.outcome, 'error');
  assert.equal(r.errorCode, 'UNKNOWN');
  assert.ok(OUTCOMES.includes(r.outcome));
  assert.ok(ERROR_CODES.includes(r.errorCode));
});

test('a refusal is recorded with its real gate code', () => {
  const r = buildReceiptV1(base({ outcome: 'refused', errorCode: 'CEILING' }));
  assert.equal(r.outcome, 'refused');
  assert.equal(r.errorCode, 'CEILING');
});

test('eventId is DETERMINISTIC for identical inputs and differs across documents', () => {
  // Determinism, NOT idempotency — the store is append-only and does not collapse retries
  // (see the module header). Naming this "idempotent" contradicted the contract it enforces.
  const a = buildReceiptV1(base({ docSha: 'aaa', attempt: 1 }));
  const again = buildReceiptV1(base({ docSha: 'aaa', attempt: 1 }));
  const other = buildReceiptV1(base({ docSha: 'bbb', attempt: 1 }));
  const retry = buildReceiptV1(base({ docSha: 'aaa', attempt: 2 }));
  assert.equal(a.eventId, again.eventId, 'identical inputs must hash identically');
  assert.notEqual(a.eventId, other.eventId, 'different document must differ');
  assert.notEqual(a.eventId, retry.eventId, 'a retry is a distinct attempt');
});

// ---- I/O ---------------------------------------------------------------------------------------

test('writes one parseable file per event into the receipts store', () => {
  const root = mkdtempSync(join(tmpdir(), 'swan-receipt-'));
  const file = writeReceiptV1(buildReceiptV1(base({ root, docSha: 'aaa' })), root);
  const dir = join(root, '.ai-workflow', 'context-gateway', 'receipts');
  assert.equal(readdirSync(dir).length, 1);
  const parsed = JSON.parse(readFileSync(file, 'utf-8'));
  assert.equal(parsed.schema, RECEIPT_SCHEMA);
  assert.equal(parsed.provider, 'kimi');
});

test('two concurrent providers do not collide on one filename', () => {
  const root = mkdtempSync(join(tmpdir(), 'swan-receipt-'));
  for (const p of ['kimi', 'sol', 'hy3']) {
    writeReceiptV1(buildReceiptV1(base({ root, providerName: p, docSha: 'same-doc' })), root);
  }
  const dir = join(root, '.ai-workflow', 'context-gateway', 'receipts');
  assert.equal(readdirSync(dir).length, 3, 'same stamp + same doc must still yield 3 records');
});

// ---- regressions from the hostile pass ---------------------------------------------------------

test('REGRESSION: two different calls in the same second do not collide', () => {
  // The stamp is only second-granular. Same doc + same provider + different --effort used to
  // produce one eventId and therefore one filename, silently destroying a record.
  const a = buildReceiptV1(base({ docSha: 'aaa', effort: 'high', maxTokens: 60000 }));
  const b = buildReceiptV1(base({ docSha: 'aaa', effort: 'low', maxTokens: 60000 }));
  const c = buildReceiptV1(base({ docSha: 'aaa', effort: 'high', maxTokens: 16000 }));
  assert.notEqual(a.eventId, b.eventId, 'differing effort must not collide');
  assert.notEqual(a.eventId, c.eventId, 'differing maxTokens must not collide');

  const root = mkdtempSync(join(tmpdir(), 'swan-receipt-'));
  for (const rec of [a, b, c]) writeReceiptV1(rec, root);
  const dir = join(root, '.ai-workflow', 'context-gateway', 'receipts');
  assert.equal(readdirSync(dir).length, 3, 'all three records must survive');
});

test('REGRESSION: a failure after a paid call still records the real spend', () => {
  // If the --out write throws, the money is already gone. Recording costUsd:null there would
  // silently lose real spend from the ledger.
  const r = buildReceiptV1(base({
    result: { model: 'moonshotai/kimi-k3', inTok: 100, outTok: 200, cost: 0.287, wallMs: 5000 },
    spend: { estimate: 0.9, cap: 3 },
    outcome: 'error', errorCode: 'TRANSPORT',
  }));
  assert.equal(r.costUsd, 0.287, 'spend must survive a post-call failure');
  assert.equal(r.inTok, 100);
  assert.equal(r.outcome, 'error');
});

test('REGRESSION: a refusal carries task identity, not just a gate code', () => {
  // A refusal with no docSha cannot answer "which class of request keeps getting refused".
  const r = buildReceiptV1(base({
    provider: { model: 'moonshotai/kimi-k3', ceiling: 'design' },
    docSha: 'abc123', docBytes: 4096, effort: 'high',
    outcome: 'refused', errorCode: 'CEILING',
  }));
  assert.equal(r.docSha, 'abc123');
  assert.equal(r.docBytes, 4096);
  assert.equal(r.ceiling, 'design');
  assert.equal(r.model, 'moonshotai/kimi-k3');
});

test('REGRESSION: the secret-path jail is recordable and never stores the offending path', () => {
  // consult.mjs's DENY branch exits directly instead of throwing, so it records at the call site.
  // DENY_PATH must survive enum normalization, and the .env path must not be persisted verbatim.
  const r = buildReceiptV1(base({
    docPath: 'C:/Users/SomePerson/project/.env',
    outcome: 'refused', errorCode: 'DENY_PATH',
  }));
  assert.equal(r.errorCode, 'DENY_PATH', 'must not normalize to UNKNOWN');
  assert.equal(r.outcome, 'refused');
  assert.equal(r.docPath, '<external>');
  assert.ok(!JSON.stringify(r).includes('SomePerson'));
  assert.equal(r.docSha, null, 'a denied file is never read, so it has no content hash');
});

test('REGRESSION: filename segments are sanitized, so a hostile provider name cannot escape the store', () => {
  // writeReceiptV1 is exported public API — a `../` in any segment must not traverse out.
  const root = mkdtempSync(join(tmpdir(), 'swan-receipt-'));
  const rec = buildReceiptV1(base({ root, providerName: '../../evil', docSha: 'aaa' }));
  const file = writeReceiptV1(rec, root);
  const dir = join(root, '.ai-workflow', 'context-gateway', 'receipts');
  assert.ok(file.startsWith(dir), `receipt escaped the store: ${file}`);
  assert.equal(readdirSync(dir).length, 1);
});

test('recordConsult returns null instead of throwing when the write fails', () => {
  // A telemetry failure must never take down a consult that already succeeded and already cost money.
  assert.equal(recordConsult({ stamp: STAMP, root: '\0invalid', providerName: 'kimi' }), null);
});
