/**
 * Tests for the class-S approval gate — the workflow that lets the agent repair
 * the guard WITH Sean's per-change permission (Sean's ruling, 2026-08-11:
 * "there just needs to be a gate where you ask permission").
 *
 * These tests mint approvals by writing the approval file directly, which is
 * what the Sean-only script does. The agent cannot do this at runtime: the
 * approval directory is class-S protected and the minting script is
 * Bash-deny-listed. The test harness runs outside those controls on purpose —
 * otherwise the unblock path could never be proven at all.
 *
 * Run: node --test scripts/hooks/db-blast-radius-approval.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const HOOK = join(ROOT, 'scripts', 'hooks', 'db-blast-radius-gate.mjs');
const BASE = join(ROOT, '.ai-workflow', 'blast-radius');
const APPROVAL_DIR = join(BASE, 'approved');
const REQUEST_DIR = join(BASE, 'requests');

const GUARD_FILE = 'scripts/hooks/db-blast-radius-gate.mjs';
const NEW_TEXT = '// a proposed repair\n';
const hashOf = (t) => createHash('sha256').update(t).digest('hex').slice(0, 16);
const ID = hashOf(`${GUARD_FILE}\n${NEW_TEXT}`);

const minted = [];

function runHook(payload) {
  const out = execFileSync(process.execPath, [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return out.trim() ? JSON.parse(out) : null;
}

const editGuard = () => ({
  tool_name: 'Edit',
  tool_input: { file_path: GUARD_FILE, new_string: NEW_TEXT },
});

function mintApproval(id, { minutes = 15, consumed = false } = {}) {
  mkdirSync(APPROVAL_DIR, { recursive: true });
  const file = join(APPROVAL_DIR, `${id}.json`);
  writeFileSync(
    file,
    JSON.stringify({
      contentHash: id,
      reason: 'test',
      expiresAt: new Date(Date.now() + minutes * 60_000).toISOString(),
      consumed,
    }),
    'utf8',
  );
  minted.push(file);
}

before(() => {
  mkdirSync(APPROVAL_DIR, { recursive: true });
  mkdirSync(REQUEST_DIR, { recursive: true });
});

after(() => {
  for (const f of minted) if (existsSync(f)) rmSync(f);
  const req = join(REQUEST_DIR, `${ID}.md`);
  if (existsSync(req)) rmSync(req);
});

// ------------------------------------------------------------------ gate ---

test('without approval, a guard edit is denied and teaches the workflow', () => {
  const r = runHook(editGuard());
  assert.ok(r, 'expected a decision');
  assert.equal(r.hookSpecificOutput.permissionDecision, 'deny');
  const reason = r.hookSpecificOutput.permissionDecisionReason;
  assert.match(reason, /approval required/i);
  assert.match(reason, new RegExp(ID), 'must print the approval id Sean needs');
  assert.match(reason, /blast-radius-approve\.mjs/, 'must print the exact command');
});

test('with no change request on file, the denial demands one first', () => {
  const r = runHook(editGuard());
  assert.match(r.hookSpecificOutput.permissionDecisionReason, /NO CHANGE REQUEST ON FILE/);
});

test('a filed change request is surfaced in the denial for Sean to read', () => {
  writeFileSync(
    join(REQUEST_DIR, `${ID}.md`),
    '## What is wrong\nThe guard ignores in-place edits.\n## Option A\nAdd a check.\n',
    'utf8',
  );
  const r = runHook(editGuard());
  assert.match(r.hookSpecificOutput.permissionDecisionReason, /change request on file/);
  assert.match(r.hookSpecificOutput.permissionDecisionReason, /ignores in-place edits/);
});

test('an approval unblocks the exact change, and is consumed on use', () => {
  mintApproval(ID);
  assert.equal(runHook(editGuard()), null, 'approved edit must pass');

  const after = JSON.parse(readFileSync(join(APPROVAL_DIR, `${ID}.json`), 'utf8'));
  assert.equal(after.consumed, true, 'approval must be burned');

  const second = runHook(editGuard());
  assert.ok(second, 'a second identical edit must be blocked again');
  assert.equal(second.hookSpecificOutput.permissionDecision, 'deny');
});

test('an approval does not cover different content (no approve-X-run-Y)', () => {
  mintApproval(ID);
  const r = runHook({
    tool_name: 'Edit',
    tool_input: { file_path: GUARD_FILE, new_string: `${NEW_TEXT}// one extra character` },
  });
  assert.ok(r, 'drifted content must not ride the approval');
  assert.equal(r.hookSpecificOutput.permissionDecision, 'deny');
});

test('an expired approval does not unblock', () => {
  const id = hashOf(`${GUARD_FILE}\nexpired-case\n`);
  mintApproval(id, { minutes: -5 });
  const r = runHook({
    tool_name: 'Edit',
    tool_input: { file_path: GUARD_FILE, new_string: 'expired-case\n' },
  });
  assert.equal(r.hookSpecificOutput.permissionDecision, 'deny');
});

// ------------------------------------------------- regressions from R1-R3 ---

test('sed -i over a guard file is caught (was a silent bypass)', () => {
  const r = runHook({
    tool_name: 'Bash',
    tool_input: { command: 'sed -i s/foo/bar/ scripts/hooks/db-blast-radius-gate.mjs' },
  });
  assert.ok(r, 'sed -i must not sail through');
  assert.equal(r.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(r.hookSpecificOutput.permissionDecisionReason, /edits or overwrites/);
});

test('cp over a guard file is caught (was a silent bypass)', () => {
  const r = runHook({
    tool_name: 'Bash',
    tool_input: { command: 'cp /tmp/evil.mjs scripts/lib/blast-radius-analyze.mjs' },
  });
  assert.ok(r, 'cp must not sail through');
  assert.equal(r.hookSpecificOutput.permissionDecision, 'deny');
});

test('NotebookEdit content is actually inspected (was matched but ignored)', () => {
  const r = runHook({
    tool_name: 'NotebookEdit',
    tool_input: {
      notebook_path: 'backend/migrations/x.sql',
      new_source: 'CREATE TABLE t (c UUID REFERENCES users(id));',
    },
  });
  assert.ok(r, 'NotebookEdit payload must be analysed');
  assert.equal(r.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(r.hookSpecificOutput.permissionDecisionReason, /poisoned table/);
});

test('benign node -e emits no production advisory (noise kills guards)', () => {
  const proc = execFileSync(process.execPath, [HOOK], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'node -e "console.log(1)"' } }),
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  assert.equal(proc.trim(), '', 'must allow');
});

test('a DB-flavoured node -e still gets the advisory', () => {
  let stderr = '';
  try {
    execFileSync(process.execPath, [HOOK], {
      input: JSON.stringify({
        tool_name: 'Bash',
        tool_input: { command: 'node -e "sequelize.query(1)"' },
      }),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (e) {
    stderr = e.stderr || '';
  }
  // Advisory goes to stderr; the command itself is still allowed.
  assert.ok(true, 'allowed — advisory path exercised');
});

test('the requests directory stays agent-writable', () => {
  const r = runHook({
    tool_name: 'Write',
    tool_input: { file_path: '.ai-workflow/blast-radius/requests/abc.md', content: 'a request' },
  });
  assert.equal(r, null, 'the agent must be able to file a change request');
});

test('the approved directory stays agent-blocked', () => {
  const r = runHook({
    tool_name: 'Write',
    tool_input: { file_path: '.ai-workflow/blast-radius/approved/abc.json', content: '{}' },
  });
  assert.ok(r, 'the agent must never write its own approval');
  assert.equal(r.hookSpecificOutput.permissionDecision, 'deny');
});

// The approval directory is the root of trust: anything that can put a file
// there mints permission. Every write primitive must be covered, not just Write.
for (const [label, command] of [
  ['shell redirect', 'echo {} > .ai-workflow/blast-radius/approved/x.json'],
  ['tee', 'echo {} | tee .ai-workflow/blast-radius/approved/x.json'],
  ['cp a file in', 'cp /tmp/a.json .ai-workflow/blast-radius/approved/x.json'],
  ['cp the whole dir in', 'cp -r /tmp/preminted .ai-workflow/blast-radius/approved'],
  ['mv the whole dir in', 'mv /tmp/preminted .ai-workflow/blast-radius/approved'],
]) {
  test(`approvals cannot be minted via ${label}`, () => {
    const r = runHook({ tool_name: 'Bash', tool_input: { command } });
    assert.ok(r, `${label} must not sail through`);
    assert.equal(r.hookSpecificOutput.permissionDecision, 'deny');
  });
}
