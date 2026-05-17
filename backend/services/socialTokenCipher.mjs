/**
 * SERVICE: Social Token Cipher
 * ============================
 * AES-256-GCM encryption for native social provider credentials.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

export class SocialTokenKeyMisconfiguredError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SocialTokenKeyMisconfiguredError';
    this.code = 'SOCIAL_TOKEN_KEY_MISCONFIGURED';
  }
}

export class SocialTokenKeyUnavailableError extends Error {
  constructor(keyId) {
    super(`Social token encryption key version ${keyId} is not loaded`);
    this.name = 'SocialTokenKeyUnavailableError';
    this.code = 'SOCIAL_TOKEN_KEY_UNAVAILABLE';
  }
}

export class SocialTokenDecryptFailedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SocialTokenDecryptFailedError';
    this.code = 'SOCIAL_TOKEN_DECRYPT_FAILED';
  }
}

export function getCurrentSocialTokenKeyId() {
  const keyId = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY_ID;
  if (!keyId) throw new SocialTokenKeyMisconfiguredError('SOCIAL_TOKEN_ENCRYPTION_KEY_ID not set');
  if (!/^[A-Za-z0-9_]{1,32}$/.test(keyId)) {
    throw new SocialTokenKeyMisconfiguredError(`Invalid social token key id: ${keyId}`);
  }
  return keyId;
}

export function loadSocialTokenKey(keyId) {
  if (!/^[A-Za-z0-9_]{1,32}$/.test(String(keyId || ''))) {
    throw new SocialTokenKeyMisconfiguredError(`Invalid social token key id: ${keyId}`);
  }

  const envName = `SOCIAL_TOKEN_ENCRYPTION_KEY_${keyId}`;
  const encoded = process.env[envName];
  if (!encoded) throw new SocialTokenKeyUnavailableError(keyId);

  const key = Buffer.from(encoded, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new SocialTokenKeyMisconfiguredError(`${envName} must decode to ${KEY_BYTES} bytes; got ${key.length}`);
  }
  return key;
}

export function isSocialTokenCipherConfigured() {
  try {
    const keyId = getCurrentSocialTokenKeyId();
    loadSocialTokenKey(keyId);
    return { configured: true, keyId };
  } catch (err) {
    return { configured: false, message: err.message };
  }
}

export function encryptSocialCredentials(credentials) {
  const keyId = getCurrentSocialTokenKeyId();
  const key = loadSocialTokenKey(keyId);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(credentials), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { cipher: encrypted, iv, tag, keyId };
}

export function decryptSocialCredentials({ cipher, iv, tag, keyId }) {
  if (!Buffer.isBuffer(cipher) || !Buffer.isBuffer(iv) || !Buffer.isBuffer(tag)) {
    throw new SocialTokenDecryptFailedError('cipher, iv, and tag must be Buffers');
  }
  if (iv.length !== IV_BYTES) throw new SocialTokenDecryptFailedError(`iv length must be ${IV_BYTES}`);
  if (tag.length !== TAG_BYTES) throw new SocialTokenDecryptFailedError(`tag length must be ${TAG_BYTES}`);

  const key = loadSocialTokenKey(keyId);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  let plaintext;
  try {
    plaintext = Buffer.concat([decipher.update(cipher), decipher.final()]);
  } catch (err) {
    throw new SocialTokenDecryptFailedError(`GCM auth failure: ${err.message}`);
  }

  try {
    return JSON.parse(plaintext.toString('utf8'));
  } catch (err) {
    throw new SocialTokenDecryptFailedError(`Plaintext is not valid JSON: ${err.message}`);
  }
}

export const _internal = { IV_BYTES, TAG_BYTES, KEY_BYTES };
