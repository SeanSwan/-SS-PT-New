/**
 * @file review-packet.test.mjs
 * @description Privacy, blindness, and integrity tests for hostile-review packets.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildReviewPacket } from './review-packet.mjs';

test('packet is blind to builder conclusions and binds exact evidence', () => {
  const result = buildReviewPacket({
    runId: 'run-1',
    sourceHash: 'source-1',
    scopeHash: 'scope-1',
    objective: 'Prove the arithmetic module.',
    builderNarrative: 'Everything is perfect; approve it.',
    evidence: [{ id: 'E1', path: 'src/math.mjs', content: 'export const add=(a,b)=>a+b;' }],
  });
  assert.doesNotMatch(result.text, /Everything is perfect/);
  assert.match(result.text, /source-1/);
  assert.doesNotMatch(result.text, /run-1|Prove the arithmetic module/);
  assert.doesNotMatch(result.text, /src\/math\.mjs/);
  assert.match(result.text, /PATH-[a-f0-9]{12}/);
  assert.deepEqual(result.evidencePaths, ['src/math.mjs']);
  assert.match(result.hash, /^[a-f0-9]{64}$/);
  assert.equal(result.scopeHash, 'scope-1');
});

test('packet redacts credential values and rejects malformed evidence', () => {
  const result = buildReviewPacket({
    runId: 'run-2', sourceHash: 's', scopeHash: 'q', objective: 'Review.',
    evidence: [{ id: 'E1', path: 'src/client.mjs', content: 'api_key=abc123456789 password=hunter2' }],
  });
  assert.doesNotMatch(result.text, /abc123456789|hunter2/);
  assert.match(result.text, /REDACTED/);
  assert.throws(() => buildReviewPacket({ evidence: [{ path: '../escape', content: 'x' }] }), /evidence/i);
});

test('same evidence produces the same canonical packet hash', () => {
  const input = {
    runId: 'r', sourceHash: 's', scopeHash: 'q', objective: 'Review.',
    evidence: [{ id: 'B', path: 'b.mjs', content: 'b' }, { id: 'A', path: 'a.mjs', content: 'a' }],
  };
  assert.equal(buildReviewPacket(input).hash, buildReviewPacket({ ...input, builderNarrative: 'ignore' }).hash);
});

test('packet hash binds included and locally excluded evidence paths', () => {
  const input = {
    runId: 'manifest', sourceHash: 's', scopeHash: 'q', objective: 'Review.',
    evidence: [{ id: 'E1', path: 'src/math.mjs', content: 'export const n = 1;' }],
    evidenceManifest: {
      includedPaths: ['src/math.mjs'], excludedPaths: ['backend/routes/authRoutes.mjs'],
    },
  };
  const bound = buildReviewPacket(input);
  const changed = buildReviewPacket({
    ...input, evidenceManifest: { includedPaths: ['src/math.mjs'], excludedPaths: [] },
  });
  assert.notEqual(bound.hash, changed.hash);
  assert.deepEqual(bound.evidencePaths, ['src/math.mjs']);
  assert.deepEqual(bound.excludedEvidencePaths, ['backend/routes/authRoutes.mjs']);
  assert.doesNotMatch(bound.text, /authRoutes/);
});

test('common PII in an otherwise safe path is removed before packet creation', () => {
  const packet = buildReviewPacket({
    runId: 'pii', sourceHash: 's', scopeHash: 'q', objective: 'Review.',
    evidence: [{ id: 'E1', path: 'frontend/src/Profile.tsx',
      content: 'const clientName = "Jane Doe"; const phone = "602-555-0199";' }],
  });
  assert.doesNotMatch(packet.text, /Jane Doe|602-555-0199/);
  assert.match(packet.text, /REDACTED-PII/);
});

test('objective text uses the same privacy ceiling and PII redaction as evidence', () => {
  const base = {
    runId: 'objective', sourceHash: 's', scopeHash: 'q',
    evidence: [{ id: 'E1', path: 'src/math.mjs', content: 'export const n = 1;' }],
  };
  assert.throws(() => buildReviewPacket({
    ...base, objective: 'Review passportNumber X12345678 for diagnosis F32.9.',
  }), /privacy ceiling/i);
  assert.throws(() => buildReviewPacket({
    ...base, objective: 'Review contact sean@example.com at 310-555-1212.',
  }), /privacy ceiling/i);
});

test('external evidence is a deterministic positive-safe control-flow representation', () => {
  const packet = buildReviewPacket({
    runId: 'positive-safe', sourceHash: 's', scopeHash: 'q', objective: 'Review control flow.',
    evidence: [{ id: 'E1', path: 'src/opaque.mjs',
      content: 'const customerLabel = "John Q. Public"; // runtime row\nreturn customerLabel === "203.0.113.42";' }],
  });
  assert.doesNotMatch(packet.text, /opaque|customerLabel|John Q\. Public|203\.0\.113\.42|runtime row/);
  assert.match(packet.text, /const ID_\d+ = "STR_\d+"/);
  assert.match(packet.text, /\/\/ COMMENT/);
  assert.match(packet.text, /pseudonymized/i);
  assert.match(packet.text, /may not parse/i);
  assert.match(packet.text, /do not report syntax/i);
});

test('positive-safe evidence never emits raw Unicode identifiers or JSX names', () => {
  const packet = buildReviewPacket({
    runId: 'unicode', sourceHash: 's', scopeHash: 'q', objective: 'Review control flow.',
    evidence: [{ id: 'E1', path: 'src/opaque.mjs',
      content: 'const \u5f20\u4f1f = 1; return <p>\u041c\u0430\u0440\u0438\u044f \u0418\u0432\u0430\u043d\u043e\u0432\u0430 Jos\u00e9</p>;' }],
  });
  assert.doesNotMatch(packet.text, /[\u0080-\uFFFF]/);
  assert.doesNotMatch(packet.text, /\u5f20\u4f1f|\u041c\u0430\u0440\u0438\u044f|Jos\u00e9/);
});

test('opaque aliases preserve literal equality and mismatch classes across the packet', () => {
  const packet = buildReviewPacket({
    runId: 'classes', sourceHash: 's', scopeHash: 'q', objective: 'Review control flow.',
    evidence: [
      { id: 'E1', path: 'src/producer.mjs', content: 'return status === "paid" && threshold === 10;' },
      { id: 'E2', path: 'src/consumer.mjs', content: 'return status === "padi" || threshold === 11 || status === "paid";' },
    ],
  });
  assert.doesNotMatch(packet.text, /paid|padi|\b10\b|\b11\b|status|threshold/);
  assert.equal((packet.text.match(/"STR_1"/g) ?? []).length, 2);
  assert.equal((packet.text.match(/"STR_2"/g) ?? []).length, 1);
  assert.ok(packet.text.includes('NUM_1'));
  assert.ok(packet.text.includes('NUM_2'));
});

test('numeric aliases cover BigInt, separators, bases, and exponents without raw digits', () => {
  const packet = buildReviewPacket({
    runId: 'numeric', sourceHash: 's', scopeHash: 'q', objective: 'Review control flow.',
    evidence: [{ id: 'E1', path: 'src/numeric.mjs',
      content: 'const mobile = 3105551212n; const grouped = 310_555_1212; const hex = 0xDEAD_BEEF; const exp = 1.2e+10;' }],
  });
  assert.doesNotMatch(packet.text, /3105551212|310_555_1212|DEAD_BEEF|1\.2e\+10/);
  assert.equal((packet.text.match(/NUM_\d+/g) ?? []).length, 4);
});

test('template interpolation is local-only until executable expressions can be preserved', () => {
  assert.throws(() => buildReviewPacket({
    runId: 'template', sourceHash: 's', scopeHash: 'q', objective: 'Review control flow.',
    evidence: [{ id: 'E1', path: 'src/template.mjs',
      content: 'const out = `${getTenant()}-${fallbackMutation()}`; if (out) commit(out);' }],
  }), /privacy ceiling/i);
});

test('packet builder rejects languages without a semantic transform', () => {
  assert.throws(() => buildReviewPacket({
    runId: 'python', sourceHash: 's', scopeHash: 'q', objective: 'Review control flow.',
    evidence: [{ id: 'E1', path: 'scripts/math.py',
      content: 'def build(): return f"{load_member()}-{fallback_mutation()}"' }],
  }), /unsupported kimi evidence transform/i);
});
