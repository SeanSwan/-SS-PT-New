import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { appendEvent, canonicalJson, sha256 } from '../verify-until-dry/ledger.mjs';
import { buildReceipt } from '../verify-until-dry/receipt.mjs';
import { classifyEvidence, readReceipts, seedSwitches } from './hermesRunsLib.mjs';
import {
  hermesEvidencePath, runHermesVerification, validateVerifierResult,
} from './verify-until-dry.mjs';

function validBlockedResult(root) {
  const headSha = 'a'.repeat(40);
  const sourceHash = 'b'.repeat(64);
  const scopeContract = { tier: 0, surfaces: ['docs'], paths: ['docs/a.md'] };
  const scopeHash = sha256(canonicalJson(scopeContract));
  let ledger = appendEvent([], { type: 'snapshot', headSha, sourceHash, scopeHash });
  const requiredGates = ['diff-check', 'verifier-tests', 'secret-scan'];
  const gates = {};
  for (const [index, id] of requiredGates.entries()) {
    gates[id] = { status: 'pass', current: true, outputHash: String(index + 1).repeat(64), exitCode: 0 };
    ledger = appendEvent(ledger, { type: 'gate', gateId: id, ...gates[id] });
  }
  const receipt = buildReceipt({
    tier: 0, headSha, sourceHash, scopeHash, scopeContract, ledger,
    reviewPacketHash: 'e'.repeat(64), requiredGates, gates,
    findings: [], blockers: ['manual-test-blocker'], escalations: [],
    vantages: [], reviews: [],
  });
  const out = path.join(root, 'receipt.json');
  fs.writeFileSync(out, `${JSON.stringify(receipt)}\n`);
  return { out, receipt };
}

test('only a hash-valid receipt matching its on-disk evidence is accepted', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-vud-proof-'));
  const result = validBlockedResult(root);
  assert.equal(validateVerifierResult(result).receipt.verdict.verdict, 'BLOCKED');
  const forged = structuredClone(result);
  forged.receipt.verdict.verdict = 'CLEAN_IN_PROVEN_SCOPE';
  assert.throws(() => validateVerifierResult(forged), /invalid verifier receipt/);
  fs.writeFileSync(result.out, '{}\n');
  assert.throws(() => validateVerifierResult(result), /evidence/);
});

test('a caller-supplied fake CLEAN result cannot forge a Hermes clean receipt', () => {
  assert.throws(() => validateVerifierResult({
    out: 'C:/tmp/nonexistent-verifier-receipt.json',
    receipt: { verdict: { verdict: 'CLEAN_IN_PROVEN_SCOPE' } },
  }), /invalid verifier receipt/i);
});

test('master switch off refuses the sealed entrypoint before deterministic gates', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-vud-switch-'));
  const vaultRoot = path.join(root, 'vault');
  const switchesFile = path.join(root, 'switches.json');
  seedSwitches(switchesFile, { SWITCH_MASTER: false });
  const priorVault = process.env.HERMES_VAULT_ROOT;
  const priorSwitches = process.env.HERMES_SWITCHES_FILE;
  process.env.HERMES_VAULT_ROOT = vaultRoot;
  process.env.HERMES_SWITCHES_FILE = switchesFile;
  try {
    await assert.rejects(() => runHermesVerification(), /SWITCH_MASTER is off/);
    assert.match(readReceipts(vaultRoot, new Date().toISOString().slice(0, 10))[0].outcome, /^refused/);
  } finally {
    if (priorVault === undefined) delete process.env.HERMES_VAULT_ROOT;
    else process.env.HERMES_VAULT_ROOT = priorVault;
    if (priorSwitches === undefined) delete process.env.HERMES_SWITCHES_FILE;
    else process.env.HERMES_SWITCHES_FILE = priorSwitches;
  }
});

test('Hermes adapter is sealed, unscheduled, and contains no paid Kimi path', () => {
  const source = fs.readFileSync(new URL('./verify-until-dry.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /executeKimiReview|planKimiReview|--approval|kimi-receipt/);
  assert.doesNotMatch(source, /runImpl|runHermesVerification\(\s*\{|registry\s*=/);
  assert.match(source, /commandRun/);
  assert.equal(runHermesVerification.length, 0);
});

test('each Hermes run gets a durable non-overwriting evidence path in the vault', () => {
  const vault = path.resolve('C:/tmp/hermes-vud-vault');
  const first = hermesEvidencePath(vault, 'a'.repeat(64));
  const second = hermesEvidencePath(vault, 'b'.repeat(64));
  assert.notEqual(first, second);
  assert.equal(path.relative(vault, first).startsWith('..'), false);
  assert.match(first.replaceAll('\\', '/'), /runs\/logs\/verify-until-dry\/a{64}\.json$/);
});

test('Windows evidence paths are hash-verified and replacement is detected', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-vud-evidence-'));
  const file = path.join(root, 'receipt.json');
  const bytes = '{"receipt":"A"}\n';
  fs.writeFileSync(file, bytes);
  const hash = createHash('sha256').update(bytes).digest('hex');
  const pointer = `${file}#sha256=${hash}`;
  assert.deepEqual(classifyEvidence(root, pointer), { kind: 'path', verified: true });
  fs.writeFileSync(file, '{"receipt":"B"}\n');
  assert.equal(classifyEvidence(root, pointer).verified, false);
});

test('every verifier Git subprocess has a bounded timeout', () => {
  for (const relative of [
    '../verify-until-dry/repository-audit.mjs',
    '../verify-until-dry/snapshot.mjs',
    '../verify-until-dry/fenced-runner.mjs',
  ]) {
    const source = fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
    assert.match(source, /timeout:\s*GIT_TIMEOUT_MS/, relative);
  }
});
