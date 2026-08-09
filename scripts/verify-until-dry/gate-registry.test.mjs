/**
 * @file gate-registry.test.mjs
 * @description Contract tests for deterministic, risk-aware verification gates.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { selectGates } from './gate-registry.mjs';

test('every tier includes integrity, verifier, and secret gates', () => {
  for (const tier of [0, 1, 2, 3]) {
    const ids = selectGates({ tier, surfaces: [] }).map((gate) => gate.id);
    assert.deepEqual(ids.slice(0, 3), ['diff-check', 'verifier-tests', 'secret-scan']);
  }
});

test('frontend runtime changes add type, test, and build gates', () => {
  const ids = selectGates({ tier: 2, surfaces: ['frontend'] }).map((gate) => gate.id);
  assert.ok(ids.includes('frontend-typecheck'));
  assert.ok(ids.includes('frontend-tests'));
  assert.ok(ids.includes('frontend-build'));
});

test('backend high-consequence changes add tests and preflight', () => {
  const ids = selectGates({ tier: 3, surfaces: ['backend'] }).map((gate) => gate.id);
  assert.ok(ids.includes('backend-tests'));
  assert.ok(ids.includes('release-preflight'));
});

test('Tier 3 tooling does not inherit an unrelated payment preflight', () => {
  const ids = selectGates({ tier: 3, surfaces: ['tooling'] }).map((gate) => gate.id);
  assert.equal(ids.includes('release-preflight'), false);
});

test('unknown tiers and surfaces fail closed', () => {
  assert.throws(() => selectGates({ tier: 4, surfaces: [] }), /tier/i);
  assert.throws(() => selectGates({ tier: 1, surfaces: ['mystery'] }), /surface/i);
});

test('commands are argv arrays and never shell strings', () => {
  for (const gate of selectGates({ tier: 3, surfaces: ['frontend', 'backend'] })) {
    assert.equal(typeof gate.command, 'string');
    assert.ok(Array.isArray(gate.args));
    assert.ok(gate.args.every((arg) => typeof arg === 'string'));
    assert.equal(gate.shell, false);
  }
});

test('verifier self-test expands an explicit serial file list, not directory discovery', () => {
  const selfTest = selectGates({ tier: 0, surfaces: [] }).find((gate) => gate.id === 'verifier-tests');
  assert.deepEqual(selfTest.args.slice(0, 2), ['--test', '--test-concurrency=1']);
  assert.ok(selfTest.args.slice(2).every((path) => path.endsWith('.test.mjs')));
  assert.ok(selfTest.args.includes('scripts/verify-until-dry/verdict.test.mjs'));
  assert.ok(selfTest.args.includes('scripts/hooks/verify-until-dry-gate.test.mjs'));
  assert.ok(selfTest.args.includes('scripts/hooks/dry-loop-gate.test.mjs'));
});

test('diff integrity checks staged and unstaged changes against HEAD', () => {
  const diff = selectGates({ tier: 0, surfaces: [] }).find((gate) => gate.id === 'diff-check');
  assert.deepEqual(diff.args, ['diff', '--check', 'HEAD']);
});

test('secret scanning uses the evidence-validating Node wrapper with a bounded full-scan timeout', () => {
  const secret = selectGates({ tier: 0, surfaces: [] }).find((gate) => gate.id === 'secret-scan');
  assert.equal(secret.command, process.execPath);
  assert.deepEqual(secret.args, ['scripts/verify-until-dry/secret-scan-gate.mjs', '--all']);
  assert.equal(secret.timeoutMs, 600_000);
  assert.ok(secret.args.includes('scripts/verify-until-dry/secret-scan-gate.mjs'));
});
