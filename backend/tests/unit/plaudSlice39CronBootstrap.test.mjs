/**
 * Phase 3 Slice 3.9 — TTL crons + server.mjs bootstrap locks
 * ============================================================
 * Source-text locks for the four cron jobs and the server.mjs wiring.
 * Behavioral cron testing runs in slice 3.14 Playwright.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CRONS_SRC = readFileSync(
  resolve(__dirname, '../../jobs/plaudCronJobs.mjs'), 'utf8',
);
const SERVER_SRC = readFileSync(
  resolve(__dirname, '../../server.mjs'), 'utf8',
);

describe('Slice 3.9 — plaudCronJobs source contract', () => {
  it('exports startPlaudCronJobs + stopPlaudCronJobs', () => {
    expect(CRONS_SRC).toMatch(/export\s+function\s+startPlaudCronJobs/);
    expect(CRONS_SRC).toMatch(/export\s+function\s+stopPlaudCronJobs/);
  });

  it('exports the 4 individual cron functions for testability', () => {
    for (const fn of ['plaudClipTtlCron', 'plaudCipherPurgeCron', 'plaudMergeLockSweepCron', 'plaudStaleMergeSweeper']) {
      expect(CRONS_SRC).toMatch(new RegExp(`export\\s+async\\s+function\\s+${fn}`));
    }
  });

  it('startPlaudCronJobs gated on PLAUD_TTL_CRON_ENABLED env flag', () => {
    expect(CRONS_SRC).toMatch(/process\.env\.PLAUD_TTL_CRON_ENABLED\s*!==\s*['"]true['"]/);
  });

  it('clipTtl flips uploading >5min to lost (Codex Round 3 HIGH #2)', () => {
    expect(CRONS_SRC).toMatch(/STALE_UPLOADING_MIN\s*=\s*5/);
    expect(CRONS_SRC).toMatch(/UPDATE\s+plaud_clips[\s\S]{0,400}'lost'[\s\S]{0,200}'uploading'/);
  });

  it('clipTtl flips expired clips to expired + best-effort cleanup', () => {
    expect(CRONS_SRC).toMatch(/UPDATE\s+plaud_clips[\s\S]{0,400}'expired'[\s\S]{0,400}expires_at\s*<\s*NOW\(\)/);
    expect(CRONS_SRC).toMatch(/deleteClip\(/);
  });

  it('cipherPurge uses CASE WHEN status IN (processing, completed) THEN expired (Codex Round 4 MED #3)', () => {
    expect(CRONS_SRC).toMatch(/CASE[\s\S]{0,200}status\s+IN\s*\(\s*'processing',\s*'completed'\s*\)[\s\S]{0,80}'expired'/);
  });

  it('cipherPurge NULLs cipher fields and records cipher_purged_at', () => {
    expect(CRONS_SRC).toMatch(/payload_cipher\s*=\s*NULL/);
    expect(CRONS_SRC).toMatch(/payload_iv\s*=\s*NULL/);
    expect(CRONS_SRC).toMatch(/payload_tag\s*=\s*NULL/);
    expect(CRONS_SRC).toMatch(/cipher_purged_at\s*=\s*NOW\(\)/);
  });

  it('cipherPurge skips approved + discarded (already cipher-clean)', () => {
    expect(CRONS_SRC).toMatch(/status\s+NOT\s+IN\s*\(\s*'approved',\s*'discarded'\s*\)/);
  });

  it('staleMerge sweeper flips processing >20min with no active lock to failed', () => {
    expect(CRONS_SRC).toMatch(/STALE_PROCESSING_MIN\s*=\s*20/);
    expect(CRONS_SRC).toMatch(/MERGE_PROCESSING_STALE/);
    expect(CRONS_SRC).toMatch(/NOT EXISTS[\s\S]{0,300}plaud_merge_locks/);
  });

  it('cron schedule uses non-overlapping execution lock per job', () => {
    expect(CRONS_SRC).toMatch(/let\s+running\s*=\s*false/);
    expect(CRONS_SRC).toMatch(/if\s*\(\s*running\s*\)\s*return/);
  });

  it('cron intervals: 5min for clip/cipher/staleMerge, 60s for lock sweep', () => {
    expect(CRONS_SRC).toMatch(/CLIP_TTL_INTERVAL_MS\s*=\s*5\s*\*\s*60\s*\*\s*1000/);
    expect(CRONS_SRC).toMatch(/CIPHER_PURGE_INTERVAL_MS\s*=\s*5\s*\*\s*60\s*\*\s*1000/);
    expect(CRONS_SRC).toMatch(/LOCK_SWEEP_INTERVAL_MS\s*=\s*60\s*\*\s*1000/);
    expect(CRONS_SRC).toMatch(/STALE_MERGE_INTERVAL_MS\s*=\s*5\s*\*\s*60\s*\*\s*1000/);
  });

  it('all crons run once at startup (catch-up after restart)', () => {
    expect(CRONS_SRC).toMatch(/runAll\(\)/);
    expect(CRONS_SRC).toMatch(/Promise\.allSettled\(/);
  });

  it('handle.unref() so cron intervals do not block process exit', () => {
    expect(CRONS_SRC).toMatch(/handle\.unref\(\)/);
  });
});

describe('Slice 3.9 — server.mjs bootstrap wiring', () => {
  it('imports startPlaudR2MirrorWorker + startPlaudCronJobs', () => {
    expect(SERVER_SRC).toMatch(/import\s+\{[\s\S]{0,80}startPlaudR2MirrorWorker[\s\S]{0,80}\}\s+from\s+['"]\.\/jobs\/plaudR2MirrorWorker\.mjs['"]/);
    expect(SERVER_SRC).toMatch(/import\s+\{[\s\S]{0,80}startPlaudCronJobs[\s\S]{0,80}\}\s+from\s+['"]\.\/jobs\/plaudCronJobs\.mjs['"]/);
  });

  it('starts both worker + crons after initializeSocket', () => {
    const initIdx = SERVER_SRC.indexOf('initializeSocket()');
    const startWorkerIdx = SERVER_SRC.indexOf('startPlaudR2MirrorWorker()');
    const startCronsIdx = SERVER_SRC.indexOf('startPlaudCronJobs()');
    expect(initIdx).toBeGreaterThan(0);
    expect(startWorkerIdx).toBeGreaterThan(initIdx);
    expect(startCronsIdx).toBeGreaterThan(initIdx);
  });

  it('worker + cron startup wrapped in try/catch (non-fatal failure)', () => {
    expect(SERVER_SRC).toMatch(/PLAUD worker\/cron bootstrap failed[\s\S]{0,80}non-fatal/);
  });

  it('graceful shutdown calls stopPlaudR2MirrorWorker + stopPlaudCronJobs', () => {
    expect(SERVER_SRC).toMatch(/stopPlaudR2MirrorWorker\(\)/);
    expect(SERVER_SRC).toMatch(/stopPlaudCronJobs\(\)/);
  });
});
