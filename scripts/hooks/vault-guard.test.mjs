/**
 * Regression tests for vault-guard.mjs.
 *
 * Every case here is a defect that a hostile review actually found (GLM-5.3,
 * SWA-230, 2026-09-03) or a property the vault must never lose. Run:
 *   node scripts/hooks/vault-guard.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const HOOK = path.join(HERE, 'vault-guard.mjs');
const VAULT = path.join(REPO, '.ai-workflow', 'vault');

const { isVaultClass } = await import('./vault-guard.mjs');

/** Drive the hook exactly as Claude Code does: JSON on stdin. */
function runHook(filePath, env = {}) {
  return spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: filePath } }),
    encoding: 'utf8',
    env: { ...process.env, ...env },
    cwd: os.tmpdir(), // prove cwd-independence: hooks must not rely on it
  });
}

function tempDoc(relDir, name, body) {
  const dir = path.join(REPO, relDir);
  fs.mkdirSync(dir, { recursive: true });
  const abs = path.join(dir, name);
  fs.writeFileSync(abs, body);
  return abs;
}

function slotFor(relPath) {
  return path.join(VAULT, relPath);
}

function cleanup(paths) {
  for (const p of paths) {
    try { fs.rmSync(p, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

test('classification: blueprint-class files are recognised', () => {
  assert.equal(isVaultClass('docs/ai-workflow/brainstorms/x.md'), true);
  assert.equal(isVaultClass('docs/ai-workflow/x.mdx'), true, '.mdx wireframes count');
  assert.equal(isVaultClass('diagrams/flow.mmd'), true, 'mermaid anywhere');
  assert.equal(isVaultClass('CLAUDE.md'), true);
  assert.equal(isVaultClass('CLAUDE.local.md'), true, 'F7: local override was missed');
  assert.equal(isVaultClass('SOUL.md'), true);
  assert.equal(isVaultClass('frontend/AGENTS.md'), true, 'F7: nested constitutions count');
});

test('classification: non-blueprint files are skipped', () => {
  assert.equal(isVaultClass('backend/package.json'), false);
  assert.equal(isVaultClass('frontend/src/App.tsx'), false);
  assert.equal(isVaultClass('.ai-workflow/vault/x.md'), false, 'never vault the vault');
  assert.equal(isVaultClass('README.md'), false, 'root README is not blueprint-class');
});

test('F7: case-insensitive filesystems still match the docs prefix', () => {
  assert.equal(isVaultClass('Docs/AI-Workflow/spec.md'), true);
});

test('F7: node_modules and build output are excluded (over-capture)', () => {
  assert.equal(isVaultClass('node_modules/some-pkg/docs/graph.mmd'), false);
  assert.equal(isVaultClass('frontend/node_modules/pkg/a.mmd'), false);
  assert.equal(isVaultClass('dist/assets/x.mmd'), false);
});

test('F7: generated files are excluded by PATH, not by basename everywhere', () => {
  assert.equal(isVaultClass('docs/ai-workflow/CATALOG.md'), false, 'the real generated catalog');
  assert.equal(isVaultClass('docs/ai-workflow/learning-drops-ledger.md'), false);
  assert.equal(
    isVaultClass('docs/ai-workflow/brainstorms/catalog.md'), true,
    'a hand-written doc that merely shares the name must stay protected',
  );
});

test('end-to-end: an overwrite preserves the previous content, and dedupes', () => {
  const rel = 'docs/ai-workflow/brainstorms/__vault-test-e2e.md';
  const abs = tempDoc('docs/ai-workflow/brainstorms', '__vault-test-e2e.md', 'VERSION ONE\n');
  const slot = slotFor(rel);
  cleanup([slot]);
  try {
    const r1 = runHook(abs);
    assert.equal(r1.status, 0, 'hook must never block');
    const snaps1 = fs.readdirSync(slot);
    assert.equal(snaps1.length, 1);
    assert.match(fs.readFileSync(path.join(slot, snaps1[0]), 'utf8'), /VERSION ONE/);

    // Same content again -> no second snapshot.
    runHook(abs);
    assert.equal(fs.readdirSync(slot).length, 1, 'dedupe by content hash');

    // Content changed -> a new snapshot joins the old one.
    fs.writeFileSync(abs, 'VERSION TWO\n');
    runHook(abs);
    const bodies = fs.readdirSync(slot).map((f) => fs.readFileSync(path.join(slot, f), 'utf8'));
    assert.equal(bodies.length, 2);
    assert.ok(bodies.some((b) => /VERSION ONE/.test(b)), 'the destroyed version survives');
  } finally {
    cleanup([abs, slot]);
  }
});

test('negative control: a non-blueprint file produces no snapshot', () => {
  const abs = path.join(os.tmpdir(), '__vault-negative.txt');
  fs.writeFileSync(abs, 'x');
  try {
    const r = runHook(abs);
    assert.equal(r.status, 0);
    assert.equal(fs.existsSync(slotFor('__vault-negative.txt')), false);
  } finally {
    cleanup([abs]);
  }
});

test('F6: nested paths do not collide with underscore-named siblings', () => {
  const relA = 'docs/ai-workflow/brainstorms/__vt/a.md';
  const relB = 'docs/ai-workflow/brainstorms/__vt__a.md';
  const absA = tempDoc('docs/ai-workflow/brainstorms/__vt', 'a.md', 'A\n');
  const absB = tempDoc('docs/ai-workflow/brainstorms', '__vt__a.md', 'B\n');
  try {
    runHook(absA);
    runHook(absB);
    assert.notEqual(slotFor(relA), slotFor(relB), 'distinct slots');
    assert.match(
      fs.readFileSync(path.join(slotFor(relA), fs.readdirSync(slotFor(relA))[0]), 'utf8'), /^A/,
    );
    assert.match(
      fs.readFileSync(path.join(slotFor(relB), fs.readdirSync(slotFor(relB))[0]), 'utf8'), /^B/,
    );
  } finally {
    cleanup([absA, absB, slotFor(relA), slotFor(relB),
      path.join(REPO, 'docs/ai-workflow/brainstorms/__vt'), slotFor('docs/ai-workflow/brainstorms/__vt')]);
  }
});

test('F5: prune keeps the newest by MTIME even when the NAMES sort the other way', () => {
  // R2-10: the first version of this test made names and mtimes ascend together,
  // so the original lexicographic implementation passed it verbatim - it
  // certified the bug it was written to prevent. Now the two orders DISAGREE.
  const rel = 'docs/ai-workflow/brainstorms/__vault-prune.md';
  const abs = tempDoc('docs/ai-workflow/brainstorms', '__vault-prune.md', 'seed' + String.fromCharCode(10));
  const slot = slotFor(rel);
  cleanup([slot]);
  try {
    fs.mkdirSync(slot, { recursive: true });
    // Names ascend n1 < n2 < n3; mtimes descend (as a backward clock step does).
    const rows = [
      // ageMs is how far in the PAST the mtime is set: bigger = older.
      ['20260101T000001Z-aaaaaaaaaaaa.md', 'OLDEST-NAME-NEWEST-MTIME', 1000],
      ['20260101T000002Z-bbbbbbbbbbbb.md', 'MIDDLE', 2000],
      ['20260101T000003Z-cccccccccccc.md', 'NEWEST-NAME-OLDEST-MTIME', 3000],
    ];
    const base = Date.now();
    for (const [name, body, ageMs] of rows) {
      const f = path.join(slot, name);
      fs.writeFileSync(f, body);
      const t = (base - ageMs) / 1000;
      fs.utimesSync(f, t, t);
    }
    fs.writeFileSync(abs, 'trigger' + String.fromCharCode(10));
    runHook(abs, { SWAN_VAULT_KEEP: '2' });   // 4 present -> prune to 2

    const kept = fs.readdirSync(slot).map((f) => fs.readFileSync(path.join(slot, f), 'utf8'));
    assert.equal(kept.length, 2, 'capped at KEEP');
    assert.ok(
      !kept.some((b) => /NEWEST-NAME-OLDEST-MTIME/.test(b)),
      'the OLDEST BY MTIME was pruned, even though its NAME sorted last',
    );
  } finally {
    cleanup([abs, slot]);
  }
});

test('F5: a garbage SWAN_VAULT_KEEP prunes at the DEFAULT cap, not "never"', () => {
  // R2-11: the first version asserted "2 snapshots after 2 edits", which the
  // broken code (NaN -> prune disabled) also satisfied. The bug was that pruning
  // stopped, so the test has to exceed the default cap and prove it still bites.
  const rel = 'docs/ai-workflow/brainstorms/__vault-keepnan.md';
  const abs = tempDoc('docs/ai-workflow/brainstorms', '__vault-keepnan.md', 'seed' + String.fromCharCode(10));
  const slot = slotFor(rel);
  cleanup([slot]);
  try {
    fs.mkdirSync(slot, { recursive: true });
    // 120 pre-existing snapshots (> the 100 default).
    const base = Date.now();
    for (let i = 0; i < 120; i += 1) {
      const name = `20260101T${String(i).padStart(6, '0')}Z-${String(i).padStart(12, '0')}.md`;
      const f = path.join(slot, name);
      fs.writeFileSync(f, `v${i}`);
      const t = (base - (120 - i) * 1000) / 1000;
      fs.utimesSync(f, t, t);
    }
    fs.writeFileSync(abs, 'trigger' + String.fromCharCode(10));
    runHook(abs, { SWAN_VAULT_KEEP: 'abc' });

    // Count only well-formed snapshots - junk names are excluded from retention
    // by design (F8), so counting them would test the wrong thing (R2-13).
    const n = fs.readdirSync(slot).filter((f) => /^\d{8}T\d{6}Z-[0-9a-f]{8,}\./.test(f)).length;
    assert.ok(n <= 100, `garbage KEEP must fall back to the 100 default, got ${n}`);
  } finally {
    cleanup([abs, slot]);
  }
});

test('F8: junk files never consume a retention slot', () => {
  const rel = 'docs/ai-workflow/brainstorms/__vault-junk.md';
  const abs = tempDoc('docs/ai-workflow/brainstorms', '__vault-junk.md', 'a\n');
  const slot = slotFor(rel);
  cleanup([slot]);
  try {
    runHook(abs);
    fs.writeFileSync(path.join(slot, 'Thumbs.db'), 'junk');
    fs.writeFileSync(abs, 'b\n');
    runHook(abs, { SWAN_VAULT_KEEP: '1' });
    const snaps = fs.readdirSync(slot).filter((f) => f !== 'Thumbs.db');
    assert.equal(snaps.length, 1);
    assert.match(fs.readFileSync(path.join(slot, snaps[0]), 'utf8'), /^b/, 'kept the newest real snapshot');
  } finally {
    cleanup([abs, slot]);
  }
});

test('F3: an unwritable vault is logged, not silent — and still exits 0', () => {
  const rel = 'docs/ai-workflow/brainstorms/__vault-err.md';
  const abs = tempDoc('docs/ai-workflow/brainstorms', '__vault-err.md', 'a\n');
  const slot = slotFor(rel);
  cleanup([slot]);
  try {
    // A FILE where the slot dir must go => mkdirSync throws (ENOTDIR/EEXIST).
    fs.mkdirSync(path.dirname(slot), { recursive: true });
    fs.writeFileSync(slot, 'not a directory');
    const r = runHook(abs);
    assert.equal(r.status, 0, 'still fail-open');
    assert.match(r.stderr, /\[vault\] snapshot skipped/, 'the failure is visible on stderr');
    assert.ok(fs.existsSync(path.join(VAULT, 'ERRORS.log')), 'and recorded in ERRORS.log');
  } finally {
    cleanup([abs, slot]);
  }
});

test('the hook never blocks, whatever it is fed', () => {
  for (const input of ['', 'not json', '{}', '{"tool_input":{}}']) {
    const r = spawnSync(process.execPath, [HOOK], { input, encoding: 'utf8' });
    assert.equal(r.status, 0, `exit 0 for input: ${JSON.stringify(input)}`);
  }
});

test('F1: a Bash payload snapshots the blueprints its command names', () => {
  const rel = 'docs/ai-workflow/brainstorms/__vault-bash.md';
  const abs = tempDoc('docs/ai-workflow/brainstorms', '__vault-bash.md', 'BASH VERSION ONE\n');
  const slot = slotFor(rel);
  cleanup([slot]);
  try {
    const r = spawnSync(process.execPath, [HOOK], {
      input: JSON.stringify({
        tool_name: 'Bash',
        tool_input: { command: `sed -i 's/ONE/TWO/' ${rel}` },
      }),
      encoding: 'utf8',
      cwd: os.tmpdir(),
    });
    assert.equal(r.status, 0, 'never blocks');
    const snaps = fs.readdirSync(slot);
    assert.equal(snaps.length, 1, 'the pre-command content was captured');
    assert.match(fs.readFileSync(path.join(slot, snaps[0]), 'utf8'), /BASH VERSION ONE/);
  } finally {
    cleanup([abs, slot]);
  }
});

test('F1: a Bash command naming no blueprint snapshots nothing', () => {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'npm run build && ls -la' } }),
    encoding: 'utf8',
  });
  assert.equal(r.status, 0);
  assert.equal(fs.existsSync(slotFor('npm')), false);
});

// ---------------------------------------------------------------------------
// Round-2 additions: controls the first suite was missing (R2-9, R2-12, R2-13).
// ---------------------------------------------------------------------------

test('R2-9: the settings matcher still arms this hook on all four write paths', () => {
  // The suite cannot see settings drift; a matcher edit could silently disarm
  // every test above without a single failure.
  const settings = JSON.parse(fs.readFileSync(path.join(REPO, '.claude', 'settings.json'), 'utf8'));
  const entry = (settings.hooks?.PreToolUse || [])
    .find((e) => JSON.stringify(e).includes('vault-guard'));
  assert.ok(entry, 'vault-guard must be registered under PreToolUse');
  for (const tool of ['Write', 'Edit', 'NotebookEdit', 'Bash']) {
    assert.ok(entry.matcher.includes(tool), `matcher must include ${tool}, got: ${entry.matcher}`);
  }
});

test('R2-13: false-positive control — an EXISTING non-blueprint file is not vaulted', () => {
  // The original negative control named `npm`, which never existed as a file, so
  // nothing was being suppressed and the test proved nothing.
  const before = new Set(fs.existsSync(VAULT) ? fs.readdirSync(VAULT) : []);
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'cat backend/package.json' } }),
    encoding: 'utf8',
  });
  assert.equal(r.status, 0);
  assert.equal(fs.existsSync(slotFor('backend/package.json')), false, 'a real, non-blueprint file stays out');
  const after = new Set(fs.existsSync(VAULT) ? fs.readdirSync(VAULT) : []);
  assert.deepEqual([...after], [...before], 'the vault is unchanged as a whole');
});

test('R2-1: a destructive command with NO filename still snapshots the tree', () => {
  const rel = 'docs/ai-workflow/brainstorms/__vault-destructive.md';
  const abs = tempDoc('docs/ai-workflow/brainstorms', '__vault-destructive.md', 'ABOUT TO BE RESET\n');
  const slot = slotFor(rel);
  cleanup([slot]);
  try {
    const r = spawnSync(process.execPath, [HOOK], {
      input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git reset --hard origin/main' } }),
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, 'never blocks');
    assert.ok(fs.existsSync(slot), 'the live version was captured before the reset');
    const bodies = fs.readdirSync(slot).map((f) => fs.readFileSync(path.join(slot, f), 'utf8'));
    assert.ok(bodies.some((b) => /ABOUT TO BE RESET/.test(b)));
  } finally {
    cleanup([abs, slot]);
  }
});

test('R2-4: a glob that names no real path still triggers the docs sweep', () => {
  const rel = 'docs/ai-workflow/brainstorms/__vault-glob.md';
  const abs = tempDoc('docs/ai-workflow/brainstorms', '__vault-glob.md', 'GLOB TARGET\n');
  const slot = slotFor(rel);
  cleanup([slot]);
  try {
    const r = spawnSync(process.execPath, [HOOK], {
      input: JSON.stringify({
        tool_name: 'Bash',
        tool_input: { command: "npx prettier --write 'docs/**/*.md'" },
      }),
      encoding: 'utf8',
    });
    assert.equal(r.status, 0);
    assert.ok(fs.existsSync(slot), 'glob paths never stat, so the sweep must cover them');
  } finally {
    cleanup([abs, slot]);
  }
});

test('R2-3: a huge heredoc body does not turn into a syscall storm', () => {
  const big = `cat > docs/ai-workflow/brainstorms/__x.md <<'EOF'\n${'lorem ipsum dolor sit amet '.repeat(40000)}\nEOF`;
  const started = Date.now();
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: big } }),
    encoding: 'utf8',
  });
  const ms = Date.now() - started;
  assert.equal(r.status, 0);
  assert.ok(ms < 5000, `hook must stay fast on a 1MB command, took ${ms}ms`);
});

test('R2-12: ERRORS.log records the failing path, not merely "a file exists"', () => {
  const rel = 'docs/ai-workflow/brainstorms/__vault-err2.md';
  const abs = tempDoc('docs/ai-workflow/brainstorms', '__vault-err2.md', 'a\n');
  const slot = slotFor(rel);
  const log = path.join(VAULT, 'ERRORS.log');
  cleanup([slot, log]);
  try {
    fs.mkdirSync(path.dirname(slot), { recursive: true });
    fs.writeFileSync(slot, 'a FILE where the slot dir must go');
    runHook(abs);
    assert.ok(fs.existsSync(log), 'the failure is recorded');
    assert.match(fs.readFileSync(log, 'utf8'), /__vault-err2\.md/, 'and names the file it could not protect');
  } finally {
    cleanup([abs, slot, log]);
  }
});
