#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: mcp-lifecycle-runtime.test.mjs
 * PURPOSE: Lock lifecycle mode, budget, recovery, and observability contracts.
 * AUTHOR: Codex | LAST MODIFIED: 2026-08-09
 * AI VILLAGE VALIDATED: Not run (permission-gated)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Exercises the fail-safe runtime control plane without
 * invoking hooks, process discovery, or process termination.
 * HOW IT FITS IN THE APP: Node test runner -> lifecycle runtime policy module.
 * KEY DECISIONS: Unknown or dirty state is audit-only; budgets are monotonic.
 * NASM PROTOCOL CONTEXT: Not applicable; this is agent infrastructure.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

async function runtimeModule() {
  return import('./mcp-lifecycle-runtime.mjs').catch(() => ({}));
}

test('runtime mode fails to audit unless exact enforce is clean', async () => {
  const runtime = await runtimeModule();
  assert.equal(typeof runtime.resolveLifecycleMode, 'function');
  assert.equal(runtime.resolveLifecycleMode('audit', false), 'audit');
  assert.equal(runtime.resolveLifecycleMode('enforce', false), 'enforce');
  assert.equal(runtime.resolveLifecycleMode('enforce', true), 'audit');
  assert.equal(runtime.resolveLifecycleMode(undefined, false), 'audit');
  assert.equal(runtime.resolveLifecycleMode('unknown', false), 'audit');
});

test('process release stays mechanically sealed pending a gate-bearing revision', async () => {
  const runtime = await runtimeModule();
  assert.equal(runtime.ENFORCEMENT_ENABLED, false);
  assert.equal(typeof runtime.canReleaseProcesses, 'function');
  assert.equal(runtime.canReleaseProcesses({ command: 'hook-end', mode: 'audit', confirm: true }), false);
  assert.equal(runtime.canReleaseProcesses({
    command: 'hook-end', mode: 'enforce', confirm: true, coordinated: true,
  }), false);
  assert.equal(runtime.canReleaseProcesses({ command: 'hook-end', mode: 'enforce', confirm: true }), false);
  assert.equal(runtime.canReleaseProcesses({ command: 'hook-end', mode: 'enforce', confirm: false }), false);
  assert.equal(runtime.canReleaseProcesses({ command: 'release', mode: 'enforce', confirm: true }), false);
  assert.equal(runtime.canReleaseProcesses({
    command: 'hook-end', mode: 'enforce', confirm: true, coordinated: true, dirty: true,
  }), false);
});

test('sealed enforcement never invokes the release callback', async () => {
  const runtime = await runtimeModule();
  let calls = 0;
  const result = runtime.runReleaseBoundary({
    command: 'hook-end', mode: 'enforce', confirm: true, coordinated: true,
    release: () => { calls += 1; return { released: 1, incomplete: 0 }; },
  });
  assert.equal(calls, 0);
  assert.deepEqual(result, { released: 0, incomplete: 0, auditOnly: true });
});

test('audit hook path never invokes the release callback', async () => {
  const runtime = await runtimeModule();
  let calls = 0;
  const result = runtime.runReleaseBoundary({
    command: 'hook-end', mode: 'audit', confirm: true,
    release: () => { calls += 1; return { released: 1, incomplete: 0 }; },
  });
  assert.equal(calls, 0);
  assert.deepEqual(result, { released: 0, incomplete: 0, auditOnly: true });
});

test('absolute budget is monotonic and reserves final evidence time', async () => {
  const runtime = await runtimeModule();
  let now = 1000;
  const budget = runtime.createBudget('5000', () => now);
  assert.equal(budget.remaining(), 5000);
  assert.equal(budget.timeout(4000, 1500), 3500);
  now = 4600;
  assert.equal(budget.remaining(), 1400);
  assert.equal(budget.timeout(4000, 1500), 0);
  assert.equal(budget.has(1500), false);
  assert.equal(runtime.createBudget('invalid', () => now).totalMs, 10_000);
  assert.equal(runtime.createBudget('70000', () => now).totalMs, 10_000);
});
