/**
 * Kimi Panel outbound packet preparation.
 * =======================================
 * Secret-bearing paths and design-ceiling-sensitive paths fail closed before file content is read.
 * Benign files are bounded to 512 KiB, then run through the committed Context Gateway redactor.
 * The returned hash identifies exactly the sanitized bytes every reviewer receives.
 *
 * @module kimi-panel/packet
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { redactSecrets } from '../context-gateway/src/egress.mjs';
import { SENSITIVE_PATH_RE } from '../context-gateway/src/providers.mjs';
import { DENY_PATTERNS } from '../context-gateway/src/safeRead.mjs';
import { sha256 } from '../context-gateway/src/receiptV1.mjs';

export const MAX_PACKET_BYTES = 512 * 1024;

export function assertDesignDocumentPath(documentPath) {
  const normalized = String(documentPath ?? '').replaceAll('\\', '/');
  if (!normalized || DENY_PATTERNS.some((pattern) => pattern.test(normalized))) {
    throw new Error('panel refused a secret-bearing document path');
  }
  if (SENSITIVE_PATH_RE.test(normalized)) {
    throw new Error('panel refused a path above the Kimi/HY3 design ceiling');
  }
}

export function preparePacket({ root = process.cwd(), documentPath }) {
  assertDesignDocumentPath(documentPath);
  const absolute = resolve(root, documentPath);
  if (!existsSync(absolute)) throw new Error('review document not found');
  const size = statSync(absolute).size;
  if (size > MAX_PACKET_BYTES) throw new Error(`review document exceeds ${MAX_PACKET_BYTES} bytes`);
  const redacted = redactSecrets(readFileSync(absolute, 'utf8'));
  if (!redacted.text.trim()) throw new Error('review document is empty after sanitization');
  return {
    text: redacted.text, sha256: sha256(redacted.text),
    bytes: Buffer.byteLength(redacted.text, 'utf8'),
    redactions: redacted.redactions, redactionKinds: redacted.kinds,
    documentPath: absolute,
  };
}
