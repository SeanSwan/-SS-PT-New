/**
 * Phase 5 Slice 5.1 — Schema-drift integration test
 * ====================================================
 * Codex-required (Rule 58 + Phase 5 v1.2 §11.3 + ICR plan §13).
 *
 * Verifies the real Postgres schema matches the v1.2 plan:
 *   - 3 new plaud_clips columns with correct types/nullability/defaults
 *   - clip_source CHECK constraint enforces the enum
 *   - idx_plaud_clips_external_id_source exists with WHERE clip_external_id IS NOT NULL
 *   - plaud_webhook_nonces table exists with composite PK (source, nonce)
 *   - idx_plaud_webhook_nonces_expires_at exists
 *   - PlaudClip and PlaudWebhookNonce model field declarations match DB columns
 *
 * Safety: this test READS from the schema only. It does NOT mutate data
 * or run the migration. It is safe to run against production (the schema
 * introspection queries cannot affect application data). The migration
 * up/down round-trip Codex requested is a separate runbook step that must
 * be executed against a dedicated test DB; running migrate:undo against
 * production DB would be destructive (CLAUDE.md: "Local dev uses production DB").
 *
 * Run gating:
 *   - Skipped entirely if DATABASE_URL is not set (offline / CI without DB).
 *   - Otherwise runs READ-ONLY schema introspection against whatever DB
 *     DATABASE_URL points at. No data is mutated.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npx vitest run tests/integration/plaudApplaudSchemaDrift.test.mjs
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Sequelize } from 'sequelize';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO = resolve(__dirname, '../../..');

const DATABASE_URL = process.env.DATABASE_URL;
const HAS_DB = Boolean(DATABASE_URL);

// Skip the entire suite cleanly if no DB is configured.
const describeIfDb = HAS_DB ? describe : describe.skip;

let sequelize;

beforeAll(async () => {
  if (!HAS_DB) return;
  sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: DATABASE_URL.includes('render.com')
        ? { require: true, rejectUnauthorized: false }
        : false,
    },
  });
  await sequelize.authenticate();
});

afterAll(async () => {
  if (sequelize) {
    await sequelize.close();
  }
});

describeIfDb('Slice 5.1 — plaud_clips column introspection', () => {
  it('clip_source column exists with VARCHAR(32) NOT NULL DEFAULT manual_upload', async () => {
    const [rows] = await sequelize.query(
      `SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'plaud_clips'
         AND column_name = 'clip_source'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].data_type).toBe('character varying');
    expect(rows[0].character_maximum_length).toBe(32);
    expect(rows[0].is_nullable).toBe('NO');
    // Default may be wrapped as 'manual_upload'::character varying
    expect(rows[0].column_default).toMatch(/'manual_upload'/);
  });

  it('clip_external_id column exists nullable VARCHAR(255)', async () => {
    const [rows] = await sequelize.query(
      `SELECT column_name, data_type, character_maximum_length, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'plaud_clips'
         AND column_name = 'clip_external_id'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].data_type).toBe('character varying');
    expect(rows[0].character_maximum_length).toBe(255);
    expect(rows[0].is_nullable).toBe('YES');
  });

  it('applaud_event_id column exists nullable VARCHAR(255)', async () => {
    const [rows] = await sequelize.query(
      `SELECT column_name, data_type, character_maximum_length, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'plaud_clips'
         AND column_name = 'applaud_event_id'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].data_type).toBe('character varying');
    expect(rows[0].character_maximum_length).toBe(255);
    expect(rows[0].is_nullable).toBe('YES');
  });

  it('clip_source CHECK constraint enforces enum (manual_upload | applaud_webhook)', async () => {
    const [rows] = await sequelize.query(
      `SELECT pg_get_constraintdef(oid) AS def
       FROM pg_constraint
       WHERE conrelid = 'public.plaud_clips'::regclass
         AND contype = 'c'
         AND pg_get_constraintdef(oid) LIKE '%clip_source%'`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const def = rows.map((r) => r.def).join(' ');
    expect(def).toMatch(/manual_upload/);
    expect(def).toMatch(/applaud_webhook/);
  });
});

describeIfDb('Slice 5.1 — plaud_clips index introspection', () => {
  it('idx_plaud_clips_external_id_source partial UNIQUE index exists', async () => {
    const [rows] = await sequelize.query(
      `SELECT indexname, indexdef
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename = 'plaud_clips'
         AND indexname = 'idx_plaud_clips_external_id_source'`,
    );
    expect(rows).toHaveLength(1);
    const def = rows[0].indexdef;
    // Must be UNIQUE
    expect(def).toMatch(/UNIQUE INDEX/);
    // Must include the three composite columns
    expect(def).toMatch(/clip_source/);
    expect(def).toMatch(/clip_external_id/);
    expect(def).toMatch(/user_id/);
    // Must be partial — WHERE clip_external_id IS NOT NULL
    // (Critical: otherwise it would collide with all NULL-external-id manual upload rows)
    expect(def).toMatch(/WHERE.*clip_external_id IS NOT NULL/i);
  });
});

describeIfDb('Slice 5.1 — plaud_webhook_nonces table introspection', () => {
  it('plaud_webhook_nonces table exists', async () => {
    const [rows] = await sequelize.query(
      `SELECT to_regclass('public.plaud_webhook_nonces')::text AS exists`,
    );
    expect(rows[0].exists).toBe('plaud_webhook_nonces');
  });

  it('has composite primary key (source, nonce) — Codex CR-2', async () => {
    const [rows] = await sequelize.query(
      `SELECT a.attname AS column_name, i.indisprimary
       FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
       WHERE i.indrelid = 'public.plaud_webhook_nonces'::regclass
         AND i.indisprimary = true
       ORDER BY array_position(i.indkey::int[], a.attnum::int)`,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].column_name).toBe('source');
    expect(rows[1].column_name).toBe('nonce');
  });

  it('source column is VARCHAR(32) NOT NULL', async () => {
    const [rows] = await sequelize.query(
      `SELECT data_type, character_maximum_length, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'plaud_webhook_nonces'
         AND column_name = 'source'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].data_type).toBe('character varying');
    expect(rows[0].character_maximum_length).toBe(32);
    expect(rows[0].is_nullable).toBe('NO');
  });

  it('nonce column is VARCHAR(64) NOT NULL', async () => {
    const [rows] = await sequelize.query(
      `SELECT data_type, character_maximum_length, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'plaud_webhook_nonces'
         AND column_name = 'nonce'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].data_type).toBe('character varying');
    expect(rows[0].character_maximum_length).toBe(64);
    expect(rows[0].is_nullable).toBe('NO');
  });

  it('expires_at column is TIMESTAMPTZ NOT NULL', async () => {
    const [rows] = await sequelize.query(
      `SELECT data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'plaud_webhook_nonces'
         AND column_name = 'expires_at'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].data_type).toBe('timestamp with time zone');
    expect(rows[0].is_nullable).toBe('NO');
  });

  it('idx_plaud_webhook_nonces_expires_at index exists for cleanup cron', async () => {
    const [rows] = await sequelize.query(
      `SELECT indexname, indexdef
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename = 'plaud_webhook_nonces'
         AND indexname = 'idx_plaud_webhook_nonces_expires_at'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].indexdef).toMatch(/expires_at/);
  });
});

describeIfDb('Slice 5.1 — model-to-column mapping (Rule 58)', () => {
  it('PlaudClip model declares clipSource → clip_source mapping', async () => {
    const src = readFileSync(resolve(REPO, 'backend/models/PlaudClip.mjs'), 'utf8');
    expect(src).toMatch(/clipSource:\s*\{[\s\S]{0,200}field:\s*'clip_source'/);
    // Verify the mapped column actually exists in DB
    const [rows] = await sequelize.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'plaud_clips'
         AND column_name = 'clip_source'`,
    );
    expect(rows).toHaveLength(1);
  });

  it('PlaudClip model declares clipExternalId → clip_external_id mapping', async () => {
    const src = readFileSync(resolve(REPO, 'backend/models/PlaudClip.mjs'), 'utf8');
    expect(src).toMatch(/clipExternalId:\s*\{[\s\S]{0,200}field:\s*'clip_external_id'/);
    const [rows] = await sequelize.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'plaud_clips'
         AND column_name = 'clip_external_id'`,
    );
    expect(rows).toHaveLength(1);
  });

  it('PlaudClip model declares applaudEventId → applaud_event_id mapping', async () => {
    const src = readFileSync(resolve(REPO, 'backend/models/PlaudClip.mjs'), 'utf8');
    expect(src).toMatch(/applaudEventId:\s*\{[\s\S]{0,200}field:\s*'applaud_event_id'/);
    const [rows] = await sequelize.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'plaud_clips'
         AND column_name = 'applaud_event_id'`,
    );
    expect(rows).toHaveLength(1);
  });

  it('PlaudWebhookNonce model receivedAt → received_at mapping resolves in DB', async () => {
    const src = readFileSync(resolve(REPO, 'backend/models/PlaudWebhookNonce.mjs'), 'utf8');
    expect(src).toMatch(/receivedAt:[\s\S]{0,200}field:\s*'received_at'/);
    const [rows] = await sequelize.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'plaud_webhook_nonces'
         AND column_name = 'received_at'`,
    );
    expect(rows).toHaveLength(1);
  });
});

describeIfDb('Slice 5.1 — non-regression of existing Phase 3 schema', () => {
  it('plaud_clips still has all Phase 3 columns (no breakage from Phase 5 additions)', async () => {
    const [rows] = await sequelize.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'plaud_clips'`,
    );
    const cols = rows.map((r) => r.column_name);
    // Phase 3 essentials
    for (const col of [
      'clip_id', 'user_id', 'filename_original', 'storage_ext', 'mimetype',
      'size_bytes', 'sha256', 'status', 'r2_mirror_status', 'uploaded_at',
      'expires_at',
    ]) {
      expect(cols).toContain(col);
    }
  });

  it('existing rows default-backfill clip_source = manual_upload (zero-impact additive migration)', async () => {
    // This is read-only: just confirms no rows have NULL clip_source.
    // (It's a NOT NULL column with DEFAULT, so this should always be true.)
    const [rows] = await sequelize.query(
      `SELECT COUNT(*) AS null_count FROM plaud_clips WHERE clip_source IS NULL`,
    );
    expect(Number(rows[0].null_count)).toBe(0);
  });
});
