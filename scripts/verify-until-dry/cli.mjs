#!/usr/bin/env node
/**
 * @file cli.mjs
 * @description Command-line adapter for audits, fenced gates, receipt finalization, and verification.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import config from '../../config/verify-until-dry.config.mjs';
import { classifyRisk } from './classifier.mjs';
import { runDeterministicPass } from './engine.mjs';
import { executeKimiReview, planKimiReview } from './kimi-escalation.mjs';
import { appendEvent } from './ledger.mjs';
import { buildReceipt, verifyReceipt } from './receipt.mjs';
import { buildReviewPacket } from './review-packet.mjs';

const COMMANDS = new Set(['audit', 'run', 'finalize', 'verify', 'kimi']);

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
  return {
    command, tier, base: option('base'), out: option('out'), receipt: option('receipt'),
    reviews: option('reviews'), approval: option('approval'),
  };
}

export function inferSurfaces(files) {
  const surfaces = new Set();
  for (const raw of files) {
    const file = String(raw).replaceAll('\\', '/');
    if (file.startsWith('frontend/')) surfaces.add('frontend');
    else if (file.startsWith('backend/')) surfaces.add('backend');
    else if (file.startsWith('docs/') || file.endsWith('.md')) surfaces.add('docs');
    else surfaces.add('tooling');
  }
  return [...surfaces].sort();
}

export function selectKimiEvidencePaths(files) {
  const production = files.filter((raw) => {
    const file = String(raw).replaceAll('\\', '/').toLowerCase();
    return !file.endsWith('.md') &&
      !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file) &&
      !file.startsWith('.agents/skills/') &&
      !file.startsWith('.claude/skills/') &&
      !file.endsWith('/openai.yaml');
  });
  return [...new Set(production)].sort();
}

export function defaultReceiptPath(repoRoot) {
  const id = createHash('sha256').update(resolve(repoRoot)).digest('hex').slice(0, 16);
  return join(tmpdir(), 'verify-until-dry', id, 'latest-receipt.json');
}

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true });
}

function lines(value) {
  return String(value).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

const MAX_UNTRACKED_BYTES = 512 * 1024;

export function appendUntrackedEvidence(repoRoot, untrackedFiles, initialDiff, initialLines) {
  let diffText = initialDiff;
  let changedLines = initialLines;
  let includedBytes = 0;
  let evidenceComplete = true;
  for (const file of untrackedFiles) {
    const absolute = resolve(repoRoot, file);
    const rel = relative(resolve(repoRoot), absolute);
    if (isAbsolute(rel) || rel.startsWith('..') || lstatSync(absolute).isSymbolicLink()) {
      diffText += `\n--- UNTRACKED ${file} ---\n[unsafe path omitted]\n`;
      evidenceComplete = false;
      continue;
    }
    const content = readFileSync(absolute);
    if (includedBytes + content.length > MAX_UNTRACKED_BYTES) {
      diffText += `\n--- UNTRACKED ${file} ---\n[content omitted: packet size ceiling]\n`;
      evidenceComplete = false;
      continue;
    }
    includedBytes += content.length;
    if (content.includes(0)) {
      diffText += `\n--- UNTRACKED ${file} ---\n[binary omitted]\n`;
      continue;
    }
    const text = content.toString('utf8');
    const countable = text.endsWith('\n') ? text.slice(0, -1) : text;
    if (countable) changedLines += countable.split(/\r?\n/).length;
    diffText += `\n--- UNTRACKED ${file} ---\n${text}\n`;
  }
  return { diffText, changedLines, evidenceComplete };
}

function inspectChanges(repoRoot, base) {
  const untrackedFiles = lines(git(repoRoot, ['ls-files', '--others', '--exclude-standard']));
  const files = new Set([
    ...lines(git(repoRoot, ['diff', '--name-only', 'HEAD'])),
    ...untrackedFiles,
  ]);
  let diffText = git(repoRoot, ['diff', '--binary', 'HEAD']);
  let numstat = git(repoRoot, ['diff', '--numstat', 'HEAD']);
  if (base) {
    for (const file of lines(git(repoRoot, ['diff', '--name-only', `${base}...HEAD`]))) files.add(file);
    diffText += git(repoRoot, ['diff', '--binary', `${base}...HEAD`]);
    numstat += git(repoRoot, ['diff', '--numstat', `${base}...HEAD`]);
  }
  let changedLines = 0;
  for (const row of lines(numstat)) {
    const [added, deleted] = row.split(/\s+/);
    changedLines += (Number(added) || 0) + (Number(deleted) || 0);
  }
  const untracked = appendUntrackedEvidence(repoRoot, untrackedFiles, diffText, changedLines);
  return {
    files: [...files].map((file) => file.replaceAll('\\', '/')).sort(),
    diffText: untracked.diffText,
    changedLines: untracked.changedLines,
    evidenceComplete: untracked.evidenceComplete,
  };
}

function kimiEvidence(repoRoot, base, allFiles) {
  const paths = selectKimiEvidencePaths(allFiles);
  if (paths.length === 0) return { paths: allFiles, diffText: '(no production logic selected)', evidenceComplete: true };
  let diffText = '';
  for (let index = 0; index < paths.length; index += 50) {
    const chunk = paths.slice(index, index + 50);
    diffText += git(repoRoot, ['diff', '--binary', 'HEAD', '--', ...chunk]);
    if (base) diffText += git(repoRoot, ['diff', '--binary', `${base}...HEAD`, '--', ...chunk]);
  }
  const untracked = new Set(lines(git(repoRoot, ['ls-files', '--others', '--exclude-standard'])));
  const withUntracked = appendUntrackedEvidence(
    repoRoot,
    paths.filter((path) => untracked.has(path)),
    diffText,
    0,
  );
  return { paths, diffText: withUntracked.diffText, evidenceComplete: withUntracked.evidenceComplete };
}

function auditRepository(repoRoot, args) {
  const changes = inspectChanges(repoRoot, args.base);
  const risk = classifyRisk({
    files: changes.files,
    diffText: changes.diffText,
    changedLines: changes.changedLines,
    agentTier: args.tier,
  });
  const surfaces = inferSurfaces(changes.files);
  const scopeContract = {
    paths: changes.files.length ? changes.files : ['.'],
    exclusions: [],
    base: args.base ?? 'working-tree',
    tier: risk.tier,
    surfaces,
  };
  const kimiEvidenceSet = kimiEvidence(repoRoot, args.base, changes.files);
  const packet = buildReviewPacket({
    runId: 'preflight',
    objective: 'Find reproducible defects in the changed source and verifier logic.',
    sourceHash: 'captured-by-run',
    scopeHash: 'captured-by-run',
    evidence: [{
      id: 'PRODUCTION_DIFF',
      path: 'kimi-production-selection.diff',
      content: kimiEvidenceSet.diffText || kimiEvidenceSet.paths.join('\n') || '(clean tree)',
    }],
  });
  const screenedPacket = { ...packet, evidencePaths: kimiEvidenceSet.paths.length ? kimiEvidenceSet.paths : packet.evidencePaths };
  const kimi = risk.kimiRequired && !kimiEvidenceSet.evidenceComplete
    ? { status: 'BLOCKED_PACKET_SIZE', callCount: 0 }
    : planKimiReview({ required: risk.kimiRequired, packet: screenedPacket, config });
  return { changes, risk, surfaces, scopeContract, kimi, packet: screenedPacket };
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

async function commandRun(repoRoot, args) {
  const audit = auditRepository(repoRoot, args);
  const blockers = [];
  if (audit.risk.kimiRequired) blockers.push(`kimi-k3:${audit.kimi.status}`);
  const receipt = await runDeterministicPass({
    repoRoot,
    tier: audit.risk.tier,
    surfaces: audit.surfaces,
    scopeContract: audit.scopeContract,
    blockers,
  });
  const out = args.out ? resolve(repoRoot, args.out) : defaultReceiptPath(repoRoot);
  writeJson(out, receipt);
  return { receipt, out, audit };
}

function commandFinalize(repoRoot, args) {
  if (!args.receipt || !args.reviews) throw new Error('finalize requires --receipt and --reviews');
  const receipt = readJson(resolve(repoRoot, args.receipt));
  const verified = verifyReceipt(receipt);
  if (!verified.valid) throw new Error(`Cannot finalize invalid receipt: ${verified.error}`);
  const review = readJson(resolve(repoRoot, args.reviews));
  if (!Array.isArray(review.vantages)) throw new Error('Review artifact must contain vantages[]');
  let ledger = receipt.ledger;
  for (const vantage of review.vantages) ledger = appendEvent(ledger, { type: 'review', ...vantage });
  const finalized = buildReceipt({
    ...receipt,
    reviewedScopeHash: receipt.scopeHash,
    vantages: review.vantages,
    findings: [...receipt.findings, ...(review.findings ?? [])],
    ledger,
  });
  const out = args.out ? resolve(repoRoot, args.out) : resolve(repoRoot, args.receipt);
  writeJson(out, finalized);
  return { receipt: finalized, out };
}

async function main() {
  const args = parseCli(process.argv.slice(2));
  const repoRoot = process.cwd();
  if (args.command === 'audit') {
    const audit = auditRepository(repoRoot, args);
    process.stdout.write(`${JSON.stringify({
      ...audit,
      packet: { hash: audit.packet.hash, evidencePaths: audit.packet.evidencePaths },
      changes: { ...audit.changes, diffText: undefined },
    }, null, 2)}\n`);
    return;
  }
  if (args.command === 'run') {
    const result = await commandRun(repoRoot, args);
    process.stdout.write(`${result.receipt.verdict.verdict} receipt=${result.out}\n`);
    if (result.receipt.verdict.verdict === 'DIRTY') process.exitCode = 1;
    return;
  }
  if (args.command === 'kimi') {
    if (!args.approval) throw new Error('kimi requires --approval for the exact preflight packet');
    const audit = auditRepository(repoRoot, args);
    const approval = readJson(resolve(repoRoot, args.approval));
    const plan = planKimiReview({ required: audit.risk.kimiRequired, packet: audit.packet, config, approval });
    if (plan.status !== 'READY') throw new Error(`Kimi review blocked: ${plan.status}`);
    const result = await executeKimiReview({
      plan,
      packet: audit.packet,
      outPath: args.out ? resolve(repoRoot, args.out) : null,
    });
    process.stdout.write(`${JSON.stringify({ ...result, text: undefined })}\n`);
    return;
  }
  if (args.command === 'finalize') {
    const result = commandFinalize(repoRoot, args);
    process.stdout.write(`${result.receipt.verdict.verdict} receipt=${result.out}\n`);
    if (result.receipt.verdict.verdict !== 'CLEAN_IN_PROVEN_SCOPE') process.exitCode = 1;
    return;
  }
  if (!args.receipt) throw new Error('verify requires --receipt');
  const verified = verifyReceipt(readJson(resolve(repoRoot, args.receipt)));
  process.stdout.write(`${JSON.stringify(verified)}\n`);
  if (!verified.valid) process.exitCode = 1;
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main().catch((error) => { console.error(`[verify-until-dry] ${error.message}`); process.exitCode = 1; });
