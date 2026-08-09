#!/usr/bin/env node
/**
 * @file cli.mjs
 * @description Command-line adapter for audits, fenced gates, receipt finalization, and verification.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import config from '../../config/verify-until-dry.config.mjs';
import { runDeterministicPass } from './engine.mjs';
import { executeKimiReview, planKimiReview } from './kimi-escalation.mjs';
import { buildKimiReceipt, validateKimiReceipt } from './kimi-receipt.mjs';
import { appendEvent } from './ledger.mjs';
import { buildReceipt, verifyReceipt } from './receipt.mjs';
import { auditRepository } from './repository-audit.mjs';
import { buildCompletedReview, validateCompletedReviews, validateReviewSet } from './review-proof.mjs';

export { appendUntrackedEvidence, inferSurfaces, selectKimiEvidencePaths } from './repository-audit.mjs';

const COMMANDS = new Set(['audit', 'run', 'record-review', 'finalize', 'verify', 'kimi']);

export function parseCli(argv) {
  const command = argv[0] ?? 'audit';
  if (!COMMANDS.has(command)) throw new Error(`Unknown command: ${command}`);
  const option = (name) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] ?? null : null;
  };
  const tierText = option('tier');
  const tier = tierText === null ? null : Number(tierText);
  if (tier !== null && (!Number.isInteger(tier) || tier < 0 || tier > 3)) throw new Error(`Invalid tier: ${tierText}`);
  const mode = option('mode') ?? process.env.VERIFY_UNTIL_DRY_MODE ?? 'observe';
  if (!['observe', 'enforce'].includes(mode)) throw new Error(`Invalid mode: ${mode}`);
  return {
    command, tier, base: option('base'), out: option('out'), receipt: option('receipt'),
    reviews: option('reviews'), approval: option('approval'), contract: option('contract'),
    kimiReceipt: option('kimi-receipt'), mode,
    input: option('input'), reviewer: option('reviewer'), axes: option('axes'), findings: option('findings'),
  };
}

export function defaultReceiptPath(repoRoot) {
  const id = createHash('sha256').update(resolve(repoRoot)).digest('hex').slice(0, 16);
  return join(tmpdir(), 'verify-until-dry', id, 'latest-receipt.json');
}


function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export async function commandRun(repoRoot, args) {
  const audit = auditRepository(repoRoot, args, config);
  const blockers = [];
  const reviews = [];
  if (audit.risk.kimiRequired) {
    if (!args.kimiReceipt) blockers.push(`kimi-k3:${audit.kimi.status}`);
    else {
      const proof = validateKimiReceipt(readJson(resolve(repoRoot, args.kimiReceipt)), {
        packet: audit.packet, model: config.kimi.model,
      });
      if (!proof.valid) blockers.push(`kimi-k3:${proof.error}`);
      else if (!proof.clean) blockers.push('kimi-k3:REVISE');
      else reviews.push(proof.review);
    }
  }
  const receipt = await runDeterministicPass({
    repoRoot,
    tier: audit.risk.tier,
    surfaces: audit.surfaces,
    scopeContract: audit.scopeContract,
    snapshot: audit.snapshot,
    reviewPacketHash: audit.packet.hash,
    blockers,
    reviews,
  });
  const out = args.out ? resolve(repoRoot, args.out) : defaultReceiptPath(repoRoot);
  writeJson(out, receipt);
  return { receipt, out, audit };
}

export function commandFinalize(repoRoot, args) {
  if (!args.receipt || !args.reviews) throw new Error('finalize requires --receipt and --reviews');
  const receipt = readJson(resolve(repoRoot, args.receipt));
  const verified = verifyReceipt(receipt);
  if (!verified.valid) throw new Error(`Cannot finalize invalid receipt: ${verified.error}`);
  const review = readJson(resolve(repoRoot, args.reviews));
  const proof = validateReviewSet(review, receipt);
  if (!proof.valid) throw new Error(`Review artifact is invalid: ${proof.error}`);
  const combined = validateCompletedReviews([...(receipt.reviews ?? []), ...proof.reviews], receipt);
  if (!combined.valid) throw new Error(`Combined review evidence is invalid: ${combined.error}`);
  let ledger = receipt.ledger;
  for (const completed of proof.reviews) ledger = appendEvent(ledger, {
    type: 'review', id: completed.id, reviewer: completed.reviewer,
    packetHash: completed.packetHash, outputHash: completed.outputHash, clean: completed.clean,
  });
  const finalized = buildReceipt({
    ...receipt,
    reviewedScopeHash: receipt.scopeHash,
    vantages: combined.vantages,
    reviews: combined.reviews,
    findings: [...receipt.findings, ...combined.findings],
    ledger,
  });
  const out = args.out ? resolve(repoRoot, args.out) : resolve(repoRoot, args.receipt);
  writeJson(out, finalized);
  return { receipt: finalized, out };
}

export function commandRecordReview(repoRoot, args) {
  if (!args.receipt || !args.input || !args.reviewer || !args.axes || !args.out) {
    throw new Error('record-review requires --receipt, --input, --reviewer, --axes, and --out');
  }
  const receipt = readJson(resolve(repoRoot, args.receipt));
  const verified = verifyReceipt(receipt);
  if (!verified.valid) throw new Error(`Cannot record review for invalid receipt: ${verified.error}`);
  const findings = args.findings ? readJson(resolve(repoRoot, args.findings)) : [];
  if (!Array.isArray(findings)) throw new Error('Review findings file must contain an array');
  const output = readFileSync(resolve(repoRoot, args.input), 'utf8');
  const completed = buildCompletedReview({
    id: `R-${createHash('sha256').update(`${args.reviewer}\0${output}`).digest('hex').slice(0, 12)}`,
    builder: 'verify-until-dry-builder', reviewer: args.reviewer,
    headSha: receipt.headSha, sourceHash: receipt.sourceHash, scopeHash: receipt.scopeHash,
    reviewPacketHash: receipt.reviewPacketHash, axes: args.axes.split(',').map((axis) => axis.trim()).filter(Boolean),
    output, findings,
  });
  const existing = args.reviews ? readJson(resolve(repoRoot, args.reviews)) : {
    schema: 'verify-until-dry.review-set.v1', receiptHash: receipt.receiptHash, reviews: [],
  };
  const candidate = { ...existing, reviews: [...(existing.reviews ?? []), completed] };
  const proof = validateReviewSet(candidate, receipt);
  if (!proof.valid) throw new Error(`Recorded review set is invalid: ${proof.error}`);
  writeJson(resolve(repoRoot, args.out), candidate);
  return candidate;
}

async function main() {
  const args = parseCli(process.argv.slice(2));
  const repoRoot = process.cwd();
  const hydrated = { ...args, contract: args.contract ? readJson(resolve(repoRoot, args.contract)) : {} };
  if (args.command === 'audit') {
    const audit = auditRepository(repoRoot, hydrated, config);
    process.stdout.write(`${JSON.stringify({
      ...audit,
      packet: { hash: audit.packet.hash, evidencePaths: audit.packet.evidencePaths },
      changes: { ...audit.changes, diffText: undefined },
    }, null, 2)}\n`);
    return;
  }
  if (args.command === 'run') {
    const result = await commandRun(repoRoot, hydrated);
    process.stdout.write(`${result.receipt.verdict.verdict} receipt=${result.out}\n`);
    if (args.mode === 'enforce' && result.receipt.verdict.verdict !== 'CLEAN_IN_PROVEN_SCOPE') process.exitCode = 1;
    return;
  }
  if (args.command === 'kimi') {
    if (!args.approval) throw new Error('kimi requires --approval for the exact preflight packet');
    const audit = auditRepository(repoRoot, hydrated, config);
    const approval = readJson(resolve(repoRoot, args.approval));
    const plan = planKimiReview({ required: audit.risk.kimiRequired, packet: audit.packet, config, approval });
    if (plan.status !== 'READY') throw new Error(`Kimi review blocked: ${plan.status}`);
    const result = await executeKimiReview({
      plan,
      packet: audit.packet,
      outPath: null,
    });
    const receipt = buildKimiReceipt(result, audit.packet);
    const out = args.out ? resolve(repoRoot, args.out) : join(dirname(defaultReceiptPath(repoRoot)), 'latest-kimi-receipt.json');
    writeJson(out, receipt);
    process.stdout.write(`${JSON.stringify({ status: result.status, model: result.model,
      packetHash: result.packetHash, outputHash: result.outputHash, callCount: result.callCount, receipt: out })}\n`);
    return;
  }
  if (args.command === 'finalize') {
    const result = commandFinalize(repoRoot, args);
    process.stdout.write(`${result.receipt.verdict.verdict} receipt=${result.out}\n`);
    if (result.receipt.verdict.verdict !== 'CLEAN_IN_PROVEN_SCOPE') process.exitCode = 1;
    return;
  }
  if (args.command === 'record-review') {
    const result = commandRecordReview(repoRoot, args);
    process.stdout.write(`RECORDED reviews=${result.reviews.length} artifact=${resolve(repoRoot, args.out)}\n`);
    return;
  }
  if (!args.receipt) throw new Error('verify requires --receipt');
  const verified = verifyReceipt(readJson(resolve(repoRoot, args.receipt)));
  process.stdout.write(`${JSON.stringify(verified)}\n`);
  if (!verified.valid) process.exitCode = 1;
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main().catch((error) => { console.error(`[verify-until-dry] ${error.message}`); process.exitCode = 1; });
