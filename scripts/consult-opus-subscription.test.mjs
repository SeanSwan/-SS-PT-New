/**
 * consult-opus-subscription.test.mjs — exit codes, effort validation and arming, without
 * spending a cent.
 * ==============================================================================
 * Mirrors `consult-astra-subscription.test.mjs` for the Claude leg. The contract is the same
 * on purpose: a caller that wraps one leg should be able to wrap the other.
 *
 * NO TEST HERE DISPATCHES A MODEL CALL, AND THAT IS A DELIBERATE, LOAD-BEARING CHOICE.
 * The obvious test to write next is "a dispatch with no valid auth returns BLOCKED". It was
 * written, run, and then DELETED: it passes today only because the CLI is logged out, and the
 * moment `claude auth login` is run it would return 0 — after spending a real Opus 5 call on
 * the subscription, inside the test suite, on every run. A test that becomes a spending test
 * when the environment changes is worse than no test. The blocked path is proven by hand
 * instead (see the session record) and by the runner's own injected-fake tests.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EXIT, exitCodeForError, main, parseArgs } from './consult-opus-subscription.mjs';
import {
  identityFields, SERVED_MODEL_UNREPORTED_CLAUDE, SERVED_MODEL_UNVERIFIABLE_NOTE,
} from './lib/subscription-receipt.mjs';
import { CLAUDE_EFFORT_LEVELS } from './mcp/swan-claude-subscription.mjs';

const packetIn = (body) => {
  const dir = mkdtempSync(join(tmpdir(), 'opus-test-'));
  const path = join(dir, 'PACKET.md');
  writeFileSync(path, body, 'utf8');
  return { dir, path };
};

test('exit codes are distinct — collapsing them was the Astra R4 defect', () => {
  const values = Object.values(EXIT);
  assert.equal(new Set(values).size, values.length, 'no two exit codes may share a value');
  assert.ok(!values.includes(1), 'code 1 stays reserved: a bare uncaught Node throw reports 1');
  assert.deepEqual(
    Object.keys(EXIT).sort(),
    ['BLOCKED', 'CONTRACT', 'INCOMPLETE', 'INPUT', 'INTERNAL', 'OK', 'USAGE'],
  );
});

test('the exit-code map matches the Astra leg exactly — wrappers must not branch per leg', async () => {
  const { EXIT: ASTRA_EXIT } = await import('./consult-astra-subscription.mjs');
  assert.deepEqual(EXIT, ASTRA_EXIT, 'the two subscription legs must share one exit vocabulary');
});

test('a wrong path is INPUT, not INTERNAL and not INCOMPLETE', () => {
  assert.equal(exitCodeForError(Object.assign(new Error('nope'), { code: 'ENOENT' })), EXIT.INPUT);
  assert.equal(exitCodeForError(Object.assign(new Error('denied'), { code: 'EACCES' })), EXIT.INPUT);
  assert.equal(exitCodeForError(new Error('something else')), EXIT.INTERNAL);
  assert.equal(exitCodeForError(undefined), EXIT.INTERNAL, 'a thrown non-error must not crash the classifier');
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

// ---------------------------------------------------------------------------
// --effort — the divergence from the codex leg, and the reason it needs tests.
//
// `claude -p` takes a real per-call effort flag, so a typo is a silent no-op unless it is
// rejected here: the CLI would ignore an unknown level and the run would look configured
// while running at the default. An effort that is silently dropped is worse than one that
// is refused, because nothing in the artifact would reveal it.
// ---------------------------------------------------------------------------

test('an unknown --effort is USAGE, not a silently-ignored flag', async () => {
  assert.equal(await main(['--document', 'x.md', '--effort', 'turbo']), EXIT.USAGE);
  assert.equal(await main(['--document', 'x.md', '--effort', 'HIGH']), EXIT.USAGE, 'levels are lowercase');
});

test('every advertised effort level is accepted by the parser', () => {
  for (const level of CLAUDE_EFFORT_LEVELS) {
    const options = parseArgs(['--document', 'x.md', '--effort', level]);
    assert.equal(options.effort, level);
  }
});

test('omitting --effort yields null, meaning "let the CLI decide" — not a default we invented', () => {
  assert.equal(parseArgs(['--document', 'x.md']).effort, null);
});

test('the default model is the Claude Opus 5 subscription id', () => {
  assert.equal(parseArgs(['--document', 'x.md']).model, 'claude-opus-5');
});

test('the default output path does not collide with the Astra leg', () => {
  assert.match(parseArgs(['--document', 'x.md']).out, /OPUS-SUBSCRIPTION-REPLY\.md$/);
});

test('--dry-run defaults off — a dry run must be asked for', () => {
  assert.equal(parseArgs(['--document', 'x.md']).dryRun, false);
});

test('mega-blueprint is tri-state: unset, forced on, forced off', () => {
  assert.equal(parseArgs(['--document', 'x.md']).megaBlueprint, null);
  assert.equal(parseArgs(['--document', 'x.md', '--mega-blueprint']).megaBlueprint, true);
  assert.equal(parseArgs(['--document', 'x.md', '--no-mega-blueprint']).megaBlueprint, false);
});

test('armed --dry-run reports the mandate intact, and is OK', async () => {
  const { path, dir } = packetIn('# Packet\n\nMega Blueprint this widget.\n');
  assert.equal(await main(['--document', path, '--dry-run', '--out', join(dir, 'O.md')]), EXIT.OK);
});

test('an unarmed --dry-run is OK — nothing was promised, so nothing is broken', async () => {
  const { path, dir } = packetIn('# Packet\n\nA plain review please.\n');
  assert.equal(await main(['--document', path, '--dry-run', '--out', join(dir, 'O.md')]), EXIT.OK);
});

test('--dry-run never writes the out file', async () => {
  const { path, dir } = packetIn('# Packet\n\nMega Blueprint this.\n');
  const out = join(dir, 'O.md');
  await main(['--document', path, '--dry-run', '--out', out]);
  assert.ok(!existsSync(out), '--dry-run must not leave a reply file behind');
});

// ---------------------------------------------------------------------------
// The trap this leg was nearly shipped with.
//
// `identityFields()` was generalised from the Astra leg, where the unverifiable reason is the
// codex sentence — "codex exec --json emits no model field". That sentence is FALSE of the
// Claude transport, whose stream carries a `model` field. Passing the default would have
// stamped a codex-specific falsehood onto every Opus receipt: a receipt that lies about the
// transport it describes, in the one field that exists to stop the identity being ambiguous.
// ---------------------------------------------------------------------------

test('an Opus receipt carries the CLAUDE reason, never the codex one', () => {
  const { identityUnverifiableReason: why } = identityFields(
    null, { unverifiableReason: SERVED_MODEL_UNREPORTED_CLAUDE },
  );
  assert.match(why, /claude-cli/);
  assert.doesNotMatch(why, /codex exec --json emits no model field/, 'the codex reason must not leak');
});

test('the two legs\' reasons are different strings — the whole point of the parameter', () => {
  assert.notEqual(SERVED_MODEL_UNREPORTED_CLAUDE, SERVED_MODEL_UNVERIFIABLE_NOTE);
});

test('the Claude reason admits what is UNTESTED rather than overclaiming', () => {
  // The only body observed this session was the auth-failure path, which reports no model.
  // Whether a successful run names its served model was never measured, so the receipt must
  // say UNTESTED — a confident claim here would be exactly the "config file as evidence"
  // error this workstream already made once.
  assert.match(SERVED_MODEL_UNREPORTED_CLAUDE, /UNTESTED/);
  assert.match(SERVED_MODEL_UNREPORTED_CLAUDE, /auth-failure/);
});

test('the default reason is still the codex one, so the Astra leg is byte-unchanged', () => {
  assert.equal(identityFields(null).identityUnverifiableReason, SERVED_MODEL_UNVERIFIABLE_NOTE);
});

test('a reported served model is verified and carries no excuse, on either leg', () => {
  for (const opts of [undefined, { unverifiableReason: SERVED_MODEL_UNREPORTED_CLAUDE }]) {
    const fields = identityFields('claude-opus-5', opts);
    assert.equal(fields.identityVerified, true);
    assert.equal(fields.identityUnverifiableReason, null);
  }
});

test('the module is importable without side effects', () => {
  // main() is guarded by an `invokedDirectly` check; if that guard regresses, importing this
  // module in a test run would dispatch a real call on the subscription.
  assert.equal(typeof main, 'function');
});
