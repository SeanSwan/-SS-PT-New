#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: mcp-lifecycle-claims.test.mjs
 * PURPOSE: Prove SessionStart claims only a newly created exclusive root.
 * AUTHOR: Codex | LAST MODIFIED: 2026-08-09
 * AI VILLAGE VALIDATED: Not run (permission-gated)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Exercises pure lease-claim selection against old roots
 * and same-owner concurrency.
 * HOW IT FITS IN THE APP: SessionStart register -> claim selector -> lease.
 * KEY DECISIONS: Pre-existing or multiplexed roots are never session-owned.
 * NASM PROTOCOL CONTEXT: Not applicable; this is agent infrastructure.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeProcesses } from './mcp-lifecycle-core.mjs';
import { claimSessionRoots } from './mcp-lifecycle-manager.mjs';

const ownerProcess = { pid: 100, ppid: 1, name: 'claude.exe', commandLine: 'claude.exe', createdAt: 1000 };
const rootProcess = {
  pid: 110, ppid: 100, name: 'cmd.exe',
  commandLine: 'cmd /c npx -y @playwright/mcp@latest', createdAt: 2000,
};
const owner = { kind: 'claude', pid: 100, createdAt: 1000 };
const pending = {
  sessionId: 'current', agentKind: 'claude', agentPid: 100,
  agentCreatedAt: 1000, publishedAt: 3000,
};
const inventoryAt = (createdAt) => analyzeProcesses([
  ownerProcess, { ...rootProcess, createdAt },
]);

test('SessionStart refuses a root that predates its pending publication', () => {
  assert.deepEqual(claimSessionRoots(inventoryAt(2000), owner, pending, [], [], []), []);
  assert.deepEqual(claimSessionRoots(inventoryAt(3000), owner, pending, [], [], []), []);
  assert.deepEqual(claimSessionRoots(inventoryAt(3001), owner, pending, [], [], []), [
    { pid: 110, createdAt: 3001 },
  ]);
});

test('SessionStart refuses claims under same-owner concurrency or tombstone quarantine', () => {
  const sibling = { sessionId: 'sibling', agentKind: 'claude', agentPid: 100, agentCreatedAt: 1000 };
  assert.deepEqual(claimSessionRoots(inventoryAt(3001), owner, pending, [sibling], [], []), []);
  assert.deepEqual(claimSessionRoots(inventoryAt(3001), owner, pending, [], [sibling], []), []);
  assert.deepEqual(claimSessionRoots(inventoryAt(3001), owner, pending, [], [], [
    { ownerPid: 100, ownerCreatedAt: 1000 },
  ]), []);
});
