/**
 * Phase 3 Slice 3.3 — dual-tier storage + R2 mirror worker locks
 * ================================================================
 * Source-text + behavioral locks for plaudClipStorageDualTier.mjs and
 * plaudR2MirrorWorker.mjs.
 *
 * Behavioral storage tests run against a temp dir (no R2 needed for
 * disk-tier verification). R2 fallback paths are tested at the source
 * level only — actual R2 round-trip happens in integration tests
 * (slice 3.7+) and Playwright smoke (slice 3.14).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STORAGE_SRC = readFileSync(
  resolve(__dirname, '../../services/plaudClipStorageDualTier.mjs'), 'utf8',
);
const WORKER_SRC = readFileSync(
  resolve(__dirname, '../../jobs/plaudR2MirrorWorker.mjs'), 'utf8',
);
const R2_CLIENT_SRC = readFileSync(
  resolve(__dirname, '../../services/plaudR2Client.mjs'), 'utf8',
);

describe('Slice 3.3 — plaudR2Client source contract', () => {
  it('uses R2_PLAUD_BUCKET env (NOT generic R2_BUCKET_NAME)', () => {
    expect(R2_CLIENT_SRC).toMatch(/R2_PLAUD_BUCKET/);
    expect(R2_CLIENT_SRC).not.toMatch(/R2_BUCKET_NAME/);
  });

  it('default bucket is swanstudios-plaud-clips', () => {
    expect(R2_CLIENT_SRC).toMatch(/swanstudios-plaud-clips/);
  });

  it('exports getPlaudR2Client and isPlaudR2Configured', () => {
    expect(R2_CLIENT_SRC).toMatch(/export\s+function\s+getPlaudR2Client/);
    expect(R2_CLIENT_SRC).toMatch(/export\s+function\s+isPlaudR2Configured/);
  });
});

describe('Slice 3.3 — plaudClipStorageDualTier source contract', () => {
  it('uses PLAUD_DISK_BASE env (default /tmp/plaud), read per-call (testable)', () => {
    expect(STORAGE_SRC).toMatch(/process\.env\.PLAUD_DISK_BASE\s*\|\|\s*['"]\/tmp\/plaud['"]/);
    expect(STORAGE_SRC).toMatch(/function\s+getPlaudDiskBase/);
  });

  it('writeClipToDisk writes mode 0600 atomically (tmp + rename)', () => {
    expect(STORAGE_SRC).toMatch(/writeFile\([^)]*tmpPath[^)]*0o600/);
    expect(STORAGE_SRC).toMatch(/fs\.rename\(\s*tmpPath/);
  });

  it('writeClipToDisk creates parent dir mode 0700', () => {
    expect(STORAGE_SRC).toMatch(/mkdir\([^)]*\{\s*recursive:\s*true,\s*mode:\s*0o700/);
  });

  it('writeClipToDisk computes sha256 for integrity', () => {
    expect(STORAGE_SRC).toMatch(/createHash\(\s*['"]sha256['"]\s*\)/);
  });

  it('readClip falls back from disk ENOENT to R2', () => {
    expect(STORAGE_SRC).toMatch(/err\.code\s*!==\s*['"]ENOENT['"]/);
    expect(STORAGE_SRC).toMatch(/GetObjectCommand/);
  });

  it('readClip restores R2-fetched bytes to disk for next reader', () => {
    // After fetching from R2, write the buffer back to disk path.
    expect(STORAGE_SRC).toMatch(/R2-restore-to-disk/i);
  });

  it('readClip throws ClipNotFoundError when both disk and R2 miss', () => {
    expect(STORAGE_SRC).toMatch(/throw\s+new\s+ClipNotFoundError/);
  });

  it('deleteClip is best-effort (errors logged not thrown)', () => {
    expect(STORAGE_SRC).toMatch(/disk unlink failed \(continuing\)/);
    expect(STORAGE_SRC).toMatch(/R2 delete failed \(continuing\)/);
  });

  it('clipId regex prevents path traversal (UUID format only — canonical via PLAUD_UUID_REGEX after slice 3.15)', () => {
    expect(STORAGE_SRC).toMatch(/PLAUD_UUID_REGEX\.test/);
  });

  it('storage_ext regex limits to alnum 1-8 chars', () => {
    expect(STORAGE_SRC).toMatch(/\/\^\[a-z0-9\]\{1,8\}\$\/i/);
  });

  it('uses S3 sdk commands (Put, Get, Delete, Head)', () => {
    expect(STORAGE_SRC).toMatch(/PutObjectCommand/);
    expect(STORAGE_SRC).toMatch(/GetObjectCommand/);
    expect(STORAGE_SRC).toMatch(/DeleteObjectCommand/);
    expect(STORAGE_SRC).toMatch(/HeadObjectCommand/);
  });
});

describe('Slice 3.3 — plaudR2MirrorWorker source contract', () => {
  it('worker is gated on PLAUD_WORKER_ENABLED env (Codex Round 2 HIGH #4)', () => {
    expect(WORKER_SRC).toMatch(/process\.env\.PLAUD_WORKER_ENABLED\s*!==\s*['"]true['"]/);
  });

  it('claim query polls BOTH pending and failed_retryable (Codex Round 2 CRIT #3)', () => {
    expect(WORKER_SRC).toMatch(/status\s+IN\s*\(\s*['"]pending['"]\s*,\s*['"]failed_retryable['"]/);
  });

  it('claim uses FOR UPDATE SKIP LOCKED for safe concurrent claim', () => {
    expect(WORKER_SRC).toMatch(/FOR\s+UPDATE\s+SKIP\s+LOCKED/);
  });

  it('stale in_flight recovery sweeps rows >5min idle (Codex Round 3 HIGH #1)', () => {
    expect(WORKER_SRC).toMatch(/INTERVAL\s+'\$\{STALE_IN_FLIGHT_MIN\}\s*minutes'|INTERVAL\s+'5\s*minutes'/);
    expect(WORKER_SRC).toMatch(/Recovered stale in_flight/);
  });

  it('stale recovery runs at startup AND every cycle', () => {
    expect(WORKER_SRC).toMatch(/recoverStaleInFlight\(\)/);
    // Called from both startPlaudR2MirrorWorker (startup) and runOnce (every cycle)
    const matches = WORKER_SRC.match(/recoverStaleInFlight\(\)/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('plaud_clips.r2_mirror_status updates atomically with job status changes', () => {
    // In the same transaction, every job status update has a paired
    // plaud_clips update. Look for the pattern.
    expect(WORKER_SRC).toMatch(/UPDATE\s+plaud_clips[\s\S]{0,200}r2_mirror_status/);
  });

  it('exponential backoff schedule: 30s, 1m, 5m, 30m, 2h', () => {
    expect(WORKER_SRC).toMatch(/30,\s*60,\s*300,\s*1800,\s*7200/);
  });

  it('terminal failure after MAX_ATTEMPTS (5)', () => {
    expect(WORKER_SRC).toMatch(/MAX_ATTEMPTS\s*=\s*5/);
    expect(WORKER_SRC).toMatch(/failed_terminal/);
  });

  it('terminal failure logs at error level (alertable)', () => {
    expect(WORKER_SRC).toMatch(/logger\.error\([^)]*FAILED_TERMINAL/);
  });
});

describe('Slice 3.3 — disk write/read (behavioral)', () => {
  let tmpDir;
  let originalBase;

  beforeAll(() => {
    originalBase = process.env.PLAUD_DISK_BASE;
    tmpDir = mkdtempSync(join(tmpdir(), 'plaud-storage-test-'));
    process.env.PLAUD_DISK_BASE = tmpDir;
  });

  afterAll(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
    if (originalBase === undefined) delete process.env.PLAUD_DISK_BASE;
    else process.env.PLAUD_DISK_BASE = originalBase;
  });

  it('writeClipToDisk + readClip round-trips a buffer', async () => {
    // Re-import to pick up the env override
    const mod = await import('../../services/plaudClipStorageDualTier.mjs');
    const userId = 12345;
    const clipId = randomUUID();
    const ext = 'mp3';
    const payload = Buffer.from('test audio bytes');

    const { diskPath, sha256 } = await mod.writeClipToDisk(userId, clipId, ext, payload);
    expect(diskPath).toContain(String(userId));
    expect(diskPath.endsWith(`${clipId}.${ext}`)).toBe(true);
    expect(sha256).toMatch(/^[0-9a-f]{64}$/);

    const stats = statSync(diskPath);
    // Mode 0o600 → low 9 bits should be 0o600 = 384. Skip on Windows where mode bits don't behave the same way.
    if (process.platform !== 'win32') {
      expect(stats.mode & 0o777).toBe(0o600);
    }

    const readBack = await mod.readClip(userId, clipId, ext);
    expect(readBack.equals(payload)).toBe(true);
  });

  it('writeClipToDisk rejects invalid clipId (path traversal guard)', async () => {
    const mod = await import('../../services/plaudClipStorageDualTier.mjs');
    await expect(mod.writeClipToDisk(1, '../etc/passwd', 'mp3', Buffer.from('x'))).rejects.toThrow(/Invalid clipId/);
    await expect(mod.writeClipToDisk(1, 'abc', 'mp3', Buffer.from('x'))).rejects.toThrow(/Invalid clipId/);
  });

  it('writeClipToDisk rejects invalid ext', async () => {
    const mod = await import('../../services/plaudClipStorageDualTier.mjs');
    await expect(mod.writeClipToDisk(1, randomUUID(), '../sh', Buffer.from('x'))).rejects.toThrow(/Invalid ext/);
    await expect(mod.writeClipToDisk(1, randomUUID(), 'verylongextension', Buffer.from('x'))).rejects.toThrow(/Invalid ext/);
  });

  it('writeClipToDisk rejects non-Buffer body', async () => {
    const mod = await import('../../services/plaudClipStorageDualTier.mjs');
    await expect(mod.writeClipToDisk(1, randomUUID(), 'mp3', 'string-not-buffer')).rejects.toThrow(/buffer must be a Buffer/);
  });

  it('computeR2Key produces deterministic plaud-clips/<userId>/<uuid>.<ext>', async () => {
    const mod = await import('../../services/plaudClipStorageDualTier.mjs');
    const clipId = randomUUID();
    const key = mod.computeR2Key(42, clipId, 'mp3');
    expect(key).toBe(`plaud-clips/42/${clipId}.mp3`);
  });
});
