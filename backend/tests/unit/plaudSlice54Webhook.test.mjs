/**
 * Phase 5 Slice 5.4 — webhook controller unit tests
 * ===================================================
 * Covers:
 *   - Pure function helpers (pickExtFromMimetype, getApplaudUserId, Semaphore)
 *   - Source-text regression locks for the orchestration patterns Codex
 *     requires (CR-1 through CR-6 + HIGH-1, HIGH-4, HIGH-5)
 *
 * Behavioral end-to-end coverage of the orchestrator lives in Slice 5.6
 * integration tests (real Postgres, real Sequelize, real cron interactions).
 *
 * Plan: PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1.2-2026-05-04.md §6.1 + §11.1.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Semaphore } from '../../utils/semaphore.mjs';
import {
  _internal,
} from '../../controllers/plaud/plaudApplaudWebhookController.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONTROLLER_SRC = readFileSync(
  resolve(__dirname, '../../controllers/plaud/plaudApplaudWebhookController.mjs'),
  'utf8',
);
const SEMAPHORE_SRC = readFileSync(
  resolve(__dirname, '../../utils/semaphore.mjs'),
  'utf8',
);

afterEach(() => { vi.unstubAllEnvs(); });

// ─── utils/semaphore.mjs (used by CR-6 concurrency cap) ───
describe('Slice 5.4 — Semaphore', () => {
  it('throws on non-integer maxConcurrent', () => {
    expect(() => new Semaphore(0)).toThrow();
    expect(() => new Semaphore(-1)).toThrow();
    expect(() => new Semaphore(1.5)).toThrow();
    expect(() => new Semaphore('5')).toThrow();
  });

  it('first N tryAcquire calls succeed and the (N+1)th returns null', () => {
    const sem = new Semaphore(2);
    const r1 = sem.tryAcquire();
    const r2 = sem.tryAcquire();
    expect(typeof r1).toBe('function');
    expect(typeof r2).toBe('function');
    expect(sem.tryAcquire()).toBeNull();
    expect(sem.inFlight).toBe(2);
  });

  it('release() returns capacity (in-flight decrements)', () => {
    const sem = new Semaphore(1);
    const r1 = sem.tryAcquire();
    expect(sem.tryAcquire()).toBeNull();
    r1();
    expect(sem.inFlight).toBe(0);
    expect(typeof sem.tryAcquire()).toBe('function');
  });

  it('release() is idempotent (calling twice does not double-decrement)', () => {
    const sem = new Semaphore(2);
    const r1 = sem.tryAcquire();
    r1();
    r1(); // second call must be a no-op
    expect(sem.inFlight).toBe(0);
  });

  it('exposes max for telemetry', () => {
    expect(new Semaphore(7).max).toBe(7);
  });
});

// ─── pickExtFromMimetype ───
describe('Slice 5.4 — pickExtFromMimetype', () => {
  const { pickExtFromMimetype } = _internal;

  it('maps audio/mpeg → mp3', () => {
    expect(pickExtFromMimetype('audio/mpeg')).toBe('mp3');
  });
  it('maps audio/wav and audio/x-wav → wav', () => {
    expect(pickExtFromMimetype('audio/wav')).toBe('wav');
    expect(pickExtFromMimetype('audio/x-wav')).toBe('wav');
  });
  it('maps audio/m4a, audio/x-m4a, audio/mp4 → m4a', () => {
    expect(pickExtFromMimetype('audio/m4a')).toBe('m4a');
    expect(pickExtFromMimetype('audio/x-m4a')).toBe('m4a');
    expect(pickExtFromMimetype('audio/mp4')).toBe('m4a');
  });
  it('is case-insensitive on the input mimetype', () => {
    expect(pickExtFromMimetype('AUDIO/MPEG')).toBe('mp3');
    expect(pickExtFromMimetype('Audio/Wav')).toBe('wav');
  });
  it('rejects unsupported mimetypes', () => {
    expect(pickExtFromMimetype('audio/midi')).toBeNull();
    expect(pickExtFromMimetype('video/mp4')).toBeNull();
    expect(pickExtFromMimetype('image/png')).toBeNull();
    expect(pickExtFromMimetype('text/plain')).toBeNull();
  });
  it('rejects non-string input', () => {
    expect(pickExtFromMimetype(null)).toBeNull();
    expect(pickExtFromMimetype(undefined)).toBeNull();
    expect(pickExtFromMimetype(12345)).toBeNull();
  });
});

// ─── getApplaudUserId ───
describe('Slice 5.4 — getApplaudUserId', () => {
  const { getApplaudUserId } = _internal;

  it('returns the parsed integer when env is set', () => {
    vi.stubEnv('PLAUD_APPLAUD_USER_ID', '42');
    expect(getApplaudUserId()).toBe(42);
  });
  it('throws when env is not set', () => {
    vi.stubEnv('PLAUD_APPLAUD_USER_ID', '');
    expect(() => getApplaudUserId()).toThrow(/PLAUD_APPLAUD_USER_ID/);
  });
  it('throws when env is non-numeric', () => {
    vi.stubEnv('PLAUD_APPLAUD_USER_ID', 'not-a-number');
    expect(() => getApplaudUserId()).toThrow();
  });
  it('throws when env is zero or negative', () => {
    vi.stubEnv('PLAUD_APPLAUD_USER_ID', '0');
    expect(() => getApplaudUserId()).toThrow();
    vi.stubEnv('PLAUD_APPLAUD_USER_ID', '-5');
    expect(() => getApplaudUserId()).toThrow();
  });
});

// ─── TERMINAL_DEDUP_STATES (HIGH-1 + Codex NH-7 status drift fix) ───
describe('Slice 5.4 — TERMINAL_DEDUP_STATES (Codex HIGH-1 + NH-7)', () => {
  it('contains pending_merge / merged / deleted / expired (terminal-success states)', () => {
    const set = _internal.TERMINAL_DEDUP_STATES;
    expect(set.has('pending_merge')).toBe(true);
    expect(set.has('merged')).toBe(true);
    expect(set.has('deleted')).toBe(true);
    expect(set.has('expired')).toBe(true);
  });
  it('does NOT contain uploading (uploading triggers 429 retry path)', () => {
    expect(_internal.TERMINAL_DEDUP_STATES.has('uploading')).toBe(false);
  });
  it('does NOT contain lost (lost triggers DELETE + retry path)', () => {
    expect(_internal.TERMINAL_DEDUP_STATES.has('lost')).toBe(false);
  });
  it('does NOT contain "failed" (Codex NH-7: not in PlaudClip model enum — would be unreachable)', () => {
    expect(_internal.TERMINAL_DEDUP_STATES.has('failed')).toBe(false);
  });
  it('does NOT contain "discarded" (Codex NH-7: not in PlaudClip model enum)', () => {
    expect(_internal.TERMINAL_DEDUP_STATES.has('discarded')).toBe(false);
  });
});

// ─── Source-text regression locks (Codex must-fix-before-5.5) ───
describe('Slice 5.4 — controller source-text locks (Codex CR-1..CR-6)', () => {
  it('every sequelize.query() call paired with type: QueryTypes.* (CR-1)', () => {
    const queryCalls = (CONTROLLER_SRC.match(/sequelize\.query\(/g) || []).length;
    const typeAnnotations = (CONTROLLER_SRC.match(
      /type:\s*QueryTypes\.(?:SELECT|INSERT|UPDATE|DELETE|RAW|BULKUPDATE|BULKINSERT)/g,
    ) || []).length;
    expect(queryCalls).toBeGreaterThan(0);
    expect(typeAnnotations).toBeGreaterThanOrEqual(queryCalls);
  });

  it('imports QueryTypes from sequelize', () => {
    expect(CONTROLLER_SRC).toMatch(/import\s*\{[^}]*QueryTypes[^}]*\}\s*from\s*['"]sequelize['"]/);
  });

  it('NEVER uses ANY(:array::type[]) — the bug class that crashed prod 2026-05-04 (CR-1)', () => {
    expect(CONTROLLER_SRC).not.toMatch(/ANY\s*\(\s*:[a-zA-Z_]+\s*::\s*[a-z]+\s*\[\s*\]\s*\)/i);
  });

  it('clip_external_id INSERT uses ON CONFLICT DO NOTHING (CR-3)', () => {
    expect(CONTROLLER_SRC).toMatch(
      /INSERT INTO plaud_clips[\s\S]{0,1500}ON CONFLICT[\s\S]{0,150}clip_source,\s*clip_external_id,\s*user_id[\s\S]{0,150}DO NOTHING/,
    );
  });

  it('partial unique index condition reflected in ON CONFLICT (WHERE clip_external_id IS NOT NULL)', () => {
    expect(CONTROLLER_SRC).toMatch(/ON CONFLICT[\s\S]{0,200}WHERE clip_external_id IS NOT NULL/);
  });

  it('handler is wrapped in semaphore.tryAcquire (CR-6 concurrency cap)', () => {
    expect(CONTROLLER_SRC).toMatch(/webhookSemaphore\.tryAcquire/);
    expect(CONTROLLER_SRC).toMatch(/return jsonError\(\s*res,\s*429,\s*'WEBHOOK_CONCURRENCY_LIMIT'/);
  });

  it('release() is in finally block (semaphore always released)', () => {
    expect(CONTROLLER_SRC).toMatch(/finally\s*\{\s*release\(\)/);
  });

  it('NO clip_id field in already_processed responses (CR-6 IDOR oracle fix)', () => {
    // Find every res.json call returning status: 'already_processed' and verify
    // it does NOT include clip_id. We check by searching for the exact pattern
    // — there should be NO occurrence of clip_id directly inside an
    // already_processed response object.
    const alreadyProcessedBlocks = CONTROLLER_SRC.match(
      /res\.status\(200\)\.json\(\s*\{[^}]*?status:\s*'already_processed'[^}]*?\}/g,
    ) || [];
    expect(alreadyProcessedBlocks.length).toBeGreaterThan(0);
    for (const block of alreadyProcessedBlocks) {
      expect(block).not.toMatch(/clip_id\s*:/);
    }
  });

  it('queued response DOES include clip_id (correct behavior)', () => {
    expect(CONTROLLER_SRC).toMatch(
      /status:\s*'queued'[\s\S]{0,200}clip_id:\s*insertedClipId|clip_id:\s*insertedClipId[\s\S]{0,200}status:\s*'queued'/,
    );
  });

  it('DB row insert happens AFTER fetch + probe (CR-6 reorder)', () => {
    // Find positions of: fetchAudioWithCaps call, probe call, and INSERT plaud_clips
    const fetchIdx = CONTROLLER_SRC.indexOf('fetchAudioWithCaps');
    const probeIdx = CONTROLLER_SRC.indexOf('probeFile(tmpPath)');
    const insertIdx = CONTROLLER_SRC.indexOf('INSERT INTO plaud_clips');
    expect(fetchIdx).toBeGreaterThan(0);
    expect(probeIdx).toBeGreaterThan(0);
    expect(insertIdx).toBeGreaterThan(0);
    expect(probeIdx).toBeGreaterThan(fetchIdx); // probe after fetch
    expect(insertIdx).toBeGreaterThan(probeIdx); // INSERT after probe
  });

  it('event_type branch (HIGH-4) is BEFORE any audio_url access', () => {
    const transcriptBranch = CONTROLLER_SRC.indexOf("body.event_type === 'transcript_ready'");
    const audioReadyBranch = CONTROLLER_SRC.indexOf("body.event_type !== 'audio_ready'");
    const audioUrlAccess = CONTROLLER_SRC.indexOf('body.audio_url');
    expect(transcriptBranch).toBeGreaterThan(0);
    expect(audioReadyBranch).toBeGreaterThan(0);
    expect(audioUrlAccess).toBeGreaterThan(0);
    expect(audioUrlAccess).toBeGreaterThan(transcriptBranch);
    expect(audioUrlAccess).toBeGreaterThan(audioReadyBranch);
  });

  it('transcript_ready returns 200 NOOP without audio operations', () => {
    expect(CONTROLLER_SRC).toMatch(
      /event_type === 'transcript_ready'[\s\S]{0,300}res\.status\(200\)\.json\(\s*\{\s*acknowledged:\s*true,\s*action:\s*'ignored'/,
    );
  });

  it('UNKNOWN_EVENT_TYPE returns 400 (fails closed on unknown event_type)', () => {
    expect(CONTROLLER_SRC).toMatch(/'UNKNOWN_EVENT_TYPE'/);
    expect(CONTROLLER_SRC).toMatch(/res,\s*400,\s*'UNKNOWN_EVENT_TYPE'/);
  });

  it('status-aware dedup (HIGH-1): uploading row → 429, NOT already_processed', () => {
    expect(CONTROLLER_SRC).toMatch(/existing\.status === 'uploading'/);
    expect(CONTROLLER_SRC).toMatch(/'CLIP_INGEST_IN_PROGRESS'/);
    expect(CONTROLLER_SRC).toMatch(/Retry-After['"\s,]+,?\s*'300'/);
  });

  it('status-aware dedup (HIGH-1 + NH-7): lost row → DELETE then retry', () => {
    // Per Codex NH-7: the model enum has 'lost' (abandoned/stuck), not
    // 'failed'. Earlier code branched on 'failed' but the model would reject
    // that value at INSERT time → unreachable code. Fixed: lost is the
    // recoverable state.
    expect(CONTROLLER_SRC).toMatch(
      /existing\.status === 'lost'[\s\S]{0,500}DELETE FROM plaud_clips/,
    );
  });

  it('reuses Phase 3 writeClipToDisk (no bifurcation of storage path)', () => {
    expect(CONTROLLER_SRC).toMatch(/writeClipToDisk\(\s*userId,\s*insertedClipId,\s*ext,\s*audio\.bytes\s*\)/);
  });

  it('reuses Phase 3 audioProbeService imports', () => {
    expect(CONTROLLER_SRC).toMatch(/import\s*\{[\s\S]{0,200}probeFile[\s\S]{0,200}\}\s*from\s*['"][\s\S]+audioProbeService\.mjs['"]/);
    expect(CONTROLLER_SRC).toMatch(/detectSilence/);
    expect(CONTROLLER_SRC).toMatch(/ClipCorruptError/);
  });

  it('uses verifyWebhookRequest from Slice 5.2 (no inline sig logic)', () => {
    expect(CONTROLLER_SRC).toMatch(/import\s*\{[\s\S]{0,150}verifyWebhookRequest[\s\S]{0,150}\}\s*from\s*['"][\s\S]+plaudWebhookSignature\.mjs['"]/);
  });

  it('uses fetchAudioWithCaps from Slice 5.3 (no inline fetch logic)', () => {
    expect(CONTROLLER_SRC).toMatch(/import\s*\{[\s\S]{0,150}fetchAudioWithCaps[\s\S]{0,150}\}\s*from\s*['"][\s\S]+applaudAudioFetcher\.mjs['"]/);
  });

  it('temp dir is cleaned up via finally (no orphaned tmpdirs on probe failure)', () => {
    expect(CONTROLLER_SRC).toMatch(/finally\s*\{[\s\S]{0,200}rmFs\(\s*tmpDir/);
  });

  it('writes tmp file with mode 0o600 (secrets: not world-readable)', () => {
    expect(CONTROLLER_SRC).toMatch(/writeFile\([\s\S]{0,200}mode:\s*0o600/);
  });

  it('phase-C is wrapped in a transaction with commit + rollback', () => {
    expect(CONTROLLER_SRC).toMatch(/sequelize\.transaction\(\)/);
    expect(CONTROLLER_SRC).toMatch(/transaction\.commit\(\)/);
    expect(CONTROLLER_SRC).toMatch(/transaction\.rollback\(\)/);
  });

  it('top-level handler has try/catch that converts errors to 500 (no unhandled rejection)', () => {
    expect(CONTROLLER_SRC).toMatch(
      /export async function applaudWebhookHandler[\s\S]{0,1500}catch\s*\(\s*err\s*\)[\s\S]{0,200}'INTERNAL_ERROR'/,
    );
  });
});

// ─── utils/semaphore source-text locks ───
describe('Slice 5.4 — Semaphore source-text', () => {
  it('release function is idempotent (released flag prevents double-decrement)', () => {
    expect(SEMAPHORE_SRC).toMatch(/let released = false/);
    expect(SEMAPHORE_SRC).toMatch(/if \(released\) return/);
    expect(SEMAPHORE_SRC).toMatch(/released = true/);
  });
  it('tryAcquire returns null at capacity (caller must respond 429)', () => {
    expect(SEMAPHORE_SRC).toMatch(/return null/);
  });
});
