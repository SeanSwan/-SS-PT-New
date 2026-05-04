/**
 * Phase 3 Slice 3.15 — Codex Pass 2 fix locks
 * =============================================
 * Source-text + behavioral locks for the 4 fixes from Codex Pass 2:
 *   HIGH #1   finalization RETURNING + row count check, cipher purge
 *             active-lock guard
 *   MEDIUM #2 canonical UUID regex with hyphen positions
 *   MEDIUM #3 readClip throws on disk-restore failure when caller
 *             requires disk-backed reads
 *   MEDIUM #4 NOT FIXED in this slice — documented as known limitation;
 *             apply path remains compensating-cleanup, not atomic.
 *             Refactoring logWorkoutForClient to accept external
 *             transaction is deferred to Phase 3.x.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MERGE_CTRL = readFileSync(resolve(__dirname, '../../controllers/plaud/plaudMergeController.mjs'), 'utf8');
const CRON_SRC = readFileSync(resolve(__dirname, '../../jobs/plaudCronJobs.mjs'), 'utf8');
const STORAGE_SRC = readFileSync(resolve(__dirname, '../../services/plaudClipStorageDualTier.mjs'), 'utf8');
const UUID_SRC = readFileSync(resolve(__dirname, '../../utils/plaudUuidRegex.mjs'), 'utf8');
const LIST_CTRL = readFileSync(resolve(__dirname, '../../controllers/plaud/plaudListController.mjs'), 'utf8');
const REQ_CTRL = readFileSync(resolve(__dirname, '../../controllers/plaud/plaudMergeRequestsController.mjs'), 'utf8');
const LOCK_SRC = readFileSync(resolve(__dirname, '../../services/plaudMergeLockService.mjs'), 'utf8');

describe('Slice 3.15 — Codex Pass 2 HIGH #1 fix: finalization atomicity', () => {
  it('completion update has RETURNING merge_request_id', () => {
    expect(MERGE_CTRL).toMatch(/UPDATE plaud_merge_requests[\s\S]{0,800}RETURNING merge_request_id/);
  });

  it('completion update row count check rolls back on mismatch', () => {
    expect(MERGE_CTRL).toMatch(/completeRows[\s\S]{0,200}length\s*!==\s*1/);
    expect(MERGE_CTRL).toMatch(/MERGE_LOCK_LOST/);
  });

  it('cipher purge cron skips processing rows with active lock (Codex Pass 2 HIGH #1)', () => {
    // Find the cipher purge function and assert NOT EXISTS appears in
    // its body (before plaudMergeLockSweepCron starts).
    const purgeIdx = CRON_SRC.indexOf('export async function plaudCipherPurgeCron');
    const sweepIdx = CRON_SRC.indexOf('export async function plaudMergeLockSweepCron');
    expect(purgeIdx).toBeGreaterThan(0);
    expect(sweepIdx).toBeGreaterThan(purgeIdx);
    const purgeBody = CRON_SRC.slice(purgeIdx, sweepIdx);
    expect(purgeBody).toMatch(/NOT EXISTS/);
    expect(purgeBody).toMatch(/plaud_merge_locks/);
    expect(purgeBody).toMatch(/locked_until\s*>\s*NOW\(\)/);
  });
});

describe('Slice 3.15 — Codex Pass 2 MEDIUM #2 fix: canonical UUID regex', () => {
  it('plaudUuidRegex util exports canonical RFC 4122 hyphen-positions regex', () => {
    expect(UUID_SRC).toMatch(/PLAUD_UUID_REGEX\s*=\s*\/\^\[0-9a-fA-F\]\{8\}-\[0-9a-fA-F\]\{4\}-\[0-9a-fA-F\]\{4\}-\[0-9a-fA-F\]\{4\}-\[0-9a-fA-F\]\{12\}\$\//);
  });

  it('mergeController imports + uses PLAUD_UUID_REGEX', () => {
    expect(MERGE_CTRL).toMatch(/import\s+\{\s*PLAUD_UUID_REGEX\s*\}\s+from\s+['"][^'"]*plaudUuidRegex\.mjs['"]/);
    expect(MERGE_CTRL).toMatch(/PLAUD_UUID_REGEX\.test/);
  });

  it('storage layer uses PLAUD_UUID_REGEX (no loose 36-hyphen regex)', () => {
    expect(STORAGE_SRC).toMatch(/import\s+\{\s*PLAUD_UUID_REGEX\s*\}\s+from\s+['"][^'"]*plaudUuidRegex\.mjs['"]/);
    expect(STORAGE_SRC).toMatch(/PLAUD_UUID_REGEX\.test/);
  });

  it('plaudListController uses PLAUD_UUID_REGEX', () => {
    expect(LIST_CTRL).toMatch(/PLAUD_UUID_REGEX\.test/);
  });

  it('plaudMergeRequestsController uses PLAUD_UUID_REGEX', () => {
    expect(REQ_CTRL).toMatch(/PLAUD_UUID_REGEX\.test/);
  });

  it('plaudMergeLockService uses PLAUD_UUID_REGEX', () => {
    expect(LOCK_SRC).toMatch(/PLAUD_UUID_REGEX\.test/);
  });

  it('isPlaudUuid helper rejects 36-dash pathological string', async () => {
    const { isPlaudUuid } = await import('../../utils/plaudUuidRegex.mjs');
    expect(isPlaudUuid('------------------------------------')).toBe(false);
    expect(isPlaudUuid('11111111-1111-4111-8111-111111111111')).toBe(true);
    expect(isPlaudUuid('not-a-uuid')).toBe(false);
    expect(isPlaudUuid('')).toBe(false);
    expect(isPlaudUuid(null)).toBe(false);
    expect(isPlaudUuid(undefined)).toBe(false);
  });
});

describe('Slice 3.15 — Codex Pass 2 MEDIUM #3 fix: readClip restore failure', () => {
  it('readClip throws ClipNotFoundError on restore failure when requireDiskRestore !== false', () => {
    expect(STORAGE_SRC).toMatch(/requireDiskRestore\s*!==\s*false/);
    expect(STORAGE_SRC).toMatch(/throw\s+new\s+ClipNotFoundError/);
  });

  it('mergeController calls readClip with requireDiskRestore: true', () => {
    expect(MERGE_CTRL).toMatch(/readClip\([\s\S]{0,200}requireDiskRestore:\s*true/);
  });

  it('opt-out path is documented (warn instead of throw)', () => {
    expect(STORAGE_SRC).toMatch(/caller opted out of disk restore/);
  });
});
