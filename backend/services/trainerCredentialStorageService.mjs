/**
 * ============================================================================
 * BLUEPRINT: Trainer Credential Storage Service
 * ============================================================================
 * PURPOSE: Store trainer certification and insurance evidence without routing
 *          sensitive documents through the public photo-storage surface.
 * INVARIANTS:
 *   - Trust magic bytes, never the browser MIME or original filename alone.
 *   - Encrypt every object with authenticated encryption before persistence.
 *   - Bind every opaque key to the authenticated user who uploaded it.
 *   - Never fall back to a public directory; production fails closed without R2.
 *   - Verify key ownership and object existence before application attachment.
 * STORAGE: Encrypted R2 objects in production; private local files in test/dev.
 * DEPENDENCIES: Existing R2 client and AES-256-GCM encryption service.
 * ============================================================================
 */
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { encrypt, isEncrypted, isEncryptionEnabled } from './encryption/encryptionService.mjs';
import { getR2Client, headObject, r2Configured } from './r2StorageService.mjs';
import logger from '../utils/logger.mjs';

const KEY_ROOT = 'private/trainer-credentials';
const CREDENTIAL_KINDS = new Set(['insurance', 'certification']);
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

export class CredentialStorageError extends Error {
  constructor(message, { code = 'CREDENTIAL_STORAGE_ERROR', statusCode = 500 } = {}) {
    super(message);
    this.name = 'CredentialStorageError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const startsWith = (buffer, bytes) => bytes.every((byte, index) => buffer[index] === byte);
const textAt = (buffer, start, length) => buffer.subarray(start, start + length).toString('ascii');

/** Identify an allowlisted credential format from its file signature. */
export function detectCredentialFile(buffer, declaredMime) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) {
    throw new CredentialStorageError('The credential file is empty or invalid.', {
      code: 'INVALID_FILE_CONTENT', statusCode: 400,
    });
  }

  let detected = null;
  if (textAt(buffer, 0, 5) === '%PDF-') {
    detected = { mime: 'application/pdf', extension: 'pdf' };
  } else if (startsWith(buffer, [0xff, 0xd8, 0xff])) {
    detected = { mime: 'image/jpeg', extension: 'jpg' };
  } else if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    detected = { mime: 'image/png', extension: 'png' };
  } else if (textAt(buffer, 0, 4) === 'RIFF' && textAt(buffer, 8, 4) === 'WEBP') {
    detected = { mime: 'image/webp', extension: 'webp' };
  } else if (textAt(buffer, 4, 4) === 'ftyp') {
    const brand = textAt(buffer, 8, 4);
    if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) {
      detected = { mime: 'image/heic', extension: 'heic' };
    }
  }

  if (!detected) {
    throw new CredentialStorageError('File contents are not an allowed PDF or image.', {
      code: 'INVALID_FILE_CONTENT', statusCode: 400,
    });
  }
  if (declaredMime !== detected.mime) {
    throw new CredentialStorageError('Declared file type does not match the file contents.', {
      code: 'MIME_MISMATCH', statusCode: 400,
    });
  }
  return detected;
}

function ownerPrefix(userId) {
  return `${KEY_ROOT}/${String(userId)}/`;
}

function kindPrefix(userId, kind) {
  if (!CREDENTIAL_KINDS.has(kind)) {
    throw new CredentialStorageError('Credential kind is invalid.', {
      code: 'INVALID_CREDENTIAL_KIND', statusCode: 400,
    });
  }
  return `${ownerPrefix(userId)}${kind}/`;
}

/** Only keys emitted inside the caller's exact private namespace are accepted. */
export function isCredentialKeyOwnedBy(storageKey, userId, expectedKind) {
  if (!CREDENTIAL_KINDS.has(expectedKind)) return false;
  return typeof storageKey === 'string'
    && !storageKey.includes('..')
    && storageKey.startsWith(kindPrefix(userId, expectedKind))
    && /^[a-zA-Z0-9/_-]+\.(pdf|jpg|png|webp|heic)\.enc$/.test(storageKey);
}

function makeObjectKey(userId, kind, extension, now) {
  const date = now();
  const yearMonth = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  return `${kindPrefix(userId, kind)}${yearMonth}/${uuidv4()}.${extension}.enc`;
}

function encryptBuffer(buffer, userId) {
  if (!isEncryptionEnabled()) {
    throw new CredentialStorageError('Credential storage encryption is unavailable.', {
      code: 'ENCRYPTION_UNAVAILABLE', statusCode: 503,
    });
  }
  const ciphertext = encrypt(buffer.toString('base64'), `trainer-credential:${userId}`);
  if (!isEncrypted(ciphertext)) {
    throw new CredentialStorageError('Credential encryption failed closed.', {
      code: 'ENCRYPTION_UNAVAILABLE', statusCode: 503,
    });
  }
  return Buffer.from(ciphertext, 'utf8');
}

function privateFilePath(privateRoot, storageKey) {
  const root = path.resolve(privateRoot);
  const resolved = path.resolve(root, ...storageKey.split('/'));
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new CredentialStorageError('Invalid private credential path.', {
      code: 'INVALID_STORAGE_KEY', statusCode: 400,
    });
  }
  return resolved;
}

/** Factory keeps storage behavior deterministic and independently testable. */
export function createTrainerCredentialStorage({
  r2Ready = r2Configured,
  getR2ClientFn = getR2Client,
  headObjectFn = headObject,
  privateRoot = path.join(process.cwd(), 'private-uploads'),
  environment = process.env.NODE_ENV,
  now = () => new Date(),
} = {}) {
  function prepareCredentialUpload(buffer, { userId, kind, declaredMime }) {
    const detected = detectCredentialFile(buffer, declaredMime);
    const encrypted = encryptBuffer(buffer, userId);
    const storageKey = makeObjectKey(userId, kind, detected.extension, now);
    return {
      storageKey,
      encryptedBody: encrypted,
      byteSize: buffer.length,
      userId,
      kind,
      detectedMime: detected.mime,
    };
  }

  async function persistPreparedCredential(prepared) {
    const {
      storageKey, encryptedBody, userId, kind, detectedMime,
    } = prepared;
    if (!isCredentialKeyOwnedBy(storageKey, userId, kind) || !Buffer.isBuffer(encryptedBody)) {
      throw new CredentialStorageError('Prepared credential is invalid.', {
        code: 'INVALID_STORAGE_KEY', statusCode: 400,
      });
    }
    if (r2Ready) {
      try {
        await getR2ClientFn().send(new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: storageKey,
          Body: encryptedBody,
          ContentType: 'application/octet-stream',
          ContentDisposition: 'attachment; filename="credential.enc"',
          CacheControl: 'no-store',
          Metadata: {
            'original-content-type': detectedMime,
            'owner-id': String(userId),
            'credential-kind': kind,
            encryption: 'aes-256-gcm',
            lifecycle: 'pending-trainer-onboarding',
          },
        }));
        return { storageKey, storage: 'r2' };
      } catch (error) {
        logger.error('[TrainerCredentialStorage] R2 upload failed: %s', error.message);
        throw new CredentialStorageError('Private credential storage is temporarily unavailable.', {
          code: 'STORAGE_UNAVAILABLE', statusCode: 503,
        });
      }
    } else if (environment === 'production') {
      throw new CredentialStorageError('Private credential storage is temporarily unavailable.', {
        code: 'STORAGE_UNAVAILABLE', statusCode: 503,
      });
    }

    const localPath = privateFilePath(privateRoot, storageKey);
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, encryptedBody, { flag: 'wx' });
    return { storageKey, storage: 'private-local' };
  }

  async function uploadCredentialFile(buffer, options) {
    const prepared = prepareCredentialUpload(buffer, options);
    return persistPreparedCredential(prepared);
  }

  async function credentialExistsForUser(storageKey, userId, expectedKind) {
    if (!isCredentialKeyOwnedBy(storageKey, userId, expectedKind)) return false;
    if (r2Ready) {
      try {
        await headObjectFn(storageKey);
        return true;
      } catch (error) {
        if (error?.name === 'NotFound' || error?.$metadata?.httpStatusCode === 404) return false;
        throw new CredentialStorageError('Credential storage could not be verified.', {
          code: 'STORAGE_UNAVAILABLE', statusCode: 503,
        });
      }
    }
    if (environment === 'production') return false;
    try {
      await fs.access(privateFilePath(privateRoot, storageKey));
      return true;
    } catch {
      return false;
    }
  }

  async function deleteCredential(storageKey, userId, expectedKind) {
    if (!isCredentialKeyOwnedBy(storageKey, userId, expectedKind)) {
      throw new CredentialStorageError('Credential key does not belong to this account.', {
        code: 'INVALID_STORAGE_KEY', statusCode: 400,
      });
    }
    if (r2Ready) {
      try {
        await getR2ClientFn().send(new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: storageKey,
        }));
        return true;
      } catch (error) {
        logger.error('[TrainerCredentialStorage] R2 delete failed: %s', error.message);
        throw new CredentialStorageError('Private credential cleanup is temporarily unavailable.', {
          code: 'STORAGE_UNAVAILABLE', statusCode: 503,
        });
      }
    }
    if (environment === 'production') {
      throw new CredentialStorageError('Private credential cleanup is temporarily unavailable.', {
        code: 'STORAGE_UNAVAILABLE', statusCode: 503,
      });
    }
    await fs.rm(privateFilePath(privateRoot, storageKey), { force: true });
    return true;
  }

  return {
    prepareCredentialUpload,
    persistPreparedCredential,
    uploadCredentialFile,
    credentialExistsForUser,
    deleteCredential,
  };
}

export const trainerCredentialStorage = createTrainerCredentialStorage();
export const uploadTrainerCredential = (...args) => trainerCredentialStorage.uploadCredentialFile(...args);
export const credentialExistsForUser = (...args) => trainerCredentialStorage.credentialExistsForUser(...args);
export const deleteTrainerCredential = (...args) => trainerCredentialStorage.deleteCredential(...args);
