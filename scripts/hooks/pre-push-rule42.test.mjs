/**
 * pre-push-rule42.test.mjs — coverage for .githooks/pre-push (CLAUDE.md Rule 42).
 * Run: node scripts/hooks/pre-push-rule42.test.mjs
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Every .mjs hook in this directory has a .test.mjs beside it. No SHELL hook in
 * .githooks/ has ever had one, so the shell gates are the untested half of the gate
 * system — and this repo's own learning corpus records what an unverified gate is
 * worth ("a written trap is not a control"). The Rule 42 gate blocks pushes to a
 * branch that deploys and migrates production, so it is the wrong one to leave
 * hand-tested-once.
 *
 * HOW IT TESTS
 * ------------
 * Runs the real hook as a subprocess with the exact contract git uses:
 *   argv:   <remote-name> <remote-url>
 *   stdin:  "<local ref> <local sha> <remote ref> <remote sha>" lines
 * Drift is created in a THROWAWAY git repo under the OS temp dir, never in the repo
 * being tested — a test that dirties backend/ to prove backend/ is dirty is how you
 * get a false red for the next person.
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, copyFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HOOK = join(HERE, '..', '..', '.githooks', 'pre-push');
const ZERO = '0'.repeat(40);

let pass = 0;
const fail = [];
const t = (name, fn) => {
  try { fn(); pass += 1; console.log(`  PASS  ${name}`); }
  catch (e) { fail.push(name); console.log(`  FAIL  ${name}\n        ${e.message}`); }
};

/** A disposable git repo with a backend/ dir and one commit. */
function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'rule42-'));
  const git = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe' });
  git('init', '-q');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'user.name', 'test');
  mkdirSync(join(dir, 'backend'), { recursive: true });
  writeFileSync(join(dir, 'backend', 'tracked.mjs'), 'export const a = 1;\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  copyFileSync(HOOK, join(dir, 'pre-push'));
  execFileSync('chmod', ['+x', join(dir, 'pre-push')]);
  return {
    dir,
    sha: git('rev-parse', 'HEAD').toString().trim(),
    /** Invoke the hook exactly as git does. */
    run(refLines) {
      const r = spawnSync('bash', ['./pre-push', 'origin', 'https://example.invalid/r.git'], {
        cwd: dir, input: refLines, encoding: 'utf8',
      });
      return { code: r.status, out: `${r.stdout}${r.stderr}` };
    },
    cleanup() { rmSync(dir, { recursive: true, force: true }); },
  };
}
const pushMain = (sha) => `refs/heads/main ${sha} refs/heads/main ${sha}\n`;

// ── the gate must PASS when there is nothing to catch ────────────────────────────
t('clean tree pushing main → exit 0', () => {
  const s = sandbox();
  try {
    const r = s.run(pushMain(s.sha));
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /CLEAN/);
  } finally { s.cleanup(); }
});

t('non-main ref → skipped even WITH backend drift (no deploy, no noise)', () => {
  const s = sandbox();
  try {
    writeFileSync(join(s.dir, 'backend', 'stray.mjs'), 'export const b = 2;\n');
    const r = s.run(`refs/heads/feat ${s.sha} refs/heads/feat ${s.sha}\n`);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /skipped/);
  } finally { s.cleanup(); }
});

t('branch deletion of main → skipped (deletion triggers no build)', () => {
  const s = sandbox();
  try {
    writeFileSync(join(s.dir, 'backend', 'stray.mjs'), 'export const b = 2;\n');
    const r = s.run(`refs/heads/main ${ZERO} refs/heads/main ${s.sha}\n`);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /skipped/);
  } finally { s.cleanup(); }
});

t('empty stdin → exit 0, no hang, no crash', () => {
  const s = sandbox();
  try {
    const r = s.run('');
    assert.equal(r.code, 0, r.out);
  } finally { s.cleanup(); }
});

// ── the gate must BLOCK on each drift class Rule 42 names ────────────────────────
t('UNTRACKED backend file → blocks, names file and the ERR_MODULE_NOT_FOUND cause', () => {
  const s = sandbox();
  try {
    writeFileSync(join(s.dir, 'backend', 'orphan.mjs'), 'export const c = 3;\n');
    const r = s.run(pushMain(s.sha));
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /UNTRACKED in backend\//);
    assert.match(r.out, /orphan\.mjs/);
    assert.match(r.out, /ERR_MODULE_NOT_FOUND/);
    assert.doesNotMatch(r.out, /MODIFIED but UNCOMMITTED/, 'must not show the irrelevant class');
  } finally { s.cleanup(); }
});

t('MODIFIED-uncommitted backend file → blocks, names the missing-export cause', () => {
  const s = sandbox();
  try {
    appendFileSync(join(s.dir, 'backend', 'tracked.mjs'), 'export const added = 9;\n');
    const r = s.run(pushMain(s.sha));
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /MODIFIED but UNCOMMITTED/);
    assert.match(r.out, /tracked\.mjs/);
    assert.match(r.out, /does not provide an export named/);
    assert.doesNotMatch(r.out, /UNTRACKED in backend\//, 'must not show the irrelevant class');
  } finally { s.cleanup(); }
});

t('both drift classes at once → blocks and reports BOTH sections', () => {
  const s = sandbox();
  try {
    writeFileSync(join(s.dir, 'backend', 'orphan.mjs'), 'export const c = 3;\n');
    appendFileSync(join(s.dir, 'backend', 'tracked.mjs'), 'export const added = 9;\n');
    const r = s.run(pushMain(s.sha));
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /UNTRACKED in backend\//);
    assert.match(r.out, /MODIFIED but UNCOMMITTED/);
  } finally { s.cleanup(); }
});

// ── the traps a hand-test misses ────────────────────────────────────────────────
t('main inside a MULTI-ref push → still blocks (not just the first line)', () => {
  const s = sandbox();
  try {
    writeFileSync(join(s.dir, 'backend', 'orphan.mjs'), 'export const c = 3;\n');
    const r = s.run(
      `refs/heads/feat ${s.sha} refs/heads/feat ${s.sha}\n` + pushMain(s.sha),
    );
    assert.equal(r.code, 1, r.out);
  } finally { s.cleanup(); }
});

t('local branch pushed TO main (wip/foo:main) → blocks on the REMOTE ref', () => {
  const s = sandbox();
  try {
    writeFileSync(join(s.dir, 'backend', 'orphan.mjs'), 'export const c = 3;\n');
    const r = s.run(`refs/heads/wip/foo ${s.sha} refs/heads/main ${s.sha}\n`);
    assert.equal(r.code, 1, r.out);
  } finally { s.cleanup(); }
});

t('drift OUTSIDE backend/ → does not block (scope is backend/ only)', () => {
  const s = sandbox();
  try {
    writeFileSync(join(s.dir, 'frontend-thing.mjs'), 'export const d = 4;\n');
    const r = s.run(pushMain(s.sha));
    assert.equal(r.code, 0, r.out);
  } finally { s.cleanup(); }
});

t('gitignored file in backend/ → does not block (--exclude-standard is honoured)', () => {
  const s = sandbox();
  try {
    writeFileSync(join(s.dir, '.gitignore'), 'backend/local-scratch.mjs\n');
    execFileSync('git', ['add', '.gitignore'], { cwd: s.dir, stdio: 'pipe' });
    execFileSync('git', ['commit', '-q', '-m', 'ignore'], { cwd: s.dir, stdio: 'pipe' });
    writeFileSync(join(s.dir, 'backend', 'local-scratch.mjs'), 'export const e = 5;\n');
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: s.dir }).toString().trim();
    const r = s.run(pushMain(sha));
    assert.equal(r.code, 0, r.out);
  } finally { s.cleanup(); }
});

console.log(`\npre-push-rule42: ${pass} passed, ${fail.length} failed`);
if (fail.length) process.exit(1);
