/**
 * plaudCipherService.mjs
 * =======================
 * AES-256-GCM authenticated encryption for the merge_request payload
 * (single combined `{ transcript, parsedWorkout }` JSON blob).
 *
 * Phase 3 Slice 3.4 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md §4.2.
 *
 * Codex Round 2 CRIT #2 fix: ONE IV+tag pair per encrypted blob. The
 * original two-cipher-one-IV design was GCM-unsafe (IV reuse across
 * different plaintexts under the same key breaks GCM authentication).
 *
 * Codex Round 4 MEDIUM #2 fix: keys are versioned via env var suffix.
 *   PLAUD_TRANSCRIPT_ENCRYPTION_KEY_ID = current key version (e.g. 'V2')
 *   PLAUD_TRANSCRIPT_ENCRYPTION_KEY_<KEYID> = base64 32-byte key
 *
 * Encrypt uses the current key. Decrypt uses the row's stored cipher_key_id
 * to look up the historical key, supporting rotation.
 *
 * Public API:
 *   encryptPayload(payload) -> { cipher: Buffer, iv: Buffer, tag: Buffer, keyId: string }
 *   decryptPayload({ cipher, iv, tag, keyId }) -> payload (any)
 *
 * Errors:
 *   CipherKeyMisconfiguredError — boot-time / runtime; key missing/malformed
 *   CipherKeyVersionUnavailableError — decrypt requested an unloaded key
 *   CipherDecryptFailedError — auth tag verification failed
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const IV_BYTES = 12;
const TAG_BYTES = 16;

export class CipherKeyMisconfiguredError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CipherKeyMisconfiguredError';
    this.code = 'CIPHER_KEY_MISCONFIGURED';
  }
}

export class CipherKeyVersionUnavailableError extends Error {
  constructor(keyId) {
    super(`Encryption key version ${keyId} is not loaded in this environment`);
    this.name = 'CipherKeyVersionUnavailableError';
    this.code = 'CIPHER_KEY_VERSION_UNAVAILABLE';
  }
}

export class CipherDecryptFailedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CipherDecryptFailedError';
    this.code = 'CIPHER_DECRYPT_FAILED';
  }
}

/**
 * Look up the current key id (e.g. 'V2'). Throws if not configured.
 */
export function getCurrentKeyId() {
  const id = process.env.PLAUD_TRANSCRIPT_ENCRYPTION_KEY_ID;
  if (!id) {
    throw new CipherKeyMisconfiguredError(
      'PLAUD_TRANSCRIPT_ENCRYPTION_KEY_ID not set',
    );
  }
  return id;
}

/**
 * Look up a key by its version id (e.g. 'V1', 'V2'). Throws if the
 * matching env var is missing or malformed.
 *
 * Key id is sanitized to alnum-only to prevent env-var injection via
 * malicious cipher_key_id values from the DB.
 */
export function loadKey(keyId) {
  if (!/^[A-Za-z0-9_]{1,32}$/.test(String(keyId || ''))) {
    throw new CipherKeyMisconfiguredError(`Invalid key id format: ${keyId}`);
  }
  const envName = `PLAUD_TRANSCRIPT_ENCRYPTION_KEY_${keyId}`;
  const b64 = process.env[envName];
  if (!b64) throw new CipherKeyVersionUnavailableError(keyId);
  let key;
  try {
    key = Buffer.from(b64, 'base64');
  } catch {
    throw new CipherKeyMisconfiguredError(`${envName} is not valid base64`);
  }
  if (key.length !== 32) {
    throw new CipherKeyMisconfiguredError(
      `${envName} must decode to 32 bytes; got ${key.length}`,
    );
  }
  return key;
}

/**
 * Encrypt the payload. Returns the ciphertext + IV + tag + the key id
 * used (for storage in cipher_key_id column).
 *
 * The payload is JSON.stringify-d before encryption. Pass any
 * serializable JS value.
 */
export function encryptPayload(payload) {
  const keyId = getCurrentKeyId();
  const key = loadKey(keyId);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { cipher: ciphertext, iv, tag, keyId };
}

/**
 * Decrypt a stored cipher blob. Throws CipherDecryptFailedError if the
 * auth tag is wrong (corrupted blob, wrong key, or tampered IV).
 */
export function decryptPayload({ cipher, iv, tag, keyId }) {
  if (!Buffer.isBuffer(cipher) || !Buffer.isBuffer(iv) || !Buffer.isBuffer(tag)) {
    throw new CipherDecryptFailedError('cipher/iv/tag must all be Buffers');
  }
  if (iv.length !== IV_BYTES) {
    throw new CipherDecryptFailedError(`iv length must be ${IV_BYTES}; got ${iv.length}`);
  }
  if (tag.length !== TAG_BYTES) {
    throw new CipherDecryptFailedError(`tag length must be ${TAG_BYTES}; got ${tag.length}`);
  }
  const key = loadKey(keyId);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  let plaintext;
  try {
    plaintext = Buffer.concat([decipher.update(cipher), decipher.final()]);
  } catch (err) {
    throw new CipherDecryptFailedError(`GCM auth failure: ${err.message}`);
  }
  try {
    return JSON.parse(plaintext.toString('utf8'));
  } catch (err) {
    throw new CipherDecryptFailedError(`Plaintext is not valid JSON: ${err.message}`);
  }
}

/**
 * Health check used by /api/health and the boot-time gate. Returns
 * true if encryption is fully configured (current key id set, key loadable
 * with correct length). Throws on misconfiguration so callers can fail
 * service startup loudly.
 */
export function assertCipherConfigured() {
  const keyId = getCurrentKeyId();
  const key = loadKey(keyId);
  return { ok: true, keyId, keyByteLength: key.length };
}

export const _internal = { IV_BYTES, TAG_BYTES };
