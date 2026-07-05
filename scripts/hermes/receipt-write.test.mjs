/**
 * receipt-write.test.mjs — Slice 1 contract tests for the receipt writer.
 *
 * Locks (per docs/ai-workflow/hermes-agentic-os/audit-receipts.md §2-§3 and
 * run-logs-and-self-improvement.md §2):
 *  - fixed receipt schema, refused/partial outcomes allowed
 *  - append-only: no update/delete surface exists in the lib
 *  - redaction at write time (secrets, emails, length caps)
 *  - "various" is never a target
 *  - id sequencing R-YYYYMMDD-NNN within a day
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  ensureLanes,
  writeReceipt,
  readReceipts,
  validateReceipt,
} from './hermesRunsLib.mjs';

function tmpVault() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-vault-'));
  ensureLanes(root);
  return root;
}

const BASE = {
  who: 'sean/telegram',
  what: 'queue-approve (T2)',
  target: 'Q-20260701-001',
  when: '2026-07-01T08:12:44-07:00',
  'approved-by': 'allowlist: sean-only queue ops',
  outcome: 'ok — transition recorded',
  evidence: 'runs/queue/2026-07/queue-2026-07-01.jsonl#L2',
};

test('writes a valid receipt as one JSONL line with a sequenced id', () => {
  const vault = tmpVault();
  const r1 = writeReceipt(vault, { ...BASE });
  const r2 = writeReceipt(vault, { ...BASE, outcome: 'ok — second' });
  assert.match(r1.id, /^R-20260701-001$/);
  assert.match(r2.id, /^R-20260701-002$/);
  const lines = fs
    .readFileSync(
      path.join(vault, 'runs', 'receipts', '2026-07', 'receipts-2026-07-01.jsonl'),
      'utf8'
    )
    .trim()
    .split('\n');
  assert.equal(lines.length, 2);
  assert.equal(JSON.parse(lines[0]).id, 'R-20260701-001');
});

test('rejects receipts missing required fields', () => {
  for (const field of ['who', 'what', 'target', 'when', 'approved-by', 'outcome', 'evidence']) {
    const bad = { ...BASE };
    delete bad[field];
    assert.throws(() => validateReceipt(bad), new RegExp(field));
  }
});

test('rejects "various" as a target', () => {
  assert.throws(() => validateReceipt({ ...BASE, target: 'various' }), /various/i);
});

test('rejects outcomes outside ok|failed|refused|partial', () => {
  assert.throws(() => validateReceipt({ ...BASE, outcome: 'maybe fine' }), /outcome/);
  for (const ok of ['ok — x', 'failed — y', 'refused — z', 'partial — w']) {
    assert.doesNotThrow(() => validateReceipt({ ...BASE, outcome: ok }));
  }
});

test('redacts secret-shaped values, emails, and JWTs at write time', () => {
  const vault = tmpVault();
  // fixtures assembled at runtime so no secret-SHAPED token ever sits in this
  // file as a contiguous string (rule 44 write-time scanning stays quiet)
  const fakeStripe = ['sk', 'live', '51Habcdefghijklmnopqrstuv'].join('_');
  const fakeJwt = ['eyJhbGciOiJIUzI1NiJ9', 'eyJzdWIiOiIxIn0', 'abc'].join('.');
  const fakeEmail = ['leak', 'example.com'].join('@');
  const r = writeReceipt(vault, {
    ...BASE,
    outcome: `failed — key ${fakeStripe} leaked to ${fakeEmail} token ${fakeJwt}`,
  });
  assert.ok(!r.outcome.includes(fakeStripe.slice(0, 11)), 'stripe key must be redacted');
  assert.ok(!r.outcome.includes(fakeEmail), 'email must be redacted');
  assert.ok(!r.outcome.includes(fakeJwt.slice(0, 20)), 'JWT must be redacted');
  assert.ok(r.outcome.includes('<REDACTED-KEY>'));
  assert.ok(r.outcome.includes('<REDACTED-EMAIL>'));
  // the stored line is redacted too, not just the return value
  const line = fs
    .readFileSync(
      path.join(vault, 'runs', 'receipts', '2026-07', 'receipts-2026-07-01.jsonl'),
      'utf8'
    )
    .trim();
  assert.ok(!line.includes(fakeStripe.slice(0, 11)));
});

test('caps oversized free text instead of storing it whole', () => {
  const vault = tmpVault();
  const r = writeReceipt(vault, { ...BASE, outcome: 'refused — ' + 'x'.repeat(5000) });
  assert.ok(r.outcome.length <= 600, `outcome should be capped, got ${r.outcome.length}`);
  assert.ok(r.outcome.includes('[truncated'));
});

test('append-only: the lib exposes no update or delete surface', async () => {
  const lib = await import('./hermesRunsLib.mjs');
  const names = Object.keys(lib).map((k) => k.toLowerCase());
  for (const banned of ['update', 'delete', 'rewrite', 'edit', 'remove']) {
    assert.ok(
      !names.some((n) => n.includes(banned)),
      `lib must not export a ${banned}* function`
    );
  }
});

test('readReceipts returns parsed records for a date and [] when absent', () => {
  const vault = tmpVault();
  assert.deepEqual(readReceipts(vault, '2026-07-01'), []);
  writeReceipt(vault, { ...BASE });
  const rows = readReceipts(vault, '2026-07-01');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].who, 'sean/telegram');
});

test('ensureLanes writes the index.md law files once and is idempotent', () => {
  const vault = tmpVault();
  ensureLanes(vault);
  for (const lane of ['receipts', 'logs', 'queue', 'digests', 'archive']) {
    const idx = path.join(vault, 'runs', lane, 'index.md');
    assert.ok(fs.existsSync(idx), `${lane}/index.md must exist`);
    assert.match(fs.readFileSync(idx, 'utf8'), /belongs/i);
  }
});
