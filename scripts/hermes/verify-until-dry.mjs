#!/usr/bin/env node
/**
 * Hermes manual adapter for the canonical Code Perfectionist engine.
 *
 * Fixed inputs are a security boundary: callers cannot select a weaker base,
 * contract, imported review, or provider approval. This command runs local
 * evidence gates, writes both verifier and Hermes receipts, and stops at
 * BLOCKED_AUTHORIZATION when Kimi K3 is required. It is deliberately absent
 * from the headless-runner channel.
 */
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { commandRun } from '../verify-until-dry/cli.mjs';
import { verifyReceipt } from '../verify-until-dry/receipt.mjs';
import {
  checkSwitches, resolveSwitchesFile, resolveVaultRoot, writeReceipt,
} from './hermesRunsLib.mjs';
import { getCommand, loadRegistry } from './registryLib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');
const CONTRACT_PATH = path.join(REPO_ROOT, 'config', 'verify-until-dry.ci-contract.json');
const COMMAND = 'verify-until-dry';

function registryRow(registry) {
  const row = getCommand(registry, COMMAND);
  if (!row || row.tier !== 'T0' || row.channels.includes('runner')) {
    throw new Error('verify-until-dry registry row missing or unsafe');
  }
  return row;
}

function receiptOutcome(verdict) {
  if (verdict === 'CLEAN_IN_PROVEN_SCOPE') return `ok — ${verdict}`;
  if (verdict === 'DIRTY') return `failed — ${verdict}`;
  return `partial — ${verdict}`;
}

export function hermesEvidencePath(vaultRoot, evidenceHash) {
  if (!/^[a-f0-9]{64}$/.test(String(evidenceHash))) throw new Error('invalid Hermes evidence hash');
  const root = path.resolve(vaultRoot);
  const out = path.join(root, 'runs', 'logs', 'verify-until-dry', `${evidenceHash}.json`);
  if (path.relative(root, out).startsWith('..')) throw new Error('invalid Hermes evidence path');
  return out;
}

function pendingEvidencePath(vaultRoot) {
  return path.join(path.resolve(vaultRoot), 'runs', 'logs', 'verify-until-dry', `.pending-${randomUUID()}.json`);
}

function persistVerifierEvidence(result, vaultRoot) {
  const bytes = fs.readFileSync(result.out);
  const evidenceSha256 = createHash('sha256').update(bytes).digest('hex');
  const finalPath = hermesEvidencePath(vaultRoot, evidenceSha256);
  fs.mkdirSync(path.dirname(finalPath), { recursive: true });
  try {
    fs.copyFileSync(result.out, finalPath, fs.constants.COPYFILE_EXCL);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const existing = createHash('sha256').update(fs.readFileSync(finalPath)).digest('hex');
    if (existing !== evidenceSha256) throw new Error('content-addressed verifier evidence mismatch');
  }
  const persisted = createHash('sha256').update(fs.readFileSync(finalPath)).digest('hex');
  if (persisted !== evidenceSha256) throw new Error('persisted verifier evidence hash mismatch');
  if (path.resolve(result.out) !== path.resolve(finalPath)) fs.unlinkSync(result.out);
  return { ...result, out: finalPath, evidenceSha256 };
}

export function validateVerifierResult(result) {
  const verified = verifyReceipt(result?.receipt);
  if (!verified.valid) throw new Error(`invalid verifier receipt: ${verified.error}`);
  if (!path.isAbsolute(result?.out ?? '')) throw new Error('invalid verifier receipt path');
  let stored;
  try {
    stored = JSON.parse(fs.readFileSync(result.out, 'utf8'));
  } catch {
    throw new Error('invalid verifier receipt evidence: output file unreadable');
  }
  const storedProof = verifyReceipt(stored);
  if (!storedProof.valid || stored.receiptHash !== result.receipt.receiptHash) {
    throw new Error('invalid verifier receipt evidence: memory/disk mismatch');
  }
  return result;
}

export async function runHermesVerification() {
  const repoRoot = REPO_ROOT;
  const vaultRoot = resolveVaultRoot();
  const switchesFile = resolveSwitchesFile();
  const now = new Date().toISOString();
  const row = registryRow(loadRegistry());
  const switchNames = [...new Set(['SWITCH_MASTER', row.killSwitch].filter(Boolean))];
  checkSwitches(vaultRoot, switchesFile, switchNames, {
    who: 'hermes/code-perfectionist', what: `${COMMAND} (${row.tier})`,
    target: repoRoot, when: now,
  });

  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  try {
    const pendingPath = pendingEvidencePath(vaultRoot);
    const result = persistVerifierEvidence(validateVerifierResult(await commandRun(repoRoot, {
      tier: null, base: null, out: pendingPath, contract, mode: 'observe', kimiReceipt: null,
    })), vaultRoot);
    const { receipt } = result;
    const verdict = receipt?.verdict?.verdict ?? 'UNPROVEN';
    const auditReceipt = writeReceipt(vaultRoot, {
      who: 'hermes/code-perfectionist', what: `${COMMAND} (${row.tier})`,
      target: repoRoot, when: now, 'approved-by': 'n/a',
      outcome: `${receiptOutcome(verdict)}; HEAD ${receipt.headSha}; source ${receipt.sourceHash}; scope ${receipt.scopeHash}; receiptHash ${receipt.receiptHash}; evidenceSha256 ${result.evidenceSha256}`,
      evidence: `${result.out}#sha256=${result.evidenceSha256}`,
    });
    return {
      clean: verdict === 'CLEAN_IN_PROVEN_SCOPE', verdict,
      evidence: `${result.out}#sha256=${result.evidenceSha256}`,
      headSha: receipt.headSha, sourceHash: receipt.sourceHash,
      scopeHash: receipt.scopeHash, receiptHash: receipt.receiptHash,
      evidenceSha256: result.evidenceSha256, hermesReceiptId: auditReceipt.id,
    };
  } catch (error) {
    writeReceipt(vaultRoot, {
      who: 'hermes/code-perfectionist', what: `${COMMAND} (${row.tier})`,
      target: repoRoot, when: now, 'approved-by': 'n/a',
      outcome: `failed — verifier execution error: ${String(error.message).slice(0, 180)}`,
      evidence: CONTRACT_PATH,
    });
    throw error;
  }
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  if (process.argv.length > 2) {
    console.error('[hermes/verify-until-dry] this command accepts no arguments');
    process.exitCode = 2;
  } else {
    runHermesVerification().then((result) => {
      process.stdout.write(`${JSON.stringify(result)}\n`);
      if (!result.clean) process.exitCode = 1;
    }).catch((error) => {
      console.error(`[hermes/verify-until-dry] ${error.message}`);
      process.exitCode = 1;
    });
  }
}
