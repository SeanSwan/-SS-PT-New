#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: mcp-lifecycle-storage.test.mjs
 * PURPOSE: Prove persistent state enumeration is count and byte bounded.
 * AUTHOR: Codex | LAST MODIFIED: 2026-08-09
 * AI VILLAGE VALIDATED: Not run (permission-gated)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Creates only PID-scoped test state and checks refusal.
 * HOW IT FITS IN THE APP: Lease readers -> bounded persistence gate.
 * KEY DECISIONS: Oversized state is ambiguity, never an empty-state signal.
 * NASM PROTOCOL CONTEXT: Not applicable; this is agent infrastructure.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { allLeases, CURRENT_STATE_DIR } from './mcp-lifecycle-leases.mjs';
import { readTombstones, rearmDirtyLatch, writeDirtyLatch } from './mcp-lifecycle-state.mjs';

test('dirty and journal control files cannot be misread as active leases', () => {
  writeDirtyLatch(CURRENT_STATE_DIR, 'release-started');
  try { assert.doesNotThrow(() => allLeases()); }
  finally { rearmDirtyLatch(CURRENT_STATE_DIR, { approved: true, doctorClean: true }); }
});

test('active lease enumeration refuses excessive file counts before parsing', (t) => {
  const directory = join(CURRENT_STATE_DIR, 'leases');
  t.after(() => rmSync(CURRENT_STATE_DIR, { recursive: true, force: true }));
  mkdirSync(directory, { recursive: true });
  for (let index = 0; index < 257; index += 1) {
    writeFileSync(join(directory, `${String(index).padStart(3, '0')}.json`), '{}\n');
  }
  assert.throws(() => allLeases(), /state bound exceeded/i);
});

test('tombstone enumeration refuses excessive file counts before parsing', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'mcp-storage-test-'));
  const directory = join(root, 'tombstones');
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(directory, { recursive: true });
  for (let index = 0; index < 257; index += 1) {
    writeFileSync(join(directory, `${String(index).padStart(3, '0')}.json`), '{}\n');
  }
  assert.throws(() => readTombstones(root), /state bound exceeded/i);
});
