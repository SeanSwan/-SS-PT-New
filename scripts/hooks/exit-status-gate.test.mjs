/**
 * Controls for the exit-status gate.
 *
 * The FALSE-POSITIVE cases below matter more than the true positives. A gate that blocks ordinary
 * work gets switched off, and a switched-off gate protects nothing — the failure mode this repo
 * records more than any other. Every legitimate shape an agent actually writes must pass.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipedStatusRead, stripQuoted } from './exit-status-gate.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

// ── MUST BLOCK: the reading that produced three false conclusions in one session ──
const BLOCKS = [
  'node x.mjs | tail; echo $?',
  'npm test | tail -5; echo "exit=$?"',
  'bash scripts/scan-secrets.sh --staged | tail -8; echo "scan exit: $?"',
  'cat f | grep x | wc -l; if [ $? -ne 0 ]; then echo bad; fi',
];

for (const cmd of BLOCKS) {
  test(`NEGATIVE control — blocks: ${cmd.slice(0, 44)}`, () => {
    assert.ok(pipedStatusRead(cmd), 'a piped $? read must be caught');
  });
}

// ── MUST NOT BLOCK: every legitimate shape ──
const ALLOWS = [
  ['no pipe at all', 'node x.mjs; echo $?'],
  ['explicit PIPESTATUS', 'node x.mjs | tail; echo ${PIPESTATUS[0]}'],
  ['pipefail set', 'set -o pipefail; node x.mjs | tail; echo $?'],
  ['pipe inside single quotes', "grep 'a|b' file.txt; echo $?"],
  ['pipe inside double quotes', 'grep "a|b" file.txt; echo $?'],
  ['status read BEFORE the pipe', 'node x.mjs; echo $?; ls | tail'],
  ['|| is not a pipeline', 'node x.mjs || echo failed; echo $?'],
  ['|& is not a bare pipe', 'node x.mjs |& tee log; echo ${PIPESTATUS[0]}'],
  ['pipe with no status read', 'node x.mjs | tail -3'],
  ['empty command', ''],
  ['plain command', 'ls -la'],
];

for (const [label, cmd] of ALLOWS) {
  test(`POSITIVE control — allows (${label})`, () => {
    assert.equal(pipedStatusRead(cmd), null, `must not block: ${cmd}`);
  });
}

test('stripQuoted neutralises quoted spans AND preserves length', () => {
  // The old assertion pinned the exact output `"grep '' x"`, i.e. the collapsing behaviour. That
  // detail IS what broke the gate: statement offsets are built on the masked string while `$?` is
  // located in the raw one, so any length change desyncs them and the gate stops firing. Assert the
  // two properties that actually matter, not the shape.
  const a = "grep 'a|b' x";
  assert.equal(stripQuoted(a).length, a.length, 'length must be preserved or offsets desync');
  assert.ok(!/(?<!\|)\|(?!\||&)/.test(stripQuoted(a)), 'a quoted pipe must not read as a pipeline');

  const b = 'echo "v=$?"';
  assert.equal(stripQuoted(b).length, b.length);
  assert.ok(!stripQuoted(b).includes('"'), 'quoted content is masked');
});

test('REGRESSION: $? inside double quotes after a pipe still blocks', () => {
  // The exact command that silently passed while the gate looked healthy. Its most common form.
  assert.notEqual(pipedStatusRead('npm test | tail -5; echo "exit=$?"'), null);
});

/*
 * FALSE-POSITIVE REGRESSION — found in the first two commands after the gate went live
 * (2026-08-23). One true positive, one false, back to back.
 *
 * `$?` reads the status of the IMMEDIATELY PRECEDING statement, not "anything earlier on the line".
 * The original rule was "a pipe anywhere before a $? anywhere", so a compound command whose $?
 * correctly follows a BARE command was blocked because an unrelated pipe appeared in an earlier
 * statement.
 *
 * This matters more than an ordinary false positive. The change request that installed this gate
 * says a check that gets in the way of real work is one that gets switched off — and a gate removed
 * for nagging leaves the 44-hit failure with no guard at all. Precision here IS the safety property.
 */
const ALLOWS_AFTER_BARE = [
  // $? follows `node x > /dev/null`, a bare command; the earlier pipe is a separate statement.
  'cat a | head -2; echo hi; node x > /dev/null 2>&1; echo "exit=$?"',
  'git log | cat; npm test; echo $?',
  // The pipeline is two statements back — its status was consumed before $? ran.
  'a | b; c; echo $?',
  // && chain: the segment immediately before $? is bare `c`.
  'a | b && c && echo $?'
];

for (const cmd of ALLOWS_AFTER_BARE) {
  test(`allows a bare-command status read: ${cmd}`, () => {
    assert.equal(pipedStatusRead(cmd), null, 'the statement before $? is not a pipeline');
  });
}

const STILL_BLOCKS = [
  'node x 2>&1 | head -2; echo "exit=$?"',
  'cat a | head; echo $?',
  'a | b && echo $?'
];

for (const cmd of STILL_BLOCKS) {
  test(`still blocks the real defect: ${cmd}`, () => {
    assert.notEqual(pipedStatusRead(cmd), null, 'the statement immediately before $? IS a pipeline');
  });
}

test('gate is registered as a PreToolUse hook on Bash', () => {
  // A correct gate nobody runs is not a gate. This asserts wiring, not logic.
  const settings = JSON.parse(readFileSync(join(REPO_ROOT, '.claude', 'settings.json'), 'utf8'));
  const pre = settings.hooks?.PreToolUse ?? [];
  const commands = pre
    .filter((g) => /Bash/.test(g.matcher ?? ''))
    .flatMap((g) => g.hooks ?? [])
    .map((h) => h.command ?? '');
  assert.ok(
    commands.some((c) => c.includes('exit-status-gate.mjs')),
    'exit-status-gate must be wired into PreToolUse(Bash) or it protects nothing',
  );
});
