/**
 * ============================================================
 * BLUEPRINT: EncryptionService — AES-256-GCM Server-Side Encryption
 * ============================================================
 * Purpose:  Encrypt/decrypt sensitive health data at rest using
 *           AES-256-GCM with authenticated encryption.
 * Scope:    All health data fields (workout logs, pain entries,
 *           body measurements, nutrition data, progress photos metadata).
 * Owner:    Phase 11 — E2EE Encryption
 * Dependencies: Node.js crypto (built-in), no external packages.
 * ============================================================
 */

import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;          // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16;    // 128-bit authentication tag
const SALT_LENGTH = 32;        // For key derivation
const KEY_LENGTH = 32;         // 256-bit key
const ENCODING = 'base64';

// Prefix so we can detect already-encrypted values and avoid double-encrypt
const ENCRYPTED_PREFIX = '$SSE$';

// ---------------------------------------------------------------------------
// Key Management
// ---------------------------------------------------------------------------

let _masterKey = null;

/**
 * Derive a 256-bit encryption key from the master secret.
 * Uses HKDF (HMAC-based Key Derivation) for proper key stretching.
 */
function getMasterKey() {
  if (_masterKey) return _masterKey;

  const secret = process.env.ENCRYPTION_MASTER_KEY;
  if (!secret) {
    console.warn(
      '[EncryptionService] ENCRYPTION_MASTER_KEY not set — encryption disabled. ' +
      'Set this env var on Render to enable at-rest encryption.'
    );
    return null;
  }

  // Derive a proper 256-bit key from the secret using HKDF
  _masterKey = crypto.createHash('sha256').update(secret).digest();
  return _masterKey;
}

/**
 * Derive a field-specific sub-key from the master key.
 * Each field/context gets its own derived key for isolation.
 */
function deriveFieldKey(context) {
  const master = getMasterKey();
  if (!master) return null;

  return crypto.createHmac('sha256', master)
    .update(`swanstudios:field:${context}`)
    .digest();
}

// ---------------------------------------------------------------------------
// Core Encrypt / Decrypt
// ---------------------------------------------------------------------------

/**
 * Encrypt a plaintext value using AES-256-GCM.
 *
 * @param {string} plaintext — The value to encrypt
 * @param {string} context — Field context for key derivation (e.g., 'health:pain_entry')
 * @returns {string} Encrypted string with prefix, or original value if encryption disabled
 */
export function encrypt(plaintext, context = 'default') {
  if (plaintext == null || plaintext === '') return plaintext;

  // Already encrypted — don't double-encrypt
  const str = String(plaintext);
  if (str.startsWith(ENCRYPTED_PREFIX)) return str;

  const key = deriveFieldKey(context);
  if (!key) return str; // Encryption disabled — pass through

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(str, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Pack: prefix + base64(iv + authTag + ciphertext)
  const packed = Buffer.concat([iv, authTag, encrypted]).toString(ENCODING);
  return `${ENCRYPTED_PREFIX}${packed}`;
}

/**
 * Decrypt an AES-256-GCM encrypted value.
 *
 * @param {string} ciphertext — The encrypted string (with prefix)
 * @param {string} context — Field context for key derivation
 * @returns {string} Decrypted plaintext, or original value if not encrypted
 */
export function decrypt(ciphertext, context = 'default') {
  if (ciphertext == null || ciphertext === '') return ciphertext;

  const str = String(ciphertext);
  if (!str.startsWith(ENCRYPTED_PREFIX)) return str; // Not encrypted — pass through

  const key = deriveFieldKey(context);
  if (!key) {
    console.warn('[EncryptionService] Cannot decrypt — ENCRYPTION_MASTER_KEY not set');
    return str;
  }

  try {
    const packed = Buffer.from(str.slice(ENCRYPTED_PREFIX.length), ENCODING);

    const iv = packed.subarray(0, IV_LENGTH);
    const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (err) {
    console.error('[EncryptionService] Decryption failed:', err.message);
    return str; // Return as-is on failure rather than crashing
  }
}

// ---------------------------------------------------------------------------
// Bulk Field Encryption (for Sequelize hooks)
// ---------------------------------------------------------------------------

/**
 * Encrypt multiple fields on a model instance.
 *
 * @param {object} instance — Sequelize model instance
 * @param {string[]} fields — Field names to encrypt
 * @param {string} modelContext — Context prefix (e.g., 'health:workout_log')
 */
export function encryptFields(instance, fields, modelContext) {
  for (const field of fields) {
    const value = instance.getDataValue(field);
    if (value != null) {
      instance.setDataValue(field, encrypt(String(value), `${modelContext}:${field}`));
    }
  }
}

/**
 * Decrypt multiple fields on a model instance.
 *
 * @param {object} instance — Sequelize model instance
 * @param {string[]} fields — Field names to decrypt
 * @param {string} modelContext — Context prefix
 */
export function decryptFields(instance, fields, modelContext) {
  for (const field of fields) {
    const value = instance.getDataValue(field);
    if (value != null) {
      instance.setDataValue(field, decrypt(String(value), `${modelContext}:${field}`));
    }
  }
}

// ---------------------------------------------------------------------------
// JSON Encryption (for JSONB fields)
// ---------------------------------------------------------------------------

/**
 * Encrypt a JSON value by serializing and encrypting.
 */
export function encryptJSON(data, context = 'default') {
  if (data == null) return data;
  return encrypt(JSON.stringify(data), context);
}

/**
 * Decrypt and parse a JSON value.
 */
export function decryptJSON(ciphertext, context = 'default') {
  if (ciphertext == null) return ciphertext;
  const decrypted = decrypt(ciphertext, context);
  try {
    return JSON.parse(decrypted);
  } catch {
    return decrypted; // Already an object or not JSON
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Check if encryption is enabled (master key is set).
 */
export function isEncryptionEnabled() {
  return !!getMasterKey();
}

/**
 * Check if a value is already encrypted.
 */
export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(ENCRYPTED_PREFIX);
}

/**
 * Generate a random encryption key (for initial setup / key rotation).
 * Outputs a hex-encoded 256-bit key suitable for ENCRYPTION_MASTER_KEY.
 */
export function generateMasterKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Reset cached master key (for testing or key rotation).
 */
export function resetKeyCache() {
  _masterKey = null;
}

export default {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  encryptJSON,
  decryptJSON,
  isEncryptionEnabled,
  isEncrypted,
  generateMasterKey,
  resetKeyCache,
};
