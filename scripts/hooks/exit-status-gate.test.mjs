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

test('stripQuoted removes quoted spans without eating $?', () => {
  assert.equal(stripQuoted("grep 'a|b' x"), "grep '' x");
  assert.match(stripQuoted('echo "v=$?"'), /""/);
});

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
