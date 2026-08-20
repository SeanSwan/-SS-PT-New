/**
 * Tests for the blast-radius gate.
 *
 * The load-bearing test is `blocks the real 2026-08-11 incident SQL` — the
 * exact text from NASM-INTEGRATION-CONSOLIDATED-REVIEW.md:71,89,91 that a
 * builder could have run verbatim. If that test ever goes green-by-accident
 * (e.g. because someone adds `users` to the snapshot), the guard is dead.
 *
 * Run: node --test scripts/hooks/db-blast-radius-gate.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import {
  foldIdentifier,
  checkReferences,
  checkDestructive,
  checkUnbounded,
  checkReversibility,
  extractWriteTargets,
} from '../lib/blast-radius-analyze.mjs';

const SNAPSHOT = {
  source: 'models',
  tableCount: 2,
  tables: {
    Users: { model: 'User', idType: 'INTEGER' },
    sessions: { model: 'Session', idType: 'INTEGER' },
  },
  poisonedTables: {
    users: { canonical: 'Users', why: 'stale duplicate', evidence: 'migration 20260730120000' },
  },
};

// ---------------------------------------------------------------- folding ---

test('foldIdentifier replicates Postgres semantics', () => {
  assert.deepEqual(foldIdentifier('"Users"'), { name: 'Users', quoted: true });
  // The trap: unquoted mixed case folds DOWN, landing on the poisoned table.
  assert.deepEqual(foldIdentifier('Users'), { name: 'users', quoted: false });
  assert.deepEqual(foldIdentifier('users'), { name: 'users', quoted: false });
});

// ------------------------------------------------------- class B (silent) ---

test('blocks the real 2026-08-11 incident SQL', () => {
  const incident = `
CREATE TABLE phase_transition_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE exercise_modifications (
  exercise_id UUID REFERENCES exercise_library(id),
  client_id UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id)
);`;
  const findings = checkReferences(incident, SNAPSHOT);
  const poisonHits = findings.filter((f) => /poisoned table/.test(f.detail));
  assert.equal(poisonHits.length, 3, 'all three `users` FKs must be caught');
  assert.ok(
    findings.some((f) => /exercise_library/.test(f.detail)),
    'nonexistent table must be caught',
  );
});

test('catches the near-miss twin: unquoted capital-U Users', () => {
  // Looks correct to a human. Postgres folds it to the dead lowercase table.
  const findings = checkReferences('c INTEGER REFERENCES Users(id)', SNAPSHOT);
  assert.equal(findings.length, 1);
  assert.match(findings[0].detail, /poisoned/);
  assert.match(findings[0].detail, /fold to lower case/);
});

test('allows the correct quoted reference', () => {
  const findings = checkReferences('user_id INTEGER NOT NULL REFERENCES "Users"(id)', SNAPSHOT);
  assert.equal(findings.length, 0);
});

test('catches UUID-vs-INTEGER type drift', () => {
  const findings = checkReferences('client_id UUID REFERENCES "Users"(id)', SNAPSHOT);
  assert.equal(findings.length, 1);
  assert.match(findings[0].detail, /UUID against `Users`\.id which the models declare INTEGER/);
});

// ------------------------------------------------------ classes A / Q / C ---

test('catches Sequelize JS idioms that contain no SQL verb', () => {
  const js = `module.exports = { up: async (q) => { await q.dropTable('Users'); } };`;
  const findings = checkDestructive(js);
  assert.ok(findings.some((f) => /dropTable/.test(f.detail)));
});

test('catches sync({ force: true }) — the whole-schema nuke', () => {
  const findings = checkDestructive('await sequelize.sync({ force: true });');
  assert.ok(findings.some((f) => /EVERY TABLE/.test(f.detail)));
});

test('catches unbounded DELETE and tautological WHERE', () => {
  assert.ok(checkUnbounded('DELETE FROM sessions;').length, 'no WHERE');
  assert.ok(checkUnbounded('UPDATE sessions SET x=1 WHERE 1=1;').length, '1=1');
  assert.ok(checkUnbounded('UPDATE sessions SET x=1 WHERE id IS NOT NULL;').length, 'id IS NOT NULL');
  assert.equal(checkUnbounded("DELETE FROM sessions WHERE id = 42;").length, 0, 'scoped delete is fine');
});

test('does not fire on commented-out destructive code', () => {
  assert.equal(checkDestructive('-- DROP TABLE "Users";').length, 0);
  assert.equal(checkDestructive('// await q.dropTable("Users")').length, 0);
});

// ---------------------------------------------------------------- class D ---

test('flags a migration with no down()', () => {
  const f = checkReversibility('module.exports = { up: async (q) => {} }', 'backend/migrations/x.cjs');
  assert.equal(f.length, 1);
  assert.match(f[0].detail, /no down\(\)/);
});

test('flags a down() that destroys data', () => {
  const src = `module.exports = { up: async (q)=>{}, down: async (q)=>{ await q.dropTable('x'); } }`;
  const f = checkReversibility(src, 'backend/migrations/x.cjs');
  assert.equal(f.length, 1);
  assert.match(f[0].detail, /down\(\) itself destroys data/);
});

test('ignores reversibility outside migrations', () => {
  assert.equal(checkReversibility('const up = 1;', 'backend/services/foo.mjs').length, 0);
});

// ------------------------------------------------- shell redirect targets ---

test('extracts heredoc and tee write targets', () => {
  assert.deepEqual(extractWriteTargets('cat > backend/migrations/evil.cjs <<EOF'), [
    'backend/migrations/evil.cjs',
  ]);
  assert.deepEqual(extractWriteTargets('echo x | tee backend/schema-snapshot.json'), [
    'backend/schema-snapshot.json',
  ]);
  assert.deepEqual(extractWriteTargets('echo x >> scripts/hooks/db-blast-radius-gate.mjs'), [
    'scripts/hooks/db-blast-radius-gate.mjs',
  ]);
});

// -------------------------------------------------------- hook end-to-end ---

const HOOK = join(process.cwd(), 'scripts', 'hooks', 'db-blast-radius-gate.mjs');

function runHook(payload) {
  const out = execFileSync(process.execPath, [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return out.trim() ? JSON.parse(out) : null;
}

test('hook denies a migration written with the poisoned FK', () => {
  const result = runHook({
    tool_name: 'Write',
    tool_input: {
      file_path: 'backend/migrations/20260811-test.cjs',
      content: 'CREATE TABLE t (client_id UUID REFERENCES users(id));',
    },
  });
  assert.ok(result, 'expected a decision payload');
  assert.equal(result.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(result.hookSpecificOutput.permissionDecisionReason, /poisoned table/);
});

// RE-ANCHORED 2026-08-11. Behaviour changed by design, not by regression: class
// S went from an absolute refusal to an approval gate (Sean: "you should be able
// to fix it, but there needs to be a gate where you ask permission"). The deny
// assertion is unchanged and still passes — only the message contract moved, so
// it now asserts the STRONGER property: still denied, AND the approval route is
// offered rather than the agent being left stuck.
test('hook denies edits to its own source and offers the approval route (class S)', () => {
  const result = runHook({
    tool_name: 'Edit',
    tool_input: { file_path: 'scripts/hooks/db-blast-radius-gate.mjs', new_string: 'process.exit(0)' },
  });
  assert.equal(result.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(result.hookSpecificOutput.permissionDecisionReason, /class S — guard self-modification/);
  assert.match(result.hookSpecificOutput.permissionDecisionReason, /blast-radius-approve\.mjs/);
});

test('hook denies shell redirection into the snapshot', () => {
  const result = runHook({
    tool_name: 'Bash',
    tool_input: { command: 'echo "{}" > backend/schema-snapshot.json' },
  });
  assert.equal(result.hookSpecificOutput.permissionDecision, 'deny');
});

test('hook denies a heredoc migration carrying dropTable', () => {
  const result = runHook({
    tool_name: 'Bash',
    tool_input: {
      command: "cat > backend/migrations/evil.cjs <<'EOF'\nq.dropTable('Users')\nEOF",
    },
  });
  assert.equal(result.hookSpecificOutput.permissionDecision, 'deny');
});

test('hook allows an ordinary source edit', () => {
  const result = runHook({
    tool_name: 'Edit',
    tool_input: { file_path: 'frontend/src/components/Foo.tsx', new_string: 'const a = 1;' },
  });
  assert.equal(result, null, 'ordinary edits must pass silently');
});

test('hook never blocks a docs write', () => {
  const result = runHook({
    tool_name: 'Write',
    tool_input: {
      file_path: 'docs/ai-workflow/AI-HANDOFF/plan.md',
      content: 'CREATE TABLE t (c UUID REFERENCES users(id));',
    },
  });
  assert.equal(result, null, 'docs are advisory-only');
});

test('hook fails open on malformed stdin', () => {
  const out = execFileSync(process.execPath, [HOOK], {
    input: 'not json',
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  assert.equal(out.trim(), '', 'a broken gate must allow, never wedge');
});