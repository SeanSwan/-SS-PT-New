/**
 * Phase 3 Slice 3.1 — DB foundation regression locks
 * ====================================================
 * Source-text locks for the 4 PLAUD migrations + 4 Sequelize models. Same
 * pattern as the Phase 2 chart-truth locks: cheap, deterministic, lock the
 * design choices that survived 5 rounds of Codex review against accidental
 * regression.
 *
 * Plan: docs/ai-workflow/AI-HANDOFF/PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md
 *
 * What this test file locks:
 *   1. plaud_clips schema doesn't reintroduce the EXCLUDE constraint that
 *      Codex Round 2 CRIT #1 caught (would block 2+ pending clips per user)
 *   2. plaud_clips status enum includes 'uploading' (Round 3 HIGH #2 fix)
 *   3. plaud_merge_requests uses single combined payload_cipher (Round 2
 *      CRIT #2: not the original two-cipher-one-IV unsafe design)
 *   4. plaud_merge_requests has 'processing' status (Round 2 HIGH #1
 *      browser-close failsafe anchor)
 *   5. plaud_merge_requests.approved_workout_form_id is UUID (schema
 *      preflight 2026-05-04 caught this drift vs the v3.3 plan that
 *      had INTEGER, by reading the actual DailyWorkoutForm model)
 *   6. plaud_clip_mirror_jobs has UNIQUE(clip_id) (Round 2 MEDIUM #3)
 *   7. plaud_clip_mirror_jobs status state machine includes
 *      'failed_retryable' (Round 2 CRIT #3)
 *   8. plaud_merge_locks has user_id PRIMARY KEY (one lock per user) and
 *      job_id NOT NULL (atomic takeover key)
 *   9. All 4 Sequelize models exist and register in associations.mjs
 *  10. FK target tables/columns match the schema-preflight findings
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO = resolve(__dirname, '../../..');

function readBackend(rel) {
  return readFileSync(resolve(REPO, 'backend', rel), 'utf8');
}

const MIGRATIONS_DIR = resolve(REPO, 'backend/migrations');
function findMigration(substr) {
  const file = readdirSync(MIGRATIONS_DIR).find(f => f.includes(substr));
  if (!file) throw new Error(`migration containing "${substr}" not found in ${MIGRATIONS_DIR}`);
  return readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
}

describe('Slice 3.1 — plaud_clips migration', () => {
  const src = findMigration('create-plaud-clips');

  it('does NOT reintroduce the EXCLUDE constraint that blocks 2+ pending clips per user (Codex Round 2 CRIT #1)', () => {
    expect(src).not.toMatch(/EXCLUDE\s+USING\s+btree\s*\(\s*user_id/i);
  });

  it('status enum includes uploading (Codex Round 3 HIGH #2 — two-phase upload)', () => {
    expect(src).toMatch(/CHECK\s*\(\s*status\s+IN[\s\S]{0,80}'uploading'/);
  });

  it('status enum covers all 6 documented states', () => {
    for (const state of ['uploading', 'pending_merge', 'merged', 'expired', 'deleted', 'lost']) {
      expect(src).toMatch(new RegExp(`'${state}'`));
    }
  });

  it('r2_mirror_status enum includes failed_retryable (Codex Round 2 CRIT #3)', () => {
    expect(src).toMatch(/'failed_retryable'/);
  });

  it('FK target is "Users" (PascalCase) per CLAUDE.md gotcha', () => {
    expect(src).toMatch(/REFERENCES\s+"Users"\s*\(\s*id\s*\)/);
  });

  it('partial index on (user_id, status, uploaded_at) is present', () => {
    expect(src).toMatch(/CREATE INDEX[\s\S]{0,200}plaud_clips[\s\S]{0,200}WHERE\s+deleted_at\s+IS\s+NULL/);
  });
});

describe('Slice 3.1 — plaud_merge_requests migration', () => {
  const src = findMigration('create-plaud-merge-requests');

  it('uses single combined payload_cipher (NOT the unsafe two-cipher-one-IV design — Codex Round 2 CRIT #2)', () => {
    expect(src).toMatch(/payload_cipher\s+BYTEA/);
    expect(src).toMatch(/payload_iv\s+BYTEA/);
    expect(src).toMatch(/payload_tag\s+BYTEA/);
    // The old unsafe design had transcript_cipher + parsed_workout_cipher with one shared IV/tag.
    // Locking against accidental reintroduction.
    expect(src).not.toMatch(/transcript_cipher\s+BYTEA/);
    expect(src).not.toMatch(/parsed_workout_cipher\s+BYTEA/);
  });

  it('cipher_key_id column exists for key rotation', () => {
    expect(src).toMatch(/cipher_key_id\s+VARCHAR/);
  });

  it("status enum includes processing (Codex Round 2 HIGH #1 — browser-close failsafe)", () => {
    expect(src).toMatch(/CHECK\s*\(\s*status\s+IN[\s\S]{0,160}'processing'/);
  });

  it('status enum covers all 6 documented states', () => {
    for (const state of ['processing', 'completed', 'failed', 'approved', 'discarded', 'expired']) {
      expect(src).toMatch(new RegExp(`'${state}'`));
    }
  });

  it('approved_workout_form_id is UUID (schema preflight 2026-05-04 — not INTEGER)', () => {
    expect(src).toMatch(/approved_workout_form_id\s+UUID\s+REFERENCES\s+daily_workout_forms\s*\(\s*id\s*\)/);
    // Lock against accidental drift back to INTEGER or "DailyWorkoutForms" PascalCase.
    expect(src).not.toMatch(/approved_workout_form_id\s+INTEGER/);
    expect(src).not.toMatch(/REFERENCES\s+"DailyWorkoutForms"/);
  });

  it('FK to Users uses PascalCase quoted', () => {
    expect(src).toMatch(/user_id[^,]*REFERENCES\s+"Users"/);
    expect(src).toMatch(/client_id[^,]*REFERENCES\s+"Users"/);
  });
});

describe('Slice 3.1 — plaud_clip_mirror_jobs migration', () => {
  const src = findMigration('create-plaud-clip-mirror-jobs');

  it('clip_id is UNIQUE (Codex Round 2 MEDIUM #3 — no duplicate jobs per clip)', () => {
    expect(src).toMatch(/clip_id\s+UUID\s+NOT\s+NULL\s+UNIQUE/);
  });

  it('status enum includes failed_retryable (Codex Round 2 CRIT #3 fix)', () => {
    expect(src).toMatch(/'failed_retryable'/);
  });

  it('status enum covers all 5 documented states', () => {
    for (const state of ['pending', 'in_flight', 'mirrored', 'failed_retryable', 'failed_terminal']) {
      expect(src).toMatch(new RegExp(`'${state}'`));
    }
  });

  it('partial index on next_retry_at filters to retryable statuses', () => {
    expect(src).toMatch(/WHERE\s+status\s+IN\s*\(\s*'pending'\s*,\s*'failed_retryable'\s*\)/);
  });
});

describe('Slice 3.1 — plaud_merge_locks migration', () => {
  const src = findMigration('create-plaud-merge-locks');

  it('user_id is PRIMARY KEY (one lock per user — atomic acquire/takeover)', () => {
    expect(src).toMatch(/user_id\s+INTEGER\s+PRIMARY\s+KEY\s+REFERENCES\s+"Users"/);
  });

  it('job_id is NOT NULL (atomic takeover requires job_id to identify holder)', () => {
    expect(src).toMatch(/job_id\s+UUID\s+NOT\s+NULL/);
  });

  it('locked_until has a default of NOW() + 15 minutes', () => {
    expect(src).toMatch(/locked_until[\s\S]{0,160}DEFAULT\s*\(\s*NOW\(\)\s*\+\s*INTERVAL\s+'15 minutes'/);
  });
});

describe('Slice 3.1 — Sequelize models', () => {
  it('PlaudClip model file exists and exports default', () => {
    const src = readBackend('models/PlaudClip.mjs');
    expect(src).toMatch(/class\s+PlaudClip\s+extends\s+Model/);
    expect(src).toMatch(/export\s+default\s+PlaudClip/);
    expect(src).toMatch(/tableName:\s*'plaud_clips'/);
  });

  it('PlaudMergeRequest model file exists and exports default', () => {
    const src = readBackend('models/PlaudMergeRequest.mjs');
    expect(src).toMatch(/class\s+PlaudMergeRequest\s+extends\s+Model/);
    expect(src).toMatch(/export\s+default\s+PlaudMergeRequest/);
    expect(src).toMatch(/tableName:\s*'plaud_merge_requests'/);
  });

  it('PlaudClipMirrorJob model file exists and exports default', () => {
    const src = readBackend('models/PlaudClipMirrorJob.mjs');
    expect(src).toMatch(/class\s+PlaudClipMirrorJob\s+extends\s+Model/);
    expect(src).toMatch(/export\s+default\s+PlaudClipMirrorJob/);
    expect(src).toMatch(/tableName:\s*'plaud_clip_mirror_jobs'/);
  });

  it('PlaudMergeLock model file exists and exports default', () => {
    const src = readBackend('models/PlaudMergeLock.mjs');
    expect(src).toMatch(/class\s+PlaudMergeLock\s+extends\s+Model/);
    expect(src).toMatch(/export\s+default\s+PlaudMergeLock/);
    expect(src).toMatch(/tableName:\s*'plaud_merge_locks'/);
  });

  it('all 4 PLAUD models registered in associations.mjs return blocks', () => {
    const src = readBackend('models/associations.mjs');
    for (const m of ['PlaudClip', 'PlaudMergeRequest', 'PlaudClipMirrorJob', 'PlaudMergeLock']) {
      expect(src).toMatch(new RegExp(`\\b${m}\\b`));
    }
  });
});

describe('Slice 3.1 — ffmpeg/ffprobe smoke script', () => {
  it('script file exists and probes both ffmpeg and ffprobe', () => {
    const src = readBackend('scripts/plaud-ffmpeg-smoke.mjs');
    expect(src).toMatch(/probe\(['"]?ffmpeg['"]?\)|probe\(\s*ffmpegPath\s*\)/);
    expect(src).toMatch(/probe\(['"]?ffprobe['"]?\)|probe\(\s*ffprobePath\s*\)/);
  });

  it('respects PLAUD_FFMPEG_PATH and PLAUD_FFPROBE_PATH env overrides', () => {
    const src = readBackend('scripts/plaud-ffmpeg-smoke.mjs');
    expect(src).toMatch(/process\.env\.PLAUD_FFMPEG_PATH/);
    expect(src).toMatch(/process\.env\.PLAUD_FFPROBE_PATH/);
  });

  it('exits non-zero when binaries are missing (deploy gate)', () => {
    const src = readBackend('scripts/plaud-ffmpeg-smoke.mjs');
    expect(src).toMatch(/process\.exit\(2\)/);  // ffmpeg missing
    expect(src).toMatch(/process\.exit\(3\)/);  // ffprobe missing
    expect(src).toMatch(/process\.exit\(4\)/);  // both missing
  });
});
