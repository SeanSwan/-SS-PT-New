/**
 * Immutable local review-packet contract.
 *
 * A packet records the exact review scope and policy before a provider runs.
 * Provider reports are separate artifacts and refer back to packetId; the
 * packet itself is never overwritten.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const PACKET_SCHEMA = 'swan.review.packet/v1';

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

export function canonicalJson(value) {
  return JSON.stringify(sortValue(value), null, 2) + '\n';
}

export function sha256(value) {
  return createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function compactTimestamp(iso) {
  return iso.replace(/[^0-9]/g, '').slice(0, 17);
}

export function createReviewPacket({
  root,
  scope = {},
  prompt = '',
  createdAt = new Date().toISOString(),
  policy = {},
} = {}) {
  const promptHash = sha256(prompt);
  const normalizedScope = sortValue(scope);
  const packetHash = sha256(canonicalJson({ prompt: String(prompt), scope: normalizedScope }));
  return {
    schema: PACKET_SCHEMA,
    packetId: `swan-review-${compactTimestamp(createdAt)}-${packetHash.slice(0, 12)}`,
    createdAt,
    status: 'pending',
    repository: { root: root || null },
    scope: normalizedScope,
    input: { promptSha256: promptHash, scopeSha256: sha256(canonicalJson(normalizedScope)), promptChars: String(prompt).length },
    policy: {
      provider: 'openai-codex',
      billing: 'chatgpt-subscription',
      transport: 'codex-cli',
      meteredFallback: false,
      childSandbox: 'read-only',
      approvalMode: 'never',
      ...sortValue(policy),
    },
  };
}

export function validateReviewPacket(packet) {
  const errors = [];
  if (!packet || packet.schema !== PACKET_SCHEMA) errors.push('schema');
  if (!packet?.packetId || !/^swan-review-[0-9]+-[a-f0-9]{12}$/.test(packet.packetId)) errors.push('packetId');
  if (!packet?.createdAt) errors.push('createdAt');
  if (!packet?.input || !/^[a-f0-9]{64}$/.test(packet.input.promptSha256 || '')) errors.push('input.promptSha256');
  if (!/^[a-f0-9]{64}$/.test(packet?.input?.scopeSha256 || '')) errors.push('input.scopeSha256');
  if (!Number.isInteger(packet?.input?.promptChars) || packet.input.promptChars < 0) errors.push('input.promptChars');
  if (packet?.policy?.meteredFallback !== false) errors.push('policy.meteredFallback');
  if (packet?.policy?.childSandbox !== 'read-only') errors.push('policy.childSandbox');
  return { valid: errors.length === 0, errors };
}

/** Write once. A same-content retry is idempotent; a different packet is refused. */
export function writeImmutablePacket(outputDir, packet) {
  const check = validateReviewPacket(packet);
  if (!check.valid) throw new Error(`invalid review packet: ${check.errors.join(', ')}`);
  mkdirSync(outputDir, { recursive: true });
  const path = join(outputDir, `${packet.packetId}.json`);
  const content = canonicalJson(packet);
  try {
    writeFileSync(path, content, { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const existing = readFileSync(path, 'utf8');
    if (existing !== content) throw new Error(`immutable review packet collision: ${packet.packetId}`);
  }
  return { path, sha256: sha256(content), packetId: packet.packetId };
}

export function createReportEnvelope({ packetId, provider, billing, authMode, text, status = 'complete', usage = {} } = {}) {
  const reportText = String(text || '');
  return {
    schema: 'swan.review.report/v1',
    packetId,
    status,
    provider: provider || null,
    billing: billing || null,
    authMode: authMode || null,
    contentSha256: sha256(reportText),
    textChars: reportText.length,
    usage: {
      inputTokens: Number.isFinite(usage.inputTokens) ? usage.inputTokens : null,
      outputTokens: Number.isFinite(usage.outputTokens) ? usage.outputTokens : null,
    },
  };
}
