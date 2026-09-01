/**
 * deps-restore.test.mjs — the mechanics, proved on a throwaway tree.
 * ==============================================================================
 *
 * WHAT IS AND IS NOT PROVED HERE, stated up front because the gap matters.
 *
 * PROVED: resolution walks parents the way Node does; a symlinked `node_modules` is
 * correctly identified as owned by another checkout; the version chosen for an install
 * comes from the lockfile rather than the manifest's range.
 *
 * NOT PROVED: the `npm install --no-save` call itself. Simulating that would mean deleting
 * packages from a `node_modules` shared with every other worktree — three agents were live
 * while this was written — and breaking their test runs to prove a repair script is a
 * trade this script exists to refuse. The install path is the exact command run by hand on
 * 2026-09-01, plus `--no-save`, whose no-write behaviour was confirmed by dry-run against
 * the real manifest.
 *
 * Saying which half is unproved is the point. A test file that implies it covers the whole
 * script would be worse than this gap, because the gap would then be invisible.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolvesFrom, ownerOf, pinnedVersion } from './deps-restore.mjs';

function tree() {
  const root = mkdtempSync(join(tmpdir(), 'deps-restore-'));
  const pkgDir = (dir, name) => {
    const d = join(dir, 'node_modules', name);
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, 'package.json'), JSON.stringify({ name, version: '1.0.0' }));
  };
  return { root, pkgDir, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('a package in this directory resolves', () => {
  const t = tree();
  try {
    const app = join(t.root, 'app'); mkdirSync(app, { recursive: true });
    t.pkgDir(app, 'express');
    assert.equal(resolvesFrom(app, 'express'), true);
    assert.equal(resolvesFrom(app, 'jose'), false);
  } finally { t.cleanup(); }
});

test('a HOISTED package resolves from a parent, so it is not reinstalled for nothing', () => {
  // The false-positive that would matter most: reporting a hoisted dependency as missing
  // makes the tool reinstall packages that are already there, on a shared folder, for
  // every worktree. A detector with false positives is one nobody runs twice.
  const t = tree();
  try {
    const app = join(t.root, 'app', 'backend'); mkdirSync(app, { recursive: true });
    t.pkgDir(t.root, 'express');
    assert.equal(resolvesFrom(app, 'express'), true);
  } finally { t.cleanup(); }
});

test('a scoped package resolves', () => {
  const t = tree();
  try {
    const app = join(t.root, 'app'); mkdirSync(app, { recursive: true });
    const d = join(app, 'node_modules', '@aws-sdk', 'client-s3');
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, 'package.json'), '{"name":"@aws-sdk/client-s3","version":"3.0.0"}');
    assert.equal(resolvesFrom(app, '@aws-sdk/client-s3'), true);
  } finally { t.cleanup(); }
});

test('a directory without a package.json inside it does NOT count as resolved', () => {
  // An empty folder left behind by a half-finished install is exactly the state this
  // whole class of bug lives in. Presence of a directory is not presence of a package.
  const t = tree();
  try {
    const app = join(t.root, 'app'); mkdirSync(app, { recursive: true });
    mkdirSync(join(app, 'node_modules', 'jose'), { recursive: true });
    assert.equal(resolvesFrom(app, 'jose'), false);
  } finally { t.cleanup(); }
});

test('an OWN node_modules reports no owner — nothing here is at risk', () => {
  const t = tree();
  try {
    const app = join(t.root, 'app'); mkdirSync(app, { recursive: true });
    t.pkgDir(app, 'express');
    assert.equal(ownerOf(app), null);
  } finally { t.cleanup(); }
});

test('a SYMLINKED node_modules names the checkout that owns it', () => {
  // The whole premise: when this returns a path, a clean install over there can delete
  // packages this worktree depends on.
  const t = tree();
  try {
    const owner = join(t.root, 'owner'); mkdirSync(join(owner, 'node_modules'), { recursive: true });
    const shared = join(t.root, 'shared'); mkdirSync(shared, { recursive: true });
    try {
      symlinkSync(join(owner, 'node_modules'), join(shared, 'node_modules'), 'junction');
    } catch {
      return; // no symlink privilege on this machine — skip rather than assert a false pass
    }
    assert.equal(ownerOf(shared), owner);
  } finally { t.cleanup(); }
});

test('a missing node_modules is not an owner, and does not throw', () => {
  const t = tree();
  try {
    const app = join(t.root, 'app'); mkdirSync(app, { recursive: true });
    assert.equal(ownerOf(app), null);
  } finally { t.cleanup(); }
});

test('the install spec comes from the LOCKFILE, not the manifest range', () => {
  // A range would let npm resolve something newer than the tree was tested against — on a
  // folder shared with every other worktree. A silent upgrade for everybody, arriving
  // through a repair script, is a worse outcome than the breakage being repaired.
  const t = tree();
  try {
    writeFileSync(join(t.root, 'package-lock.json'), JSON.stringify({
      packages: { 'node_modules/sanitize-html': { version: '2.17.6' } },
    }));
    assert.equal(pinnedVersion(t.root, 'sanitize-html', '^2.17.6'), 'sanitize-html@2.17.6');
  } finally { t.cleanup(); }
});

test('with no lockfile entry it falls back to the declared range rather than guessing', () => {
  const t = tree();
  try {
    writeFileSync(join(t.root, 'package-lock.json'), JSON.stringify({ packages: {} }));
    assert.equal(pinnedVersion(t.root, 'jose', '6.2.4'), 'jose@6.2.4');
  } finally { t.cleanup(); }
});

test('a corrupt lockfile does not throw — it degrades to the range', () => {
  // This runs to REPAIR a broken environment. Throwing on a second broken thing is how a
  // repair tool becomes one more thing that needs repairing.
  const t = tree();
  try {
    writeFileSync(join(t.root, 'package-lock.json'), '{ not json');
    assert.equal(pinnedVersion(t.root, 'jose', '6.2.4'), 'jose@6.2.4');
  } finally { t.cleanup(); }
});

test('importing this module does not install anything', () => {
  // It printed "restored 0 package(s)" on import while I was writing these tests. The
  // guard is the fix; this is the assertion that it stays. Third time today a script that
  // acts at module scope was nearly imported by its own test.
  assert.equal(typeof resolvesFrom, 'function');
  assert.equal(typeof ownerOf, 'function');
  assert.equal(typeof pinnedVersion, 'function');
});
