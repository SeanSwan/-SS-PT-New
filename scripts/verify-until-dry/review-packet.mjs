/**
 * @file review-packet.mjs
 * @description Builds canonical, blind, redacted hostile-review packets.
 */
import { canonicalJson, sha256 } from './ledger.mjs';
import { redactSecrets } from '../context-gateway/src/egress.mjs';

const SAFE_RELATIVE_PATH = /^(?![A-Za-z]:)(?![\\/])(?!.*(?:^|[\\/])\.\.(?:[\\/]|$)).+/;
const KEY_ASSIGNMENT = /\b(password|passwd|api[_-]?key|client[_-]?secret|access[_-]?token)\s*([=:])\s*([^\s,;]+)/gi;
const PII_PATTERNS = Object.freeze([
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/,
  /\b\d{3}-\d{2}-\d{4}\b/,
  /\b\d{1,5}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,4}\s+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd)\b/i,
  /\b(?:client|user|full)?name\s*[=:]\s*["'`][A-Z][a-z]+\s+[A-Z][a-z]+["'`]/i,
  /\b(?:dob|birth(?:day|date)?)\s*[=:]\s*["'`]\d{4}-\d{2}-\d{2}["'`]/i,
]);

export function detectSensitiveEvidence(value) {
  return PII_PATTERNS.flatMap((pattern, index) => pattern.test(String(value)) ? [`pii-pattern-${index + 1}`] : []);
}

function redactPii(value) {
  return PII_PATTERNS.reduce((text, pattern) => {
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
    return text.replace(new RegExp(pattern.source, flags), '<REDACTED-PII>');
  }, String(value));
}

function redact(value) {
  const keyed = String(value).replace(KEY_ASSIGNMENT, (_match, key, separator) =>
    `${key}${separator}<REDACTED-CREDENTIAL>`);
  return redactSecrets(keyed).text;
}

function normalizeEvidence(evidence) {
  if (!Array.isArray(evidence) || evidence.length === 0) throw new Error('Review evidence is required');
  return evidence.map((item) => {
    if (!item?.id || !item?.path || typeof item.content !== 'string' || !SAFE_RELATIVE_PATH.test(item.path)) {
      throw new Error('Every evidence item needs an id, safe relative path, and text content');
    }
    const content = redactPii(redact(item.content));
    if (detectSensitiveEvidence(content).length) {
      const error = new Error('Sensitive evidence could not be safely redacted');
      error.code = 'SENSITIVE_EVIDENCE';
      throw error;
    }
    return { id: String(item.id), path: item.path.replaceAll('\\', '/'), content };
  }).sort((a, b) => a.id.localeCompare(b.id) || a.path.localeCompare(b.path));
}

/** Builder narratives and proposed fixes are deliberately not accepted into the packet body. */
export function buildReviewPacket(input = {}) {
  const evidence = normalizeEvidence(input.evidence);
  const packet = {
    schema: 'verify-until-dry.review-packet.v1',
    runId: String(input.runId ?? 'unassigned'),
    sourceHash: String(input.sourceHash ?? 'unproven'),
    scopeHash: String(input.scopeHash ?? 'unproven'),
    objective: redact(input.objective ?? 'Find reproducible correctness defects in the supplied evidence.'),
    reviewerRules: [
      'Assume the implementation is wrong until evidence disproves each attack.',
      'Report only reproducible findings with severity, evidence id, and a failing scenario.',
      'Do not trust builder conclusions and do not declare global perfection.',
    ],
    evidence,
  };
  const canonical = canonicalJson(packet);
  const sections = evidence.map((item) =>
    `## ${item.id} — ${item.path}\n\n\`\`\`text\n${item.content}\n\`\`\``).join('\n\n');
  const text = `# Blind Hostile Review Packet\n\n` +
    `Run: ${packet.runId}\nSource: ${packet.sourceHash}\nScope: ${packet.scopeHash}\n\n` +
    `Objective: ${packet.objective}\n\n${packet.reviewerRules.map((rule) => `- ${rule}`).join('\n')}\n\n${sections}\n`;
  return Object.freeze({
    text,
    hash: sha256(canonical),
    canonical,
    sourceHash: packet.sourceHash,
    scopeHash: packet.scopeHash,
    evidencePaths: Object.freeze(evidence.map((item) => item.path)),
  });
}
