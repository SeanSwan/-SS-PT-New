'use strict';

/**
 * ============================================================================
 * Creator video render pipeline — durable job queue + canonical asset table
 * ============================================================================
 *
 * WHY THIS EXISTS: the Content Studio previously accepted a generation request,
 * called a provider, received a provider job id, and returned it to a React
 * useState. No status route existed anywhere in the backend, so nothing could
 * ever redeem that id, and a page refresh destroyed it. Every test passed —
 * the defect was an ABSENCE, and test suites assert that present things behave.
 * That endpoint has been deleted. This is its replacement's foundation.
 *
 * WHAT THIS CREATES (all NEW tables — no existing table is altered or dropped):
 *   video_render_jobs   durable, leasable job queue (the P0; see LEASING below)
 *   media_assets        canonical asset record — the keystone that was missing.
 *                       Generated output previously lived only as a provider URL,
 *                       which expires. Assets evaporated.
 *   render_agents       enrolled workers. Tokens stored SHA-256 HASHED, never raw.
 *   service_credentials replaces writing provider keys into process.env at
 *                       runtime, which lost them on every Render restart and, with
 *                       more than one instance, left only ONE process holding a key.
 *
 * ── FK TARGETS: verified against backend/schema-snapshot.json, digest ee4f531114a54b90
 *
 *   "Users"           QUOTED, capital U. id is INTEGER.
 *                     A bare lowercase `users` table also exists in production as a
 *                     STALE DUPLICATE. Postgres folds unquoted identifiers to lower
 *                     case, so `REFERENCES Users(id)` — which LOOKS correct — resolves
 *                     to the dead table, succeeds silently, and binds to nothing real.
 *                     Every reference below is written quoted, deliberately.
 *   content_projects  NOT "content_studio_projects" (does not exist). id is UUID.
 *   "Exercises"       NOT "exercises" (does not exist). id is UUID.
 *
 *   An externally-authored blueprint for these tables got all three table names
 *   wrong AND typed project_id / exercise_id as INTEGER against UUID primary keys.
 *   This repo already carries UUID-INTEGER-TYPE-MISMATCH-FIX.cjs from the last time
 *   that happened. Hence raw SQL with explicit quoting rather than inferred names.
 *
 * ── LEASING: the actual hard part, and the reason a plain table is not enough.
 *   A worker claims exactly one job via FOR UPDATE SKIP LOCKED (see the partial
 *   index vrj_lease_idx). Its lease is extended by heartbeats, never by a wall-clock
 *   guess at render duration — a 30-minute render is fine under a 90-second lease
 *   provided heartbeats flow, and correctly reclaimed the moment they stop.
 *   Delivery is at-least-once and made harmless by design: r2_key is deterministic
 *   (jobs/{id}/source.mp4) so a re-render overwrites rather than duplicating, and
 *   media_assets.r2_key is UNIQUE so a duplicate completion cannot create a second row.
 *
 * ── REVERSIBILITY: down() drops only the four tables this migration created, in
 *   FK-dependency order. It touches no pre-existing table and destroys no
 *   pre-existing data. Dropping these tables does discard render history, which is
 *   regenerable; the underlying media in R2 is not deleted by this migration.
 *
 * Indexes are created non-concurrently ON PURPOSE: these tables are brand new and
 * empty, so index builds are instant and lock nothing that exists. CONCURRENTLY
 * would be required for an index on a populated table, and cannot run in a
 * transaction — which this migration deliberately uses.
 * ============================================================================
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();
    const run = (sql) => queryInterface.sequelize.query(sql, { transaction: t });

    try {
      // pgcrypto supplies gen_random_uuid(). Harmless if already present.
      await run(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

      // ─── render_agents ────────────────────────────────────────────────
      // Created first: video_render_jobs.leased_by references it.
      await run(`
        CREATE TABLE IF NOT EXISTS render_agents (
          id               VARCHAR(60) PRIMARY KEY,
          label            VARCHAR(120) NOT NULL,
          -- SHA-256 hex of the bearer token. The plaintext is shown once at
          -- enrolment and never persisted: a database dump must not yield a
          -- credential that can lease jobs or mint upload URLs.
          token_hash       CHAR(64) NOT NULL,
          capabilities     JSONB NOT NULL DEFAULT '[]'::jsonb,
          version          VARCHAR(20),
          max_concurrency  SMALLINT NOT NULL DEFAULT 1 CHECK (max_concurrency > 0),
          last_seen_at     TIMESTAMPTZ,
          revoked_at       TIMESTAMPTZ,
          created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);

      // ─── video_render_jobs ────────────────────────────────────────────
      await run(`
        CREATE TABLE IF NOT EXISTS video_render_jobs (
          id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

          -- "Users".id is INTEGER. Quoted target is load-bearing (see header).
          user_id               INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
          -- content_projects.id is UUID, not INTEGER.
          project_id            UUID REFERENCES content_projects(id) ON DELETE SET NULL,
          -- "Exercises".id is UUID, not INTEGER.
          exercise_id           UUID REFERENCES "Exercises"(id) ON DELETE SET NULL,

          -- Per-user idempotency: a double-clicked Generate must not bill twice
          -- or occupy the GPU twice.
          idempotency_key       VARCHAR(80) NOT NULL,

          -- 'preview' is the cheap first rung of the cost ladder: generate at low
          -- resolution (cents), approve the art direction, THEN promote to full
          -- resolution (dollars). Without it as a job KIND the ladder can only be
          -- faked in the UI, which means any other caller bypasses the single most
          -- valuable cost control in the system.
          kind                  VARCHAR(16) NOT NULL DEFAULT 'generate'
                                CHECK (kind IN ('preview','generate','transcode','upscale','interpolate')),

          -- Promotion link: a full-resolution render points at the preview it was
          -- approved from. Self-referential, nullable, ON DELETE SET NULL so deleting
          -- a preview never cascades away the finished asset derived from it.
          parent_job_id         UUID REFERENCES video_render_jobs(id) ON DELETE SET NULL,

          -- workflow_id + workflow_version make a render reproducible. Storing only
          -- a prompt string makes debugging a bad output archaeology.
          workflow_id           VARCHAR(60) NOT NULL,
          workflow_version      INTEGER NOT NULL DEFAULT 1,

          prompt                TEXT NOT NULL CHECK (char_length(prompt) <= 4000),

          -- REPRODUCIBILITY TRIO. prompt is what the human asked for; compiled_prompt
          -- is the exact string that reached the model after the prompt-brain expanded
          -- it. Without the compiled form, "regenerate last week's" is impossible and
          -- nobody can answer WHY an output looked the way it did. brain_version lets
          -- two compiler generations be A/B compared. Backfilling these is impossible —
          -- the information is gone the moment the render completes.
          compiled_prompt       TEXT,
          brain_version         VARCHAR(40),
          negative_prompt       TEXT CHECK (negative_prompt IS NULL OR char_length(negative_prompt) <= 2000),
          params                JSONB NOT NULL DEFAULT '{}'::jsonb,

          -- A job is only offered to an agent whose declared capabilities are a
          -- superset of this (JSONB containment). Keeps a t2v-only worker from
          -- claiming an image-to-video job.
          required_capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,

          status                VARCHAR(12) NOT NULL DEFAULT 'queued'
                                CHECK (status IN ('queued','leased','rendering','uploading','ready','failed','cancelled')),
          -- Cancellation is a FLAG, not a state: the admin's click must never block
          -- on a worker that may be mid-render or offline. The agent observes it on
          -- its next heartbeat and converges.
          cancel_requested      BOOLEAN NOT NULL DEFAULT FALSE,

          priority              INTEGER NOT NULL DEFAULT 100,
          attempts              INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
          max_attempts          INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
          run_after             TIMESTAMPTZ NOT NULL DEFAULT now(),

          leased_by             VARCHAR(60) REFERENCES render_agents(id) ON DELETE SET NULL,
          leased_at             TIMESTAMPTZ,
          lease_expires_at      TIMESTAMPTZ,
          heartbeat_at          TIMESTAMPTZ,

          progress              SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
          progress_message      VARCHAR(200),

          -- Sanitized only. Never a stack trace, never provider internals.
          error_code            VARCHAR(60),
          error_message         VARCHAR(500),

          -- Deterministic: jobs/{id}/source.mp4. Re-delivery overwrites instead of
          -- duplicating, which is what makes at-least-once safe.
          r2_key                VARCHAR(500),
          poster_r2_key         VARCHAR(500),
          duration_ms           INTEGER,
          width                 INTEGER,
          height                INTEGER,
          size_bytes            BIGINT,
          seed_used             BIGINT,
          agent_version         VARCHAR(20),
          render_timeout_sec    INTEGER NOT NULL DEFAULT 1800 CHECK (render_timeout_sec > 0),

          created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
          started_at            TIMESTAMPTZ,
          finished_at           TIMESTAMPTZ,

          CONSTRAINT video_render_jobs_user_idem_uniq UNIQUE (user_id, idempotency_key)
        );
      `);

      // Partial index over exactly the rows the lease query scans.
      await run(`
        CREATE INDEX IF NOT EXISTS vrj_lease_idx
          ON video_render_jobs (priority, run_after, created_at)
          WHERE status = 'queued';
      `);
      // The sweeper's scan: leased/rendering/uploading rows whose lease has lapsed.
      await run(`
        CREATE INDEX IF NOT EXISTS vrj_sweep_idx
          ON video_render_jobs (lease_expires_at)
          WHERE status IN ('leased','rendering','uploading');
      `);
      await run(`
        CREATE INDEX IF NOT EXISTS vrj_user_idx
          ON video_render_jobs (user_id, created_at DESC);
      `);
      await run(`
        CREATE INDEX IF NOT EXISTS vrj_exercise_idx
          ON video_render_jobs (exercise_id)
          WHERE exercise_id IS NOT NULL;
      `);

      // ─── media_assets ─────────────────────────────────────────────────
      await run(`
        CREATE TABLE IF NOT EXISTS media_assets (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          owner_user_id   INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
          job_id          UUID REFERENCES video_render_jobs(id) ON DELETE SET NULL,

          kind            VARCHAR(10) NOT NULL CHECK (kind IN ('video','image','audio')),
          source          VARCHAR(10) NOT NULL CHECK (source IN ('generated','uploaded','agent')),

          -- UNIQUE is what makes a duplicate completion idempotent rather than
          -- creating a second row for the same bytes.
          r2_key          VARCHAR(500) NOT NULL UNIQUE,
          poster_r2_key   VARCHAR(500),
          mime            VARCHAR(80) NOT NULL,
          width           INTEGER,
          height          INTEGER,
          duration_ms     INTEGER,
          size_bytes      BIGINT,

          exercise_id     UUID REFERENCES "Exercises"(id) ON DELETE SET NULL,
          project_id      UUID REFERENCES content_projects(id) ON DELETE SET NULL,

          -- Coverage counts only 'approved' and beyond, so a raw generation cannot
          -- silently mark an exercise as covered.
          approval_status VARCHAR(10) NOT NULL DEFAULT 'draft'
                          CHECK (approval_status IN ('draft','approved','published')),
          tags            JSONB NOT NULL DEFAULT '[]'::jsonb,

          -- Soft delete: the R2 object outlives the row, so a hard delete would
          -- orphan bytes that still cost money.
          deleted_at      TIMESTAMPTZ,
          created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);

      await run(`
        CREATE INDEX IF NOT EXISTS ma_owner_idx
          ON media_assets (owner_user_id, created_at DESC)
          WHERE deleted_at IS NULL;
      `);
      await run(`
        CREATE INDEX IF NOT EXISTS ma_exercise_idx
          ON media_assets (exercise_id)
          WHERE exercise_id IS NOT NULL AND deleted_at IS NULL;
      `);

      // ─── service_credentials ──────────────────────────────────────────
      // Ciphertext only. The encryption key lives in the real environment, never
      // in this table, so a database dump alone yields nothing usable.
      await run(`
        CREATE TABLE IF NOT EXISTS service_credentials (
          service      VARCHAR(40) PRIMARY KEY,
          ciphertext   BYTEA NOT NULL,
          updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  /**
   * Drops ONLY the four tables created above, in FK-dependency order:
   * media_assets -> video_render_jobs -> render_agents. No pre-existing table is
   * touched. pgcrypto is deliberately NOT dropped — other things may rely on it,
   * and CREATE EXTENSION IF NOT EXISTS was idempotent on the way in.
   */
  async down(queryInterface) {
    const t = await queryInterface.sequelize.transaction();
    const run = (sql) => queryInterface.sequelize.query(sql, { transaction: t });

    try {
      await run(`DROP TABLE IF EXISTS service_credentials;`);
      await run(`DROP TABLE IF EXISTS media_assets;`);
      await run(`DROP TABLE IF EXISTS video_render_jobs;`);
      await run(`DROP TABLE IF EXISTS render_agents;`);
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },
};