/**
 * Phase 3 Slice 3.4 — cipher service + merge lock service locks
 * ===============================================================
 * Source-text + behavioral locks for plaudCipherService.mjs and
 * plaudMergeLockService.mjs.
 *
 * Cipher service is fully behavioral (in-process AES-256-GCM, no DB).
 * Lock service is source-text only — DB behavior tested in slice 3.7
 * integration with a live merge endpoint, plus Playwright smoke 3.14.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CIPHER_SRC = readFileSync(
  resolve(__dirname, '../../services/plaudCipherService.mjs'), 'utf8',
);
const LOCK_SRC = readFileSync(
  resolve(__dirname, '../../services/plaudMergeLockService.mjs'), 'utf8',
);

describe('Slice 3.4 — plaudCipherService source contract', () => {
  it('uses AES-256-GCM (NOT CBC, NOT no-auth modes)', () => {
    expect(CIPHER_SRC).toMatch(/createCipheriv\(\s*['"]aes-256-gcm['"]/);
    expect(CIPHER_SRC).toMatch(/createDecipheriv\(\s*['"]aes-256-gcm['"]/);
  });

  it('IV is 12 bytes (GCM standard)', () => {
    expect(CIPHER_SRC).toMatch(/IV_BYTES\s*=\s*12/);
  });

  it('auth tag is 16 bytes (GCM standard)', () => {
    expect(CIPHER_SRC).toMatch(/TAG_BYTES\s*=\s*16/);
  });

  it('IV is randomly generated PER ENCRYPTION (no fixed/derived IV)', () => {
    expect(CIPHER_SRC).toMatch(/randomBytes\(\s*IV_BYTES\s*\)/);
  });

  it('decrypt requires non-null Buffer cipher/iv/tag (Codex Round 4 hardening)', () => {
    expect(CIPHER_SRC).toMatch(/cipher\/iv\/tag must all be Buffers/);
  });

  it('decrypt validates iv + tag lengths before passing to crypto layer', () => {
    expect(CIPHER_SRC).toMatch(/iv length must be/);
    expect(CIPHER_SRC).toMatch(/tag length must be/);
  });

  it('key id sanitization prevents env var injection (alnum-only, max 32)', () => {
    expect(CIPHER_SRC).toMatch(/\/\^\[A-Za-z0-9_\]\{1,32\}\$\//);
  });

  it('key length validated as exactly 32 bytes (AES-256)', () => {
    expect(CIPHER_SRC).toMatch(/key\.length\s*!==\s*32/);
  });

  it('versioned env var pattern PLAUD_TRANSCRIPT_ENCRYPTION_KEY_<KEYID>', () => {
    expect(CIPHER_SRC).toMatch(/PLAUD_TRANSCRIPT_ENCRYPTION_KEY_\$\{keyId\}/);
  });

  it('exports CipherKeyMisconfiguredError, CipherKeyVersionUnavailableError, CipherDecryptFailedError', () => {
    expect(CIPHER_SRC).toMatch(/export\s+class\s+CipherKeyMisconfiguredError/);
    expect(CIPHER_SRC).toMatch(/export\s+class\s+CipherKeyVersionUnavailableError/);
    expect(CIPHER_SRC).toMatch(/export\s+class\s+CipherDecryptFailedError/);
  });

  it('exports assertCipherConfigured for boot health-check', () => {
    expect(CIPHER_SRC).toMatch(/export\s+function\s+assertCipherConfigured/);
  });
});

describe('Slice 3.4 — plaudCipherService behavior (in-process AES-GCM)', () => {
  let originalKeyId;
  let originalKeyV1;
  let originalKeyV2;

  beforeAll(() => {
    originalKeyId = process.env.PLAUD_TRANSCRIPT_ENCRYPTION_KEY_ID;
    originalKeyV1 = process.env.PLAUD_TRANSCRIPT_ENCRYPTION_KEY_V1;
    originalKeyV2 = process.env.PLAUD_TRANSCRIPT_ENCRYPTION_KEY_V2;
    process.env.PLAUD_TRANSCRIPT_ENCRYPTION_KEY_V1 = randomBytes(32).toString('base64');
    process.env.PLAUD_TRANSCRIPT_ENCRYPTION_KEY_V2 = randomBytes(32).toString('base64');
    process.env.PLAUD_TRANSCRIPT_ENCRYPTION_KEY_ID = 'V2';
  });

  afterAll(() => {
    if (originalKeyId === undefined) delete process.env.PLAUD_TRANSCRIPT_ENCRYPTION_KEY_ID;
    else process.env.PLAUD_TRANSCRIPT_ENCRYPTION_KEY_ID = originalKeyId;
    if (originalKeyV1 === undefined) delete process.env.PLAUD_TRANSCRIPT_ENCRYPTION_KEY_V1;
    else process.env.PLAUD_TRANSCRIPT_ENCRYPTION_KEY_V1 = originalKeyV1;
    if (originalKeyV2 === undefined) delete process.env.PLAUD_TRANSCRIPT_ENCRYPTION_KEY_V2;
    else process.env.PLAUD_TRANSCRIPT_ENCRYPTION_KEY_V2 = originalKeyV2;
  });

  it('round-trips a workout payload', async () => {
    const { encryptPayload, decryptPayload } = await import('../../services/plaudCipherService.mjs');
    const payload = {
      transcript: 'Sarah Johnson, May 3rd. Squats 3x10 at 135.',
      parsedWorkout: {
        date: '2026-05-03',
        exercises: [{ name: 'Squat', sets: [{ reps: 10, weight: 135 }] }],
      },
    };
    const enc = encryptPayload(payload);
    expect(enc.cipher).toBeInstanceOf(Buffer);
    expect(enc.iv).toBeInstanceOf(Buffer);
    expect(enc.tag).toBeInstanceOf(Buffer);
    expect(enc.iv.length).toBe(12);
    expect(enc.tag.length).toBe(16);
    expect(enc.keyId).toBe('V2');
    const dec = decryptPayload(enc);
    expect(dec).toEqual(payload);
  });

  it('detects auth-tag tampering', async () => {
    const { encryptPayload, decryptPayload, CipherDecryptFailedError } = await import('../../services/plaudCipherService.mjs');
    const enc = encryptPayload({ transcript: 'x' });
    const tampered = { ...enc, tag: Buffer.alloc(16, 0) };
    expect(() => decryptPayload(tampered)).toThrow(CipherDecryptFailedError);
  });

  it('detects ciphertext tampering', async () => {
    const { encryptPayload, decryptPayload, CipherDecryptFailedError } = await import('../../services/plaudCipherService.mjs');
    const enc = encryptPayload({ transcript: 'x' });
    const tamperedCipher = Buffer.from(enc.cipher);
    tamperedCipher[0] ^= 0xff;
    expect(() => decryptPayload({ ...enc, cipher: tamperedCipher })).toThrow(CipherDecryptFailedError);
  });

  it('detects IV mismatch', async () => {
    const { encryptPayload, decryptPayload, CipherDecryptFailedError } = await import('../../services/plaudCipherService.mjs');
    const enc = encryptPayload({ transcript: 'x' });
    expect(() => decryptPayload({ ...enc, iv: randomBytes(12) })).toThrow(CipherDecryptFailedError);
  });

  it('rejects wrong key id (decrypt with V1 a payload encrypted under V2)', async () => {
    const { encryptPayload, decryptPayload, CipherDecryptFailedError } = await import('../../services/plaudCipherService.mjs');
    const enc = encryptPayload({ transcript: 'x' });
    expect(() => decryptPayload({ ...enc, keyId: 'V1' })).toThrow(CipherDecryptFailedError);
  });

  it('throws CipherKeyVersionUnavailableError when env key for keyId missing', async () => {
    const { decryptPayload, CipherKeyVersionUnavailableError } = await import('../../services/plaudCipherService.mjs');
    expect(() => decryptPayload({
      cipher: Buffer.alloc(16),
      iv: Buffer.alloc(12),
      tag: Buffer.alloc(16),
      keyId: 'VNONEXISTENT_99',
    })).toThrow(CipherKeyVersionUnavailableError);
  });

  it('IVs are unique across encryptions of same payload', async () => {
    const { encryptPayload } = await import('../../services/plaudCipherService.mjs');
    const a = encryptPayload({ transcript: 'identical' });
    const b = encryptPayload({ transcript: 'identical' });
    expect(a.iv.equals(b.iv)).toBe(false);
    expect(a.cipher.equals(b.cipher)).toBe(false);
  });

  it('rejects malformed key id (path traversal / injection)', async () => {
    const { decryptPayload, CipherKeyMisconfiguredError } = await import('../../services/plaudCipherService.mjs');
    for (const bad of ['../', 'V1; DROP', 'V1 V2', '#$%']) {
      expect(() => decryptPayload({
        cipher: Buffer.alloc(16),
        iv: Buffer.alloc(12),
        tag: Buffer.alloc(16),
        keyId: bad,
      })).toThrow(CipherKeyMisconfiguredError);
    }
  });

  it('assertCipherConfigured returns ok when env is correct', async () => {
    const { assertCipherConfigured } = await import('../../services/plaudCipherService.mjs');
    const r = assertCipherConfigured();
    expect(r.ok).toBe(true);
    expect(r.keyId).toBe('V2');
    expect(r.keyByteLength).toBe(32);
  });
});

describe('Slice 3.4 — plaudMergeLockService source contract', () => {
  it('acquireLock uses ON CONFLICT DO UPDATE WHERE expired (Codex Round 2 HIGH #2)', () => {
    expect(LOCK_SRC).toMatch(/ON\s+CONFLICT\s*\(\s*user_id\s*\)\s*DO\s+UPDATE/);
    expect(LOCK_SRC).toMatch(/WHERE\s+plaud_merge_locks\.locked_until\s*<\s*NOW\(\)/);
  });

  it('verifyHolder uses SELECT ... FOR UPDATE inside transaction (Codex Round 4 fencing fix)', () => {
    expect(LOCK_SRC).toMatch(/SELECT 1[\s\S]{0,200}FROM\s+plaud_merge_locks[\s\S]{0,200}FOR\s+UPDATE/);
    expect(LOCK_SRC).toMatch(/MUST be called inside a transaction/);
  });

  it('heartbeat extends only if still held and not expired', () => {
    expect(LOCK_SRC).toMatch(/locked_until\s*>\s*NOW\(\)/);
  });

  it('releaseLock requires both user_id AND job_id match (no cross-job release)', () => {
    expect(LOCK_SRC).toMatch(/WHERE\s+user_id\s*=\s*:userId\s+AND\s+job_id\s*=\s*:jobId/);
  });

  it('jobId regex prevents non-UUID values (canonical UUID via PLAUD_UUID_REGEX)', () => {
    expect(LOCK_SRC).toMatch(/PLAUD_UUID_REGEX\.test/);
  });

  it('default TTL is 15 minutes', () => {
    expect(LOCK_SRC).toMatch(/DEFAULT_TTL_MIN\s*=\s*15/);
  });

  it('exports acquire, release, heartbeat, verifyHolder, sweepExpired', () => {
    for (const fn of ['acquireLock', 'releaseLock', 'heartbeat', 'verifyHolder', 'sweepExpired']) {
      expect(LOCK_SRC).toMatch(new RegExp(`export\\s+(async\\s+)?function\\s+${fn}`));
    }
  });
});
