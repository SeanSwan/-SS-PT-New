/**
 * @file cli.test.mjs
 * @description Tests command parsing, surface inference, and off-repo receipt storage.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative } from 'node:path';
import test from 'node:test';

import {
  appendUntrackedEvidence, defaultReceiptPath, inferSurfaces, parseCli, selectKimiEvidencePaths,
  commandFinalize, kimiReceiptImportAllowed,
} from './cli.mjs';
import { appendEvent, canonicalJson, sha256 } from './ledger.mjs';
import { buildReceipt } from './receipt.mjs';

test('parses run, finalize, audit, and verify commands without shell syntax', () => {
  assert.deepEqual(parseCli(['run', '--tier', '2', '--base', 'origin/main']), {
    command: 'run', tier: 2, base: 'origin/main', out: null, receipt: null, reviews: null,
    approval: null, contract: null, kimiReceipt: null, mode: 'observe',
    input: null, reviewer: null, axes: null, coverage: null, findings: null,
  });
  assert.equal(parseCli(['audit']).command, 'audit');
  assert.equal(parseCli(['finalize', '--receipt', 'r.json', '--reviews', 'v.json']).reviews, 'v.json');
  assert.equal(parseCli(['kimi', '--approval', 'approval.json']).approval, 'approval.json');
  assert.throws(() => parseCli(['destroy']), /command/i);
  assert.throws(() => parseCli(['run', '--tier', '9']), /tier/i);
  assert.throws(() => parseCli(['run', '--mode', 'maybe']), /mode/i);
});

test('surface inference is deterministic and gate-registry compatible', () => {
  assert.deepEqual(inferSurfaces(['frontend/a.tsx', 'backend/b.mjs']), ['backend', 'frontend']);
  assert.deepEqual(inferSurfaces(['docs/a.md']), ['docs']);
  assert.deepEqual(inferSurfaces(['scripts/tool.mjs', '.github/workflows/a.yml']), ['tooling']);
});

test('default receipts live under OS temp, never the repository', () => {
  const path = defaultReceiptPath('C:\\example\\repo');
  assert.equal(isAbsolute(path), true);
  assert.equal(relative(tmpdir(), path).startsWith('..'), false);
  assert.match(path, /verify-until-dry/);
});

test('Kimi receipts import only against the current exact authorization blocker', () => {
  assert.equal(kimiReceiptImportAllowed({
    risk: { kimiRequired: true }, kimi: { status: 'BLOCKED_AUTHORIZATION' },
  }), true);
  for (const status of ['BLOCKED_NO_SAFE_EVIDENCE', 'BLOCKED_CEILING', 'BLOCKED_COST_CAP', 'BLOCKED_PACKET_SIZE']) {
    assert.equal(kimiReceiptImportAllowed({ risk: { kimiRequired: true }, kimi: { status } }), false, status);
  }
});

test('untracked text contributes content and line complexity while binary stays bounded', () => {
  const root = mkdtempSync(join(tmpdir(), 'verify-cli-'));
  try {
    writeFileSync(join(root, 'new.mjs'), 'one\ntwo\nthree\n');
    writeFileSync(join(root, 'asset.bin'), Buffer.from([0, 1, 2, 3]));
    const result = appendUntrackedEvidence(root, ['new.mjs', 'asset.bin'], '', 0);
    assert.match(result.diffText, /one\ntwo\nthree/);
    assert.match(result.diffText, /binary omitted/i);
    assert.equal(result.changedLines, 3);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Kimi packet selection excludes narrative docs but retains changed tests', () => {
  assert.deepEqual(selectKimiEvidencePaths([
    'docs/plan.md',
    '.agents/skills/verify-until-dry/SKILL.md',
    'scripts/verify-until-dry/engine.test.mjs',
    'scripts/verify-until-dry/engine.mjs',
    'config/verify-until-dry.config.mjs',
  ]), [
    'config/verify-until-dry.config.mjs',
    'scripts/verify-until-dry/engine.mjs',
    'scripts/verify-until-dry/engine.test.mjs',
  ]);
});

test('finalize rejects hand-authored vantage arrays without completed review evidence', () => {
  const root = mkdtempSync(join(tmpdir(), 'verify-finalize-'));
  const headSha = 'a'.repeat(40);
  const scopeContract = { tier: 0, surfaces: ['docs'], paths: ['docs/a.md'] };
  const scopeHash = sha256(canonicalJson(scopeContract));
  const sourceHash = 'c'.repeat(64);
  let ledger = appendEvent([], { type: 'snapshot', headSha, sourceHash, scopeHash });
  const requiredGates = ['diff-check', 'verifier-tests', 'secret-scan'];
  const gates = {};
  for (const [index, id] of requiredGates.entries()) {
    gates[id] = { status: 'pass', current: true, outputHash: String(index + 1).repeat(64), exitCode: 0 };
    ledger = appendEvent(ledger, { type: 'gate', gateId: id, ...gates[id] });
  }
  const receipt = buildReceipt({
    tier: 0, headSha, sourceHash, scopeHash, scopeContract, reviewedScopeHash: scopeHash,
    reviewPacketHash: 'd'.repeat(64), requiredGates, gates, findings: [], blockers: [],
    ledger, reviews: [], vantages: [],
  });
  writeFileSync(join(root, 'receipt.json'), JSON.stringify(receipt));
  writeFileSync(join(root, 'reviews.json'), JSON.stringify({ vantages: [
    { clean: true, axes: ['static-control-flow'] }, { clean: true, axes: ['dynamic-runtime'] },
  ] }));
  try {
    assert.throws(() => commandFinalize(root, {
      receipt: 'receipt.json', reviews: 'reviews.json', out: 'final.json',
    }), /review artifact is invalid/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
