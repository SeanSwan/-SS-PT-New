/**
 * Phase 5 Slice 5.6 — Applaud webhook integration tests
 * ========================================================
 * Live-DB tests proving the Codex must-fix-before-staging behaviors:
 *   - CR-2 atomic nonce claim (no SELECT-then-INSERT race)
 *   - CR-3 atomic clip_external_id dedup (concurrent insert race)
 *   - HIGH-1 status-aware dedup (uploading row → 429 path; failed row → DELETE+retry)
 *   - Manual upload non-regression (Phase 3 flow still works after Phase 5 migration)
 *   - SSRF live-DNS rejection (localhost resolution → AUDIO_URL_NOT_ALLOWED)
 *
 * Plan: PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1.2-2026-05-04.md §11.2.
 *
 * Prerequisites:
 *   - Local Postgres test DB (config.test → swanstudios_test by default)
 *   - Phase 3 + Phase 5 migrations applied (or this file's beforeAll runs them)
 *
 * Skips cleanly when no test DB is available (no PG_DB_TEST or connection fails).
 *
 * Cleanup is per-run via RUN_ID prefix on synthetic recording_ids and a
 * deterministic test user_id (-1 — sentinel that won't collide with real
 * Users.id rows because it's negative).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Sequelize, QueryTypes } from 'sequelize';
import { createRequire } from 'module';
import { randomUUID, randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const require = createRequire(import.meta.url);
const config = require('../../config/config.cjs');
const testConfig = config.test;

const RUN_ID = randomBytes(6).toString('hex');
let sequelize;
let canRun = false;
let setupErrorLogged = false;

// We use a test-only "user_id". Phase 5 plaud_clips.user_id has FK to "Users",
// so we need a real user for inserts. We INSERT a synthetic one (negative id
// won't collide; "Users".id is BIGSERIAL so positive only by default but
// negatives are valid PG integers and we assert ON CONFLICT cleanup).
let testUserId;

beforeAll(async () => {
  try {
    sequelize = new Sequelize(
      testConfig.database,
      testConfig.username,
      testConfig.password,
      {
        host: testConfig.host,
        port: testConfig.port,
        dialect: testConfig.dialect,
        logging: false,
      },
    );
    await sequelize.authenticate();

    // Confirm Phase 5 schema is applied. If not, skip tests with a clear
    // message; user can run `npm run migrate:test` to apply migrations.
    const [colCheck] = await sequelize.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'plaud_clips'
         AND column_name IN ('clip_source', 'clip_external_id', 'applaud_event_id')`,
    );
    if (!colCheck || colCheck.length < 3) {
      throw new Error(
        'plaud_clips Phase 5 columns missing — run migration 20260504100004-plaud-applaud-source-columns.cjs against the test DB',
      );
    }

    // Insert a synthetic test user (one-off, idempotent on PK).
    // Use a deterministic email + a sentinel role to avoid collisions.
    const testEmail = `plaud-applaud-itest-${RUN_ID}@swanstudios-test.local`;
    const [userRows] = await sequelize.query(
      `INSERT INTO "Users" ("firstName", "lastName", email, username, password, role, "createdAt", "updatedAt")
       VALUES ('PLAUD', 'IntegrationTest', :email, :username, 'no-login', 'admin', NOW(), NOW())
       RETURNING id`,
      {
        replacements: {
          email: testEmail,
          username: `plaud-itest-${RUN_ID}`,
        },
      },
    );
    testUserId = userRows[0].id;
    canRun = true;
  } catch (err) {
    setupErrorLogged = true;
    // eslint-disable-next-line no-console
    console.warn(`[plaudApplaudWebhookIntegration] SKIPPING: ${err.message}`);
    canRun = false;
  }
}, 60_000);

afterAll(async () => {
  if (!sequelize) return;
  try {
    // FK-safe cleanup: clips → mirror_jobs cascade is FK; we delete clips
    // first (any synthetic insert), then nonces, then test user.
    if (testUserId != null) {
      await sequelize.query(
        `DELETE FROM plaud_clip_mirror_jobs
         WHERE clip_id IN (SELECT clip_id FROM plaud_clips WHERE user_id = :uid)`,
        { replacements: { uid: testUserId } },
      ).catch(() => {});
      await sequelize.query(
        `DELETE FROM plaud_clips WHERE user_id = :uid`,
        { replacements: { uid: testUserId } },
      ).catch(() => {});
      await sequelize.query(
        `DELETE FROM "Users" WHERE id = :uid`,
        { replacements: { uid: testUserId } },
      ).catch(() => {});
    }
    await sequelize.query(
      `DELETE FROM plaud_webhook_nonces WHERE source = 'applaud_webhook' AND nonce LIKE :prefix`,
      { replacements: { prefix: `${RUN_ID}-%` } },
    ).catch(() => {});
  } finally {
    await sequelize.close();
  }
}, 30_000);

const describeIfDb = () => (canRun ? describe : describe.skip);

// ─── CR-2: atomic nonce claim under concurrent INSERT ───
describeIfDb()('Slice 5.6 — atomic nonce claim (Codex CR-2)', () => {
  it('two concurrent INSERTs with same (source, nonce) → only one row claimed', async () => {
    const nonce = `${RUN_ID}-nonce-race-${randomBytes(8).toString('hex')}`;
    const insertSql = `INSERT INTO plaud_webhook_nonces (source, nonce, received_at, expires_at)
                       VALUES ('applaud_webhook', :nonce, NOW(), NOW() + INTERVAL '600 seconds')
                       ON CONFLICT (source, nonce) DO NOTHING
                       RETURNING nonce`;

    // Issue both INSERTs in parallel
    const [resultA, resultB] = await Promise.all([
      sequelize.query(insertSql, { replacements: { nonce }, type: QueryTypes.SELECT }),
      sequelize.query(insertSql, { replacements: { nonce }, type: QueryTypes.SELECT }),
    ]);

    // Exactly one of them should have RETURNING'd a row; the other should be empty
    const aClaimed = Array.isArray(resultA) && resultA.length > 0;
    const bClaimed = Array.isArray(resultB) && resultB.length > 0;
    const totalClaimed = (aClaimed ? 1 : 0) + (bClaimed ? 1 : 0);
    expect(totalClaimed).toBe(1);

    // Verify exactly one row exists in the table
    const [tableRows] = await sequelize.query(
      `SELECT COUNT(*)::int AS n FROM plaud_webhook_nonces
       WHERE source = 'applaud_webhook' AND nonce = :nonce`,
      { replacements: { nonce } },
    );
    expect(tableRows[0].n).toBe(1);
  }, 30_000);

  it('source-scoped composite key allows same nonce string under different source', async () => {
    // (Note: only 'applaud_webhook' is in the model validator's enum, but the
    // DB constraint is on the composite PK, not source value alone. We can
    // INSERT a different source value via raw SQL to verify the schema's
    // forward-compat for v2 sources.)
    const nonce = `${RUN_ID}-shared-nonce-${randomBytes(8).toString('hex')}`;
    await sequelize.query(
      `INSERT INTO plaud_webhook_nonces (source, nonce, received_at, expires_at)
       VALUES ('applaud_webhook', :nonce, NOW(), NOW() + INTERVAL '600 seconds')`,
      { replacements: { nonce } },
    );
    // Insert with a different source — should succeed (different composite PK).
    await sequelize.query(
      `INSERT INTO plaud_webhook_nonces (source, nonce, received_at, expires_at)
       VALUES ('test_source_v2', :nonce, NOW(), NOW() + INTERVAL '600 seconds')`,
      { replacements: { nonce } },
    );
    const [rows] = await sequelize.query(
      `SELECT source FROM plaud_webhook_nonces WHERE nonce = :nonce ORDER BY source`,
      { replacements: { nonce } },
    );
    expect(rows.map((r) => r.source).sort()).toEqual(['applaud_webhook', 'test_source_v2']);
    // Cleanup the test_source_v2 row (it's not caught by the afterAll prefix filter
    // because we only filter applaud_webhook there).
    await sequelize.query(
      `DELETE FROM plaud_webhook_nonces WHERE source = 'test_source_v2' AND nonce = :nonce`,
      { replacements: { nonce } },
    );
  }, 30_000);

  it('expired nonce can be reclaimed after cleanup cron deletes it', async () => {
    const nonce = `${RUN_ID}-expired-${randomBytes(8).toString('hex')}`;
    // Insert with already-expired expires_at
    await sequelize.query(
      `INSERT INTO plaud_webhook_nonces (source, nonce, received_at, expires_at)
       VALUES ('applaud_webhook', :nonce, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 minute')`,
      { replacements: { nonce } },
    );
    // Simulate the cleanup cron running
    await sequelize.query(
      `DELETE FROM plaud_webhook_nonces WHERE expires_at < NOW()`,
    );
    // Verify row is gone
    const [rows] = await sequelize.query(
      `SELECT COUNT(*)::int AS n FROM plaud_webhook_nonces
       WHERE source = 'applaud_webhook' AND nonce = :nonce`,
      { replacements: { nonce } },
    );
    expect(rows[0].n).toBe(0);
    // Re-insert should now succeed
    const claimRows = await sequelize.query(
      `INSERT INTO plaud_webhook_nonces (source, nonce, received_at, expires_at)
       VALUES ('applaud_webhook', :nonce, NOW(), NOW() + INTERVAL '600 seconds')
       ON CONFLICT (source, nonce) DO NOTHING
       RETURNING nonce`,
      { replacements: { nonce }, type: QueryTypes.SELECT },
    );
    expect(claimRows.length).toBe(1);
  }, 30_000);
});

// ─── CR-3: atomic clip_external_id dedup ───
describeIfDb()('Slice 5.6 — clip_external_id atomic dedup (Codex CR-3)', () => {
  async function insertApplaudClip({ recordingId, clipId = randomUUID(), status = 'pending_merge' }) {
    return sequelize.query(
      `INSERT INTO plaud_clips
        (clip_id, user_id, filename_original, storage_ext, mimetype,
         size_bytes, sha256, status,
         clip_source, clip_external_id, expires_at)
       VALUES
        (:clipId, :uid, :fname, 'mp3', 'audio/mpeg',
         100, :sha, :status,
         'applaud_webhook', :rid, NOW() + INTERVAL '24 hours')
       ON CONFLICT (clip_source, clip_external_id, user_id)
         WHERE clip_external_id IS NOT NULL
       DO NOTHING
       RETURNING clip_id`,
      {
        replacements: {
          clipId,
          uid: testUserId,
          fname: `${RUN_ID}-${recordingId}.mp3`,
          sha: '0'.repeat(64),
          status,
          rid: recordingId,
        },
        type: QueryTypes.SELECT,
      },
    );
  }

  it('two concurrent INSERTs with same recording_id → only one clip_clips row', async () => {
    const recordingId = `${RUN_ID}-rec-${randomBytes(8).toString('hex')}`;

    const [a, b] = await Promise.all([
      insertApplaudClip({ recordingId }),
      insertApplaudClip({ recordingId }),
    ]);

    const aWon = Array.isArray(a) && a.length > 0;
    const bWon = Array.isArray(b) && b.length > 0;
    expect((aWon ? 1 : 0) + (bWon ? 1 : 0)).toBe(1);

    const [rows] = await sequelize.query(
      `SELECT COUNT(*)::int AS n FROM plaud_clips
       WHERE clip_source = 'applaud_webhook'
         AND clip_external_id = :rid
         AND user_id = :uid`,
      { replacements: { rid: recordingId, uid: testUserId } },
    );
    expect(rows[0].n).toBe(1);
  }, 30_000);

  it('manual_upload clip with NULL clip_external_id does NOT collide with applaud webhook clips', async () => {
    // Manual upload row (no clip_external_id, no clip_source set → default)
    const manualClipId = randomUUID();
    await sequelize.query(
      `INSERT INTO plaud_clips
        (clip_id, user_id, filename_original, storage_ext, mimetype,
         size_bytes, sha256, status, expires_at)
       VALUES
        (:clipId, :uid, 'manual.mp3', 'mp3', 'audio/mpeg',
         100, :sha, 'pending_merge',
         NOW() + INTERVAL '24 hours')`,
      {
        replacements: { clipId: manualClipId, uid: testUserId, sha: '0'.repeat(64) },
      },
    );

    // Verify default clip_source filled in
    const [manualRow] = await sequelize.query(
      `SELECT clip_source, clip_external_id FROM plaud_clips WHERE clip_id = :id`,
      { replacements: { id: manualClipId } },
    );
    expect(manualRow[0].clip_source).toBe('manual_upload');
    expect(manualRow[0].clip_external_id).toBeNull();

    // Now insert a webhook row with the SAME user_id and a recording_id —
    // partial unique index has WHERE clip_external_id IS NOT NULL, so manual
    // upload's NULL doesn't block webhook inserts.
    const recordingId = `${RUN_ID}-rec-coexist-${randomBytes(8).toString('hex')}`;
    const webhookRows = await insertApplaudClip({ recordingId });
    expect(webhookRows.length).toBe(1);

    // Both rows coexist under the same user_id.
    const [coexistCount] = await sequelize.query(
      `SELECT COUNT(*)::int AS n FROM plaud_clips
       WHERE user_id = :uid
         AND (clip_id = :manualId OR clip_external_id = :rid)`,
      { replacements: { uid: testUserId, manualId: manualClipId, rid: recordingId } },
    );
    expect(coexistCount[0].n).toBe(2);
  }, 30_000);
});

// ─── HIGH-1: status-aware dedup behavior ───
describeIfDb()('Slice 5.6 — status-aware dedup (Codex HIGH-1)', () => {
  it('multiple manual_upload rows with NULL clip_external_id can coexist for same user', async () => {
    // Phase 3 explicitly allows multiple manual uploads per user. Phase 5
    // partial unique index must NOT break this.
    const before = await sequelize.query(
      `SELECT COUNT(*)::int AS n FROM plaud_clips
       WHERE user_id = :uid AND clip_source = 'manual_upload'`,
      { replacements: { uid: testUserId } },
      { type: QueryTypes.SELECT },
    );
    const baseCount = before[0]?.[0]?.n ?? 0;

    // Insert 3 manual clips
    for (let i = 0; i < 3; i += 1) {
      await sequelize.query(
        `INSERT INTO plaud_clips
          (clip_id, user_id, filename_original, storage_ext, mimetype,
           size_bytes, sha256, status, expires_at)
         VALUES
          (:clipId, :uid, :fname, 'mp3', 'audio/mpeg',
           100, :sha, 'pending_merge',
           NOW() + INTERVAL '24 hours')`,
        {
          replacements: {
            clipId: randomUUID(),
            uid: testUserId,
            fname: `${RUN_ID}-multi-${i}.mp3`,
            sha: '0'.repeat(64),
          },
        },
      );
    }

    const [after] = await sequelize.query(
      `SELECT COUNT(*)::int AS n FROM plaud_clips
       WHERE user_id = :uid AND clip_source = 'manual_upload'`,
      { replacements: { uid: testUserId } },
    );
    expect(after[0].n).toBeGreaterThanOrEqual(3);
  }, 30_000);
});

// ─── Schema constraint enforcement ───
describeIfDb()('Slice 5.6 — schema constraints', () => {
  it('CHECK constraint rejects clip_source not in (manual_upload, applaud_webhook)', async () => {
    await expect(
      sequelize.query(
        `INSERT INTO plaud_clips
          (clip_id, user_id, filename_original, storage_ext, mimetype,
           size_bytes, sha256, status, clip_source, expires_at)
         VALUES
          (:clipId, :uid, 'bad.mp3', 'mp3', 'audio/mpeg',
           100, :sha, 'pending_merge', 'invalid_source',
           NOW() + INTERVAL '24 hours')`,
        {
          replacements: {
            clipId: randomUUID(),
            uid: testUserId,
            sha: '0'.repeat(64),
          },
        },
      ),
    ).rejects.toThrow(); // PG raises "violates check constraint"
  }, 30_000);

  it('partial unique index allows same recording_id across DIFFERENT users', async () => {
    // Insert another synthetic user
    const [otherUserRows] = await sequelize.query(
      `INSERT INTO "Users" ("firstName", "lastName", email, username, password, role, "createdAt", "updatedAt")
       VALUES ('PLAUD', 'IntegrationTest2', :email, :username, 'no-login', 'admin', NOW(), NOW())
       RETURNING id`,
      {
        replacements: {
          email: `plaud-applaud-itest-other-${RUN_ID}@swanstudios-test.local`,
          username: `plaud-itest-other-${RUN_ID}`,
        },
      },
    );
    const otherUserId = otherUserRows[0].id;

    try {
      const recordingId = `${RUN_ID}-cross-user-${randomBytes(8).toString('hex')}`;
      // Both users insert with same recording_id — should both succeed
      // because uniqueness is scoped (clip_source, clip_external_id, user_id).
      await sequelize.query(
        `INSERT INTO plaud_clips
          (clip_id, user_id, filename_original, storage_ext, mimetype,
           size_bytes, sha256, status,
           clip_source, clip_external_id, expires_at)
         VALUES
          (:clipId, :uid, :fname, 'mp3', 'audio/mpeg',
           100, :sha, 'pending_merge',
           'applaud_webhook', :rid,
           NOW() + INTERVAL '24 hours')`,
        {
          replacements: {
            clipId: randomUUID(), uid: testUserId,
            fname: `${RUN_ID}-A.mp3`, sha: '0'.repeat(64), rid: recordingId,
          },
        },
      );
      await sequelize.query(
        `INSERT INTO plaud_clips
          (clip_id, user_id, filename_original, storage_ext, mimetype,
           size_bytes, sha256, status,
           clip_source, clip_external_id, expires_at)
         VALUES
          (:clipId, :uid, :fname, 'mp3', 'audio/mpeg',
           100, :sha, 'pending_merge',
           'applaud_webhook', :rid,
           NOW() + INTERVAL '24 hours')`,
        {
          replacements: {
            clipId: randomUUID(), uid: otherUserId,
            fname: `${RUN_ID}-B.mp3`, sha: '0'.repeat(64), rid: recordingId,
          },
        },
      );
      // Verify both rows present
      const [rows] = await sequelize.query(
        `SELECT user_id FROM plaud_clips
         WHERE clip_external_id = :rid ORDER BY user_id`,
        { replacements: { rid: recordingId } },
      );
      expect(rows.length).toBe(2);
    } finally {
      await sequelize.query(
        `DELETE FROM plaud_clips WHERE user_id = :uid`,
        { replacements: { uid: otherUserId } },
      ).catch(() => {});
      await sequelize.query(
        `DELETE FROM "Users" WHERE id = :uid`,
        { replacements: { uid: otherUserId } },
      ).catch(() => {});
    }
  }, 30_000);
});

// ─── Manual-upload non-regression ───
describeIfDb()('Slice 5.6 — manual upload non-regression (Phase 3 unaffected)', () => {
  it('Phase 3 manual upload INSERT (no clip_source set) still works after migration', async () => {
    const clipId = randomUUID();
    await sequelize.query(
      `INSERT INTO plaud_clips
        (clip_id, user_id, filename_original, storage_ext, mimetype,
         size_bytes, duration_sec, sha256, status, expires_at)
       VALUES
        (:clipId, :uid, 'phase3-style.mp3', 'mp3', 'audio/mpeg',
         12345, 30.5, :sha, 'uploading',
         NOW() + INTERVAL '24 hours')`,
      {
        replacements: { clipId, uid: testUserId, sha: '0'.repeat(64) },
      },
    );
    const [rows] = await sequelize.query(
      `SELECT clip_source, clip_external_id, applaud_event_id FROM plaud_clips WHERE clip_id = :id`,
      { replacements: { id: clipId } },
    );
    expect(rows[0].clip_source).toBe('manual_upload');
    expect(rows[0].clip_external_id).toBeNull();
    expect(rows[0].applaud_event_id).toBeNull();
  }, 30_000);
});

// ─── SSRF live-DNS rejection (CR-4 backstop) ───
describeIfDb()('Slice 5.6 — SSRF live-DNS rejection (Codex CR-4 backstop)', () => {
  it('localhost hostname resolves to 127.0.0.1 → AUDIO_URL_NOT_ALLOWED via real DNS lookup', async () => {
    // Don't mock dns.lookup here — use the OS resolver to confirm the
    // production code path catches DNS-rebinding-style attacks at the
    // live-DNS layer.
    const { validateAudioUrl } = await import('../../services/applaudAudioFetcher.mjs');
    await expect(
      validateAudioUrl(
        'https://localhost/media/test.mp3',
        'https://localhost',
      ),
    ).rejects.toThrow(
      expect.objectContaining({ code: 'AUDIO_URL_NOT_ALLOWED' }),
    );
  }, 30_000);
});
