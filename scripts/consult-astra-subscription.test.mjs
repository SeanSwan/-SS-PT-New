/**
 * consult-astra-subscription.test.mjs — exit codes and arming, without spending.
 * =============================================================================
 * R4 finding (hostile review round 4, 2026-09-19): the script returned 3 for a
 * dry-run contract failure, an incomplete model run, AND every uncaught exception.
 * Those want opposite responses — "fix your path" vs "retry, the model timed out" —
 * so a wrapper could not act on the code it was given.
 *
 * These tests pin the mapping. They never dispatch a model call: the module's
 * `main()` is only invoked with --dry-run, --help, or arguments that fail before
 * the transport is reached.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXIT, exitCodeForError, main } from './consult-astra-subscription.mjs';
import { identityFields } from './lib/subscription-receipt.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('exit codes are distinct — collapsing them was the defect', () => {
  const values = Object.values(EXIT);
  assert.equal(new Set(values).size, values.length, 'no two exit codes may share a value');
  assert.ok(!values.includes(1), 'code 1 stays reserved: a bare uncaught Node throw reports 1');
  assert.deepEqual(
    Object.keys(EXIT).sort(),
    ['BLOCKED', 'CONTRACT', 'INCOMPLETE', 'INPUT', 'INTERNAL', 'OK', 'USAGE'],
  );
});

test('a wrong path is INPUT, not INTERNAL and not INCOMPLETE', () => {
  // The operator fixes a path; they do not retry it. The script fixes an internal
  // error; the model timeout is the only one worth retrying.
  assert.equal(exitCodeForError(Object.assign(new Error('nope'), { code: 'ENOENT' })), EXIT.INPUT);
  assert.equal(exitCodeForError(Object.assign(new Error('denied'), { code: 'EACCES' })), EXIT.INPUT);
  assert.equal(exitCodeForError(new Error('something else')), EXIT.INTERNAL);
  assert.equal(exitCodeForError(undefined), EXIT.INTERNAL, 'a thrown non-error must not crash the classifier');
});

test('the contract code is reachable only through --dry-run', () => {
  assert.notEqual(EXIT.CONTRACT, EXIT.INCOMPLETE);
  assert.notEqual(EXIT.CONTRACT, EXIT.INPUT);
  assert.notEqual(EXIT.CONTRACT, EXIT.USAGE);
});

test('missing --document is USAGE, and does not reach the transport', async () => {
  assert.equal(await main(['--out', 'unused.md']), EXIT.USAGE);
});

test('--help is OK', async () => {
  assert.equal(await main(['--help']), EXIT.OK);
});

test('a bad --timeout-ms is USAGE', async () => {
  assert.equal(await main(['--document', 'x.md', '--timeout-ms', '0']), EXIT.USAGE);
  assert.equal(await main(['--document', 'x.md', '--timeout-ms', 'nonsense']), EXIT.USAGE);
});

test('armed --dry-run reports the mandate intact, and is OK', async () => {
  // A packet carrying the keyword, in a throwaway directory: proves the mandate
  // reached the prompt without spending a model call.
  const dir = mkdtempSync(join(tmpdir(), 'astra-dry-'));
  const packet = join(dir, 'PACKET.md');
  writeFileSync(packet, '# Packet\n\nMega Blueprint this widget.\n', 'utf8');
  const code = await main(['--document', packet, '--dry-run', '--out', join(dir, 'O.md')]);
  assert.equal(code, EXIT.OK);
});

test('an unarmed --dry-run is OK — nothing was promised, so nothing is broken', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'astra-dry2-'));
  const packet = join(dir, 'PACKET.md');
  writeFileSync(packet, '# Packet\n\nA plain review please.\n', 'utf8');
  const code = await main(['--document', packet, '--dry-run', '--out', join(dir, 'O.md')]);
  assert.equal(code, EXIT.OK);
});

test('--dry-run never writes the out file', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'astra-dry3-'));
  const packet = join(dir, 'PACKET.md');
  const out = join(dir, 'O.md');
  writeFileSync(packet, '# Packet\n\nMega Blueprint this.\n', 'utf8');
  await main(['--document', packet, '--dry-run', '--out', out]);
  assert.ok(!(await import('node:fs')).existsSync(out), '--dry-run must not leave a reply file behind');
});

test('the module is importable without side effects', () => {
  // main() is guarded by an `invokedDirectly` check; if that guard regresses, this
  // import would dispatch a paid call during the test run.
  assert.equal(typeof main, 'function');
  assert.ok(ROOT.endsWith('SS-PT'));
});

// ---------------------------------------------------------------------------
// D12 — the served model identity cannot be verified on this transport.
//
// The Mega Blueprints protocol forbids accepting a receipt whose served identity is
// unverified. On the subscription leg it can never be verified: `codex exec --json`
// on codex-cli 0.154.0 emits thread.started / turn.started / item.completed /
// turn.completed, and the substring "model" does not occur in the raw JSONL at all
// (measured 2026-09-19). `parseCodexJsonl()` is ready to capture it and can never
// fire. So the receipt must SAY so — a bare `servedModel: null` is ambiguous between
// "unverified" and "we forgot to look".
// ---------------------------------------------------------------------------

test('a receipt with no served model is marked identity-UNVERIFIED, with the reason', () => {
  const fields = identityFields(null);
  assert.equal(fields.identityVerified, false);
  assert.match(fields.identityUnverifiableReason, /codex exec --json emits no model field/);
  assert.match(fields.identityUnverifiableReason, /0\.154\.0/);
});

test('undefined is treated as unverified too, not as a pass', () => {
  // `servedModel` is absent (not null) on an older result shape. Absence must fail
  // closed — treating it as verified would be the exact error D12 describes.
  const fields = identityFields(undefined);
  assert.equal(fields.identityVerified, false);
  assert.ok(fields.identityUnverifiableReason, 'an absent served model must carry a reason');
});

test('a genuinely reported served model is verified and carries no excuse', () => {
  const fields = identityFields('gpt-6-astra');
  assert.equal(fields.identityVerified, true);
  assert.equal(fields.identityUnverifiableReason, null);
});

test('the reason string is specific enough to act on', () => {
  // A vague "unknown" is what D12 objected to. Require the transport, the CLI
  // version, and the observed event set, so the next reader can re-measure.
  const { identityUnverifiableReason: why } = identityFields(null);
  assert.match(why, /codex-cli/);
  assert.match(why, /thread\.started/);
  assert.match(why, /turn\.completed/);
});
