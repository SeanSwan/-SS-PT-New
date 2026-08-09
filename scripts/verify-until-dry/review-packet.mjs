/**
 * @file review-packet.mjs
 * @description Builds canonical, blind, redacted hostile-review packets.
 */
import { canonicalJson, sha256 } from './ledger.mjs';
import { redactSecrets } from '../context-gateway/src/egress.mjs';

const SAFE_RELATIVE_PATH = /^(?![A-Za-z]:)(?![\\/])(?!.*(?:^|[\\/])\.\.(?:[\\/]|$)).+/;
const KEY_ASSIGNMENT = /\b(password|passwd|api[_-]?key|client[_-]?secret|access[_-]?token)\s*([=:])\s*([^\s,;]+)/gi;

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
    return { id: String(item.id), path: item.path.replaceAll('\\', '/'), content: redact(item.content) };
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
    evidencePaths: Object.freeze(evidence.map((item) => item.path)),
  });
}
