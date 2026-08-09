/**
 * @file repository-audit.mjs
 * @description Captures one stable base-to-working-tree risk and review scope.
 */
import { execFileSync } from 'node:child_process';
import { closeSync, constants as fsConstants, fstatSync, lstatSync, openSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

import { classifyRisk } from './classifier.mjs';
import { canonicalJson, sha256 } from './ledger.mjs';
import { planKimiReview } from './kimi-escalation.mjs';
import { buildReviewPacket } from './review-packet.mjs';
import { captureSnapshot } from './snapshot.mjs';

const MAX_UNTRACKED_BYTES = 512 * 1024;

function git(cwd, args) {
  return execFileSync('git', args, {
    cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true,
  });
}

function tryGit(cwd, args) {
  try { return git(cwd, args).trim(); } catch { return null; }
}

function lines(value) {
  return String(value).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
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
  return [...new Set(files.filter((raw) => {
    const file = String(raw).replaceAll('\\', '/').toLowerCase();
    return !file.endsWith('.md') && !file.startsWith('.agents/skills/') &&
      !file.startsWith('.claude/skills/') && !file.endsWith('/openai.yaml');
  }))].sort();
}

export function appendUntrackedEvidence(repoRoot, untrackedFiles, initialDiff, initialLines) {
  let diffText = initialDiff;
  let changedLines = initialLines;
  let includedBytes = 0;
  let evidenceComplete = true;
  for (const file of untrackedFiles) {
    const absolute = resolve(repoRoot, file);
    const rel = relative(resolve(repoRoot), absolute);
    if (isAbsolute(rel) || rel.startsWith('..')) {
      diffText += `\n--- UNTRACKED ${file} ---\n[unsafe path omitted]\n`;
      evidenceComplete = false;
      continue;
    }
    const before = lstatSync(absolute);
    if (before.isSymbolicLink() || !before.isFile()) {
      diffText += `\n--- UNTRACKED ${file} ---\n[unsafe file type omitted]\n`;
      evidenceComplete = false;
      continue;
    }
    const fd = openSync(absolute, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
    let content;
    try {
      const opened = fstatSync(fd);
      const after = lstatSync(absolute);
      if (!after.isFile() || opened.ino !== after.ino || opened.size !== after.size ||
          (process.platform !== 'win32' && opened.dev !== after.dev)) {
        throw new Error(`Untracked file changed during evidence capture: ${file}`);
      }
      content = readFileSync(fd);
    } finally { closeSync(fd); }
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

export function resolveComparisonBase(repoRoot, requested = null) {
  if (requested) {
    let tipSha;
    let mergeBaseSha;
    try {
      tipSha = git(repoRoot, ['rev-parse', '--verify', `${requested}^{commit}`]).trim();
      mergeBaseSha = git(repoRoot, ['merge-base', 'HEAD', tipSha]).trim();
    } catch (error) {
      throw new Error(`Comparison base cannot be inspected: ${requested}: ${error.message}`);
    }
    if (!tipSha || !mergeBaseSha) throw new Error(`Comparison base cannot be resolved: ${requested}`);
    return Object.freeze({ ref: requested, tipSha, mergeBaseSha });
  }
  const candidates = [
    tryGit(repoRoot, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']),
    tryGit(repoRoot, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']),
    'origin/main', 'origin/master',
  ];
  for (const ref of candidates.filter(Boolean)) {
    const tipSha = tryGit(repoRoot, ['rev-parse', '--verify', `${ref}^{commit}`]);
    if (!tipSha) continue;
    const mergeBaseSha = tryGit(repoRoot, ['merge-base', 'HEAD', tipSha]);
    if (!mergeBaseSha) continue;
    return Object.freeze({ ref, tipSha, mergeBaseSha });
  }
  return null;
}

function inspectChanges(repoRoot, comparisonBase) {
  const compare = comparisonBase?.mergeBaseSha ?? 'HEAD';
  const untrackedFiles = lines(git(repoRoot, ['ls-files', '--others', '--exclude-standard']));
  const files = new Set([...lines(git(repoRoot, ['diff', '--name-only', compare])), ...untrackedFiles]);
  const diffText = git(repoRoot, ['diff', '--binary', compare]);
  let changedLines = 0;
  for (const row of lines(git(repoRoot, ['diff', '--numstat', compare]))) {
    const [added, deleted] = row.split(/\s+/);
    changedLines += (Number(added) || 0) + (Number(deleted) || 0);
  }
  const untracked = appendUntrackedEvidence(repoRoot, untrackedFiles, diffText, changedLines);
  return { files: [...files].map((file) => file.replaceAll('\\', '/')).sort(), ...untracked };
}

export function validateDeclaredContract(declared) {
  if (!declared || typeof declared !== 'object' || Array.isArray(declared)) {
    throw new Error('Scope contract must be a JSON object');
  }
  for (const key of ['requirements', 'acceptanceIds', 'exclusions']) {
    if (declared[key] !== undefined && (!Array.isArray(declared[key]) ||
        declared[key].some((value) => typeof value !== 'string' || !value.trim()))) {
      throw new Error(`Scope contract ${key} must be an array of non-empty strings`);
    }
  }
  if (typeof declared.objective !== 'string' || !declared.objective.trim()) {
    throw new Error('Scope contract objective must be non-empty text');
  }
  if (!declared.requirements?.length) throw new Error('Scope contract requirements cannot be empty');
  if (!declared.acceptanceIds?.length) throw new Error('Scope contract acceptanceIds cannot be empty');
  return Object.freeze({
    objective: declared.objective.trim(),
    requirements: Object.freeze(declared.requirements.map((value) => value.trim())),
    acceptanceIds: Object.freeze(declared.acceptanceIds.map((value) => value.trim())),
    exclusions: Object.freeze((declared.exclusions ?? []).map((value) => value.trim())),
  });
}

function buildScope(changes, comparisonBase, risk, declared = {}) {
  const contract = validateDeclaredContract(declared);
  const surfaces = inferSurfaces(changes.files);
  return {
    surfaces,
    contract: {
      objective: contract.objective,
      requirements: [...contract.requirements],
      acceptanceIds: [...contract.acceptanceIds],
      paths: changes.files.length ? changes.files : ['.'],
      exclusions: [...contract.exclusions],
      base: comparisonBase ?? { ref: 'working-tree', tipSha: null, mergeBaseSha: null },
      tier: risk.tier,
      surfaces,
    },
  };
}

function stableAudit(repoRoot, comparisonBase, tier, declared) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const first = inspectChanges(repoRoot, comparisonBase);
    const risk = classifyRisk({ files: first.files, diffText: first.diffText, changedLines: first.changedLines, agentTier: tier });
    const scope = buildScope(first, comparisonBase, risk, declared);
    const before = captureSnapshot({ cwd: repoRoot, scopeContract: scope.contract });
    const second = inspectChanges(repoRoot, comparisonBase);
    const after = captureSnapshot({ cwd: repoRoot, scopeContract: scope.contract });
    const sameEvidence = sha256(canonicalJson(first)) === sha256(canonicalJson(second));
    if (sameEvidence && before.sourceHash === after.sourceHash) {
      return { changes: second, risk, surfaces: scope.surfaces, scopeContract: scope.contract, snapshot: after };
    }
  }
  throw new Error('Concurrent source drift prevented a stable audit');
}

function evidenceDiff(repoRoot, comparisonBase, paths, untrackedFiles) {
  const compare = comparisonBase?.mergeBaseSha ?? 'HEAD';
  let diffText = paths.length ? git(repoRoot, ['diff', '--binary', compare, '--', ...paths]) : '';
  const untracked = new Set(untrackedFiles);
  return appendUntrackedEvidence(repoRoot, paths.filter((path) => untracked.has(path)), diffText, 0);
}

export function auditRepository(repoRoot, args, config) {
  const comparisonBase = resolveComparisonBase(repoRoot, args.base);
  const audit = stableAudit(repoRoot, comparisonBase, args.tier, args.contract ?? {});
  const paths = selectKimiEvidencePaths(audit.changes.files);
  const evidence = evidenceDiff(repoRoot, comparisonBase, paths, lines(git(repoRoot, ['ls-files', '--others', '--exclude-standard'])));
  let packet;
  let kimi;
  try {
    packet = buildReviewPacket({
      runId: 'preflight', objective: audit.scopeContract.objective ?? 'Find reproducible defects in the changed source.',
      sourceHash: audit.snapshot.sourceHash, scopeHash: audit.snapshot.scopeHash,
      evidence: [{ id: 'CHANGED_EVIDENCE', path: 'reviewed-change-set.diff',
        content: evidence.diffText || paths.join('\n') || '(clean tree)' }],
    });
    const screened = { ...packet, headSha: audit.snapshot.headSha,
      evidencePaths: paths.length ? paths : packet.evidencePaths };
    packet = screened;
    kimi = audit.risk.kimiRequired && !evidence.evidenceComplete
      ? { status: 'BLOCKED_PACKET_SIZE', callCount: 0 }
      : planKimiReview({ required: audit.risk.kimiRequired, packet, config });
  } catch (error) {
    if (error?.code !== 'SENSITIVE_EVIDENCE') throw error;
    const blocked = { headSha: audit.snapshot.headSha, sourceHash: audit.snapshot.sourceHash, scopeHash: audit.snapshot.scopeHash,
      evidencePaths: paths, blockedReasons: error.detail };
    packet = { ...blocked, hash: sha256(canonicalJson(blocked)), text: '' };
    kimi = { status: 'BLOCKED_CEILING', callCount: 0, reasons: error.detail };
  }
  return { ...audit, comparisonBase, kimi, packet };
}
