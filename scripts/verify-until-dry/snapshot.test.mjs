#!/usr/bin/env node
/**
 * FILE: scripts/verify-until-dry/snapshot.test.mjs
 * PURPOSE: Bind evidence to exact committed, dirty, untracked, and scope state.
 * RUN: node --test scripts/verify-until-dry/snapshot.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { captureSnapshot, compareSnapshots } from './snapshot.mjs';

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function repo() {
  const cwd = mkdtempSync(join(tmpdir(), 'verify-snapshot-'));
  git(cwd, 'init');
  git(cwd, 'config', 'user.email', 'verify@example.invalid');
  git(cwd, 'config', 'user.name', 'Verify Test');
  writeFileSync(join(cwd, 'tracked.txt'), 'one\n');
  git(cwd, 'add', 'tracked.txt');
  git(cwd, 'commit', '-m', 'test: baseline');
  return cwd;
}

test('identical trees and scope contracts compare as current', () => {
  const cwd = repo();
  const scope = { requirements: ['REQ-1'], files: ['tracked.txt'] };
  const first = captureSnapshot({ cwd, scopeContract: scope });
  const second = captureSnapshot({ cwd, scopeContract: scope });
  assert.deepEqual(compareSnapshots(first, second), { current: true, reasons: [] });
});

test('tracked, staged, and untracked changes alter the source hash', () => {
  const cwd = repo();
  const scope = { requirements: ['REQ-1'] };
  const clean = captureSnapshot({ cwd, scopeContract: scope });

  writeFileSync(join(cwd, 'tracked.txt'), 'two\n');
  const dirty = captureSnapshot({ cwd, scopeContract: scope });
  assert.equal(compareSnapshots(clean, dirty).current, false);

  git(cwd, 'add', 'tracked.txt');
  const staged = captureSnapshot({ cwd, scopeContract: scope });
  assert.notEqual(staged.sourceHash, dirty.sourceHash);

  writeFileSync(join(cwd, 'new.txt'), 'untracked\n');
  const untracked = captureSnapshot({ cwd, scopeContract: scope });
  assert.notEqual(untracked.sourceHash, staged.sourceHash);
});

test('scope narrowing invalidates otherwise identical code evidence', () => {
  const cwd = repo();
  const full = captureSnapshot({
    cwd,
    scopeContract: { requirements: ['REQ-1', 'REQ-2'] },
  });
  const narrowed = captureSnapshot({
    cwd,
    scopeContract: { requirements: ['REQ-1'] },
  });
  const result = compareSnapshots(full, narrowed);
  assert.equal(result.current, false);
  assert.ok(result.reasons.includes('scope-contract-changed'));
});
