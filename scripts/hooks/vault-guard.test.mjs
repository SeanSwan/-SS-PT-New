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

test('F5: prune keeps the newest KEEP snapshots even when names sort badly', () => {
  const rel = 'docs/ai-workflow/brainstorms/__vault-prune.md';
  const abs = tempDoc('docs/ai-workflow/brainstorms', '__vault-prune.md', 'v1\n');
  const slot = slotFor(rel);
  cleanup([slot]);
  try {
    for (const v of ['v1', 'v2', 'v3']) {
      fs.writeFileSync(abs, `${v}\n`);
      runHook(abs, { SWAN_VAULT_KEEP: '2' });
    }
    const files = fs.readdirSync(slot);
    assert.equal(files.length, 2, 'capped at KEEP');
    const bodies = files.map((f) => fs.readFileSync(path.join(slot, f), 'utf8')).join('');
    assert.ok(/v2/.test(bodies) && /v3/.test(bodies), 'the two NEWEST survive');
    assert.ok(!/v1/.test(bodies), 'the oldest was pruned');
  } finally {
    cleanup([abs, slot]);
  }
});

test('F5: a garbage SWAN_VAULT_KEEP falls back to the default instead of disabling prune', () => {
  const rel = 'docs/ai-workflow/brainstorms/__vault-keepnan.md';
  const abs = tempDoc('docs/ai-workflow/brainstorms', '__vault-keepnan.md', 'a\n');
  const slot = slotFor(rel);
  cleanup([slot]);
  try {
    fs.writeFileSync(abs, 'a\n'); runHook(abs, { SWAN_VAULT_KEEP: 'abc' });
    fs.writeFileSync(abs, 'b\n'); runHook(abs, { SWAN_VAULT_KEEP: 'abc' });
    assert.equal(fs.readdirSync(slot).length, 2, 'still snapshotting under a bad KEEP');
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
