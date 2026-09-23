/** Whole-package deterministic acceptance gate; performs no network calls. */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

import { buildHostileCorpus } from './attack-corpus.mjs';
import { validateExternalEnvelope } from './contracts.mjs';
import { verifyReviewEvidence } from './review-evidence.mjs';

const SCRIPT_DIR = join('scripts', 'classroom-hermes');
const PREP_DIR = join('docs', 'ai-workflow', 'brainstorms', 'classroom-copilot-2026-08-15', 'mac-prep');

const REQUIRED = [
  'README.md',
  'REVIEW-EVIDENCE-LOCK.md',
  'H0-WRAP-DECISION.md',
  'FACT-GATES-AND-POLICY.md',
  'SUPERVISED-MAC-SETUP-RUNBOOK.md',
  'OPERATIONS-ROLLBACK-AND-RETENTION.md',
  'SCOPED-HYGIENE-INVENTORY.md',
  'BROKER-ATTACK-TABLE.md',
  'HOSTILE-REVIEW-PACKET.md',
  'CLAUDE-HOSTILE-REVIEW-HANDOFF-PROMPT.md',
  join('profile', 'distribution.yaml'),
  join('profile', 'SOUL.md'),
  join('profile', 'config.template.yaml'),
  join('profile', 'skills', 'classroom-planning', 'SKILL.md'),
  join('profile', 'skills', 'classroom-planning', 'agents', 'openai.yaml'),
  join('profile', 'skills', 'classroom-planning', 'references', 'contracts.md'),
  join('mac', 'classroom-hermes.command'),
];

function walk(root) {
  if (!existsSync(root)) return [];
  const output = [];
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    if (statSync(path).isDirectory()) output.push(...walk(path));
    else output.push(path);
  }
  return output;
}

function lines(text) {
  return text.length === 0 ? 0 : text.split(/\r?\n/u).length - (text.endsWith('\n') ? 1 : 0);
}

function requireText(text, marker, label, failures) {
  if (!text.includes(marker)) failures.push(`${label}:missing:${marker}`);
}

export function runPackageGate(repoRoot) {
  const failures = [];
  for (const required of REQUIRED) {
    if (!existsSync(join(repoRoot, PREP_DIR, required))) failures.push(`missing:${required}`);
  }

  const ownedFiles = [
    ...walk(join(repoRoot, SCRIPT_DIR)),
    ...walk(join(repoRoot, PREP_DIR)),
  ];
  let maxOwnedFileLines = 0;
  const lineReceipts = [];
  for (const file of ownedFiles) {
    const count = lines(readFileSync(file, 'utf8'));
    maxOwnedFileLines = Math.max(maxOwnedFileLines, count);
    lineReceipts.push({ file: relative(repoRoot, file), lines: count });
    if (count > 300) failures.push(`line-cap:${relative(repoRoot, file)}:${count}`);
  }

  const executableFiles = walk(join(repoRoot, SCRIPT_DIR))
    .filter((file) => /\.(?:mjs|js)$/iu.test(file))
    .filter((file) => !file.endsWith('package-gate.mjs'))
    .concat(join(repoRoot, PREP_DIR, 'mac', 'classroom-hermes.command'));
  const networkPrimitive = /\bfetch\s*\(|https?\.request\s*\(|\baxios\b|\bcurl\b|Invoke-WebRequest/iu;
  const externalCallFiles = executableFiles.filter((file) => networkPrimitive.test(readFileSync(file, 'utf8')));
  if (externalCallFiles.length) failures.push(`network-primitives:${externalCallFiles.map((file) => relative(repoRoot, file)).join(',')}`);

  const corpus = buildHostileCorpus();
  const escaped = corpus.filter(({ payload }) => validateExternalEnvelope(payload).ok);
  if (corpus.length !== 50) failures.push(`hostile-count:${corpus.length}`);
  if (escaped.length) failures.push(`hostile-escaped:${escaped.map(({ id }) => id).join(',')}`);

  const review = verifyReviewEvidence(repoRoot);
  if (!review.ok) failures.push(...review.failures.map((failure) => `review:${failure}`));

  const soulPath = join(repoRoot, PREP_DIR, 'profile', 'SOUL.md');
  if (existsSync(soulPath)) {
    const soul = readFileSync(soulPath, 'utf8');
    requireText(soul, 'Pseudonyms and “child A” remain child records.', 'soul', failures);
    requireText(soul, 'Never silently switch providers', 'soul', failures);
    requireText(soul, 'Never copy, infer, or import Sean\'s memories', 'soul', failures);
  }

  const distributionPath = join(repoRoot, PREP_DIR, 'profile', 'distribution.yaml');
  if (existsSync(distributionPath)) {
    const distribution = readFileSync(distributionPath, 'utf8');
    if (/\.env|config\.yaml|mcp\.json|cron\//iu.test(distribution)) failures.push('profile-distributes-sensitive-state');
  }

  const launcherPath = join(repoRoot, PREP_DIR, 'mac', 'classroom-hermes.command');
  if (existsSync(launcherPath)) {
    const launcher = readFileSync(launcherPath, 'utf8');
    requireText(launcher, 'Type PUBLIC to continue', 'launcher', failures);
    requireText(launcher, 'exec ollama run classroom', 'launcher', failures);
    requireText(launcher, 'exec hermes -p classroom-teacher chat', 'launcher', failures);
    if (/&\s*$/mu.test(launcher)) failures.push('launcher-background-process');
  }

  const brokerTable = join(repoRoot, PREP_DIR, 'BROKER-ATTACK-TABLE.md');
  if (existsSync(brokerTable)) {
    const rowCount = (readFileSync(brokerTable, 'utf8').match(/^\|\s*\d+\s*\|/gmu) || []).length;
    if (rowCount !== 24) failures.push(`broker-attack-rows:${rowCount}`);
  }

  const realFixtureFiles = ownedFiles.filter((file) => /fixtures?/iu.test(file)
    && !/synthetic|test/iu.test(file));
  if (realFixtureFiles.length) failures.push('non-synthetic-fixture-file');

  return {
    ok: failures.length === 0,
    failures,
    hostilePayloadsRejected: corpus.length - escaped.length,
    externalCallsMade: externalCallFiles.length,
    realChildFixtures: realFixtureFiles.length,
    maxOwnedFileLines,
    reviewReceipt: review,
    lineReceipts: lineReceipts.sort((a, b) => b.lines - a.lines),
  };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const receipt = runPackageGate(process.cwd());
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
  if (!receipt.ok) process.exitCode = 1;
}
