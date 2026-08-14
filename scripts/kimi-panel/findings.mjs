/**
 * Strict finding, adjudication, and verification schemas for the Kimi Panel.
 * =============================================================================
 * Model prose is never trusted. Every stage must return one bounded JSON object, and provenance is
 * imposed by the runtime rather than accepted from model output. Dedupe is exactly the committed
 * contract: normalized file + line range + claim, while retaining every origin model.
 *
 * @module kimi-panel/findings
 */
import { sha256 } from '../context-gateway/src/receiptV1.mjs';
import { MAX_FINDINGS_PER_REVIEW } from './config.mjs';

const SEVERITIES = new Set(['critical', 'high', 'medium', 'low', 'note']);
const RULINGS = new Set(['REAL', 'NOT_REAL', 'NEEDS_PROOF']);
const OPUS_VERDICTS = new Set(['UPHOLD_DISMISSAL', 'REOPEN', 'NEEDS_PROOF']);

function strictJson(text, label) {
  try {
    const parsed = JSON.parse(String(text).trim());
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('object required');
    return parsed;
  } catch {
    throw new Error(`${label} must be one strict JSON object with no markdown fence or prose`);
  }
}

function bounded(value, label, max) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  const clean = value.trim();
  if (Buffer.byteLength(clean, 'utf8') > max) throw new Error(`${label} exceeds ${max} bytes`);
  return clean;
}

function line(value, label) {
  if (!Number.isInteger(value) || value < 1 || value > 10_000_000) throw new Error(`${label} must be a positive integer`);
  return value;
}

function normalizeClaim(claim) {
  return claim.trim().toLowerCase().replaceAll(/\s+/g, ' ');
}

function validatePath(value) {
  const path = bounded(value, 'path', 400).replaceAll('\\', '/');
  if (/^[A-Za-z]:\//.test(path) || path.startsWith('/') || path.split('/').includes('..')) {
    throw new Error('path must be packet-relative');
  }
  return path;
}

function parseFinding(raw, originModel, selfReview) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('finding must be an object');
  const path = validatePath(raw.path);
  const startLine = line(raw.startLine, 'startLine');
  const endLine = line(raw.endLine, 'endLine');
  if (endLine < startLine) throw new Error('endLine must not precede startLine');
  const claim = bounded(raw.claim, 'claim', 600);
  const severity = String(raw.severity ?? '').toLowerCase();
  if (!SEVERITIES.has(severity)) throw new Error('severity is invalid');
  const category = bounded(raw.category, 'category', 80);
  const evidence = bounded(raw.evidence, 'evidence', 800);
  const key = `${path.toLowerCase()}:${startLine}-${endLine}:${normalizeClaim(claim)}`;
  return {
    findingId: sha256(key).slice(0, 16), path, startLine, endLine, claim,
    severity, category, evidence, originModel, selfReview: Boolean(selfReview),
  };
}

export function parseReviewerFindings(text, { originModel, selfReview = false } = {}) {
  const parsed = strictJson(text, 'reviewer output');
  if (!Array.isArray(parsed.findings)) throw new Error('reviewer output findings must be an array');
  if (parsed.findings.length > MAX_FINDINGS_PER_REVIEW) {
    throw new Error(`reviewer output exceeds ${MAX_FINDINGS_PER_REVIEW} findings`);
  }
  const model = bounded(originModel, 'originModel', 200);
  return parsed.findings.map((finding) => parseFinding(finding, model, selfReview));
}

export function dedupeFindings(findings) {
  const merged = new Map();
  for (const finding of findings) {
    const current = merged.get(finding.findingId);
    const origin = { model: finding.originModel, selfReview: finding.selfReview };
    if (!current) {
      const { originModel, selfReview, ...rest } = finding;
      merged.set(finding.findingId, { ...rest, origins: [origin] });
    } else if (!current.origins.some((item) => item.model === origin.model)) {
      current.origins.push(origin);
    }
  }
  return [...merged.values()];
}

export function parseAdjudication(text, findings) {
  const parsed = strictJson(text, 'Kimi adjudication');
  if (!['CLEAN', 'REVISE', 'NEEDS_PROOF'].includes(parsed.overall)) throw new Error('Kimi overall verdict is invalid');
  if (!Array.isArray(parsed.verdicts)) throw new Error('Kimi verdicts must be an array');
  const expected = new Set(findings.map((finding) => finding.findingId));
  const seen = new Set();
  const verdicts = parsed.verdicts.map((raw) => {
    if (!expected.has(raw.findingId) || seen.has(raw.findingId)) throw new Error('Kimi must adjudicate every finding exactly once');
    seen.add(raw.findingId);
    if (!RULINGS.has(raw.ruling)) throw new Error('Kimi ruling must be REAL, NOT_REAL, or NEEDS_PROOF');
    return { findingId: raw.findingId, ruling: raw.ruling, rationale: bounded(raw.rationale, 'rationale', 1_200) };
  });
  if (seen.size !== expected.size) throw new Error('Kimi must adjudicate every finding exactly once');
  return { overall: parsed.overall, verdicts };
}

export function parseOpusVerification(text, adjudication) {
  const parsed = strictJson(text, 'Opus verification');
  return validateOpusVerification(parsed, adjudication);
}

function validateOpusVerification(verification, adjudication) {
  if (!verification || !Array.isArray(verification.dismissals)) throw new Error('Opus dismissals must be an array');
  const expected = new Set(adjudication.verdicts.filter((item) => item.ruling === 'NOT_REAL').map((item) => item.findingId));
  const seen = new Set();
  const dismissals = verification.dismissals.map((raw) => {
    if (!expected.has(raw.findingId) || seen.has(raw.findingId)) throw new Error('Opus must re-check every dismissal exactly once');
    seen.add(raw.findingId);
    if (!OPUS_VERDICTS.has(raw.verdict)) throw new Error('Opus dismissal verdict is invalid');
    return { findingId: raw.findingId, verdict: raw.verdict, rationale: bounded(raw.rationale, 'rationale', 1_200) };
  });
  if (seen.size !== expected.size) throw new Error('Opus must re-check every dismissal exactly once');
  return { dismissals };
}

export function finalizeWithOpus(run, verification) {
  const checked = validateOpusVerification(verification, run.adjudication);
  const rulings = run.adjudication.verdicts.map((item) => item.ruling);
  const reopened = checked.dismissals.some((item) => item.verdict === 'REOPEN');
  const uncertain = rulings.includes('NEEDS_PROOF') || checked.dismissals.some((item) => item.verdict === 'NEEDS_PROOF');
  const verdict = rulings.includes('REAL') || reopened ? 'REVISE' : uncertain ? 'NEEDS_PROOF' : 'CLEAN';
  return { verdict, dismissals: checked.dismissals };
}
