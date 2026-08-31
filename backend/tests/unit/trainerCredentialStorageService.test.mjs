/**
 * ============================================================================
 * BLUEPRINT: Trainer credential storage security contract
 * ============================================================================
 * PURPOSE: Pin the private-storage invariants for certification and insurance
 *          evidence before the storage implementation is introduced.
 * SECURITY: File bytes, not multipart claims or filenames, decide format.
 *           Stored objects are encrypted, owner-scoped, and never web-served.
 * SCOPE: Pure format checks plus isolated temporary-disk behavior. No network,
 *        production bucket, or persistent user data is touched.
 * ============================================================================
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import {
  CredentialStorageError,
  createTrainerCredentialStorage,
  detectCredentialFile,
  isCredentialKeyOwnedBy,
} from '../../services/trainerCredentialStorageService.mjs';
import { resetKeyCache } from '../../services/encryption/encryptionService.mjs';

const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);

let privateRoot;
let previousKey;

beforeEach(async () => {
  previousKey = process.env.ENCRYPTION_MASTER_KEY;
  process.env.ENCRYPTION_MASTER_KEY = 'trainer-storage-test-key-32-bytes-minimum';
  resetKeyCache();
  privateRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'trainer-credentials-'));
});

afterEach(async () => {
  if (previousKey === undefined) delete process.env.ENCRYPTION_MASTER_KEY;
  else process.env.ENCRYPTION_MASTER_KEY = previousKey;
  resetKeyCache();
  if (privateRoot) await fs.rm(privateRoot, { recursive: true, force: true });
});

describe('detectCredentialFile', () => {
  it('accepts a PDF only when the bytes and declared MIME agree', () => {
    const detected = detectCredentialFile(Buffer.from('%PDF-1.7\nfixture'), 'application/pdf');
    expect(detected).toEqual({ mime: 'application/pdf', extension: 'pdf' });
  });

  it('rejects HTML bytes disguised as an allowed image', () => {
    expect(() => detectCredentialFile(
      Buffer.from('<html><script>stealToken()</script></html>'),
      'image/png',
    )).toThrowError(CredentialStorageError);
  });

  it('rejects a valid format when the multipart MIME disagrees', () => {
    expect(() => detectCredentialFile(PNG_BYTES, 'image/jpeg')).toThrow(/does not match/i);
  });
});

describe('private credential storage', () => {
  it('uploads only encrypted, non-renderable objects to R2', async () => {
    const send = vi.fn().mockResolvedValue({});
    const storage = createTrainerCredentialStorage({
      r2Ready: true,
      getR2ClientFn: () => ({ send }),
      environment: 'production',
    });

    const result = await storage.uploadCredentialFile(Buffer.from('%PDF-1.7\nsecret'), {
      userId: 42,
      kind: 'insurance',
      declaredMime: 'application/pdf',
    });
    const put = send.mock.calls[0][0].input;

    expect(result.storage).toBe('r2');
    expect(result.storageKey).toMatch(/^private\/trainer-credentials\/42\/insurance\//);
    expect(put.Key).toBe(result.storageKey);
    expect(put.ContentType).toBe('application/octet-stream');
    expect(put.ContentDisposition).toMatch(/^attachment/);
    expect(put.CacheControl).toBe('no-store');
    expect(put.Body.toString('utf8')).toMatch(/^\$SSE\$/);
    expect(put.Body.includes(Buffer.from('%PDF-1.7\nsecret'))).toBe(false);
  });

  it('writes encrypted bytes to an owner-scoped, non-public local key', async () => {
    const storage = createTrainerCredentialStorage({
      r2Ready: false,
      environment: 'test',
      privateRoot,
    });

    const result = await storage.uploadCredentialFile(PNG_BYTES, {
      userId: 42,
      kind: 'certification',
      declaredMime: 'image/png',
    });

    expect(result.storage).toBe('private-local');
    expect(result.storageKey).toMatch(/^private\/trainer-credentials\/42\/certification\//);
    expect(result.storageKey).toMatch(/\.png\.enc$/);
    expect(result.storageKey).not.toContain('uploads/');

    const ciphertext = await fs.readFile(path.join(privateRoot, result.storageKey));
    expect(ciphertext.equals(PNG_BYTES)).toBe(false);
    expect(ciphertext.toString('utf8')).toMatch(/^\$SSE\$/);
    expect(await storage.credentialExistsForUser(result.storageKey, 42, 'certification')).toBe(true);
    expect(await storage.credentialExistsForUser(result.storageKey, 42, 'insurance')).toBe(false);
    expect(await storage.credentialExistsForUser(result.storageKey, 7, 'certification')).toBe(false);
  });

  it('fails closed in production when R2 is unavailable', async () => {
    const storage = createTrainerCredentialStorage({
      r2Ready: false,
      environment: 'production',
      privateRoot,
    });

    await expect(storage.uploadCredentialFile(PNG_BYTES, {
      userId: 42,
      kind: 'certification',
      declaredMime: 'image/png',
    })).rejects.toMatchObject({ code: 'STORAGE_UNAVAILABLE', statusCode: 503 });
  });

  it('never reports a local success after a configured R2 write fails', async () => {
    const storage = createTrainerCredentialStorage({
      r2Ready: true,
      getR2ClientFn: () => ({ send: vi.fn().mockRejectedValue(new Error('r2 unavailable')) }),
      environment: 'development',
      privateRoot,
    });

    await expect(storage.uploadCredentialFile(PNG_BYTES, {
      userId: 42,
      kind: 'certification',
      declaredMime: 'image/png',
    })).rejects.toMatchObject({ code: 'STORAGE_UNAVAILABLE', statusCode: 503 });
    expect(await fs.readdir(privateRoot)).toEqual([]);
  });

  it('fails closed when application-level encryption is unavailable', async () => {
    delete process.env.ENCRYPTION_MASTER_KEY;
    resetKeyCache();
    const storage = createTrainerCredentialStorage({
      r2Ready: false,
      environment: 'test',
      privateRoot,
    });

    await expect(storage.uploadCredentialFile(PNG_BYTES, {
      userId: 42,
      kind: 'certification',
      declaredMime: 'image/png',
    })).rejects.toMatchObject({ code: 'ENCRYPTION_UNAVAILABLE', statusCode: 503 });
  });

  it('physically deletes a private-local credential and remains idempotent', async () => {
    const storage = createTrainerCredentialStorage({
      r2Ready: false,
      environment: 'test',
      privateRoot,
    });
    const uploaded = await storage.uploadCredentialFile(PNG_BYTES, {
      userId: 42,
      kind: 'certification',
      declaredMime: 'image/png',
    });

    await expect(storage.deleteCredential(
      uploaded.storageKey, 42, 'certification',
    )).resolves.toBe(true);
    await expect(storage.deleteCredential(
      uploaded.storageKey, 42, 'certification',
    )).resolves.toBe(true);
    expect(await storage.credentialExistsForUser(
      uploaded.storageKey, 42, 'certification',
    )).toBe(false);
  });

  it('uses an R2 DeleteObject command and refuses cross-owner deletion', async () => {
    const send = vi.fn().mockResolvedValue({});
    const storage = createTrainerCredentialStorage({
      r2Ready: true,
      getR2ClientFn: () => ({ send }),
      environment: 'production',
    });
    const uploaded = await storage.uploadCredentialFile(Buffer.from('%PDF-1.7\nsecret'), {
      userId: 42,
      kind: 'insurance',
      declaredMime: 'application/pdf',
    });

    await storage.deleteCredential(uploaded.storageKey, 42, 'insurance');
    expect(send.mock.calls[1][0].constructor.name).toBe('DeleteObjectCommand');
    await expect(storage.deleteCredential(
      uploaded.storageKey, 7, 'insurance',
    )).rejects.toMatchObject({ code: 'INVALID_STORAGE_KEY', statusCode: 400 });
    expect(send).toHaveBeenCalledTimes(2);
  });
});

describe('isCredentialKeyOwnedBy', () => {
  it('binds the full private namespace to one authenticated owner', () => {
    const key = 'private/trainer-credentials/42/insurance/2026-08/id.pdf.enc';
    expect(isCredentialKeyOwnedBy(key, 42, 'insurance')).toBe(true);
    expect(isCredentialKeyOwnedBy(key, 42, 'certification')).toBe(false);
    expect(isCredentialKeyOwnedBy(key, 7, 'insurance')).toBe(false);
    expect(isCredentialKeyOwnedBy('../private/trainer-credentials/42/x', 42, 'insurance')).toBe(false);
    expect(isCredentialKeyOwnedBy('/uploads/trainer-credentials/x.pdf', 42, 'insurance')).toBe(false);
  });
});
