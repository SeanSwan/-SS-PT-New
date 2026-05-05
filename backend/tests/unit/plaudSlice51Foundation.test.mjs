/**
 * Phase 5 Slice 5.1 — DB foundation source-text regression locks
 * ================================================================
 * Same pattern as plaudSlice31Foundation.test.mjs: cheap, deterministic
 * shape locks on the migration source + Sequelize model declarations.
 *
 * Plan: PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1.2-2026-05-04.md
 *
 * What this file locks:
 *   1. Migration adds the 3 plaud_clips columns with correct types/defaults
 *   2. Migration adds CHECK constraint on clip_source enum
 *   3. Migration adds the partial unique index for atomic ON CONFLICT (CR-3)
 *   4. Migration creates plaud_webhook_nonces with composite PK (source, nonce) — CR-2
 *   5. Migration adds idx_plaud_webhook_nonces_expires_at
 *   6. Migration is wrapped in a transaction (matches Slice 3.1 convention)
 *   7. Migration is idempotent (information_schema check before ALTER)
 *   8. Down migration drops everything in reverse-dependency order
 *   9. PlaudClip model exposes clipSource / clipExternalId / applaudEventId
 *      with correct field mappings (snake_case in DB, camelCase in JS)
 *  10. PlaudClip clipSource validator enforces the same enum as the migration
 *  11. PlaudWebhookNonce model exists with composite primary key
 *  12. PlaudWebhookNonce uses timestamps: false (matches plaud_merge_locks)
 *  13. associations.mjs imports + destructures + returns PlaudWebhookNonce
 *  14. plaudCronJobs.mjs registers the nonce-cleanup task on the 60s schedule
 *  15. nonce cleanup query references the index column (expires_at)
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
  const file = readdirSync(MIGRATIONS_DIR).find((f) => f.includes(substr));
  if (!file) throw new Error(`migration containing "${substr}" not found`);
  return readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
}

describe('Slice 5.1 — Applaud source-columns migration', () => {
  const src = findMigration('plaud-applaud-source-columns');

  it('exists with the expected timestamp-prefixed name', () => {
    const file = readdirSync(MIGRATIONS_DIR).find((f) =>
      f.includes('plaud-applaud-source-columns'),
    );
    expect(file).toMatch(/^20260504\d{6}-plaud-applaud-source-columns\.cjs$/);
  });

  it('is wrapped in a transaction (matches Slice 3.1 convention)', () => {
    expect(src).toMatch(/queryInterface\.sequelize\.transaction\(\)/);
    expect(src).toMatch(/transaction\.commit\(\)/);
    expect(src).toMatch(/transaction\.rollback\(\)/);
  });

  it('is idempotent — checks information_schema before ALTER', () => {
    expect(src).toMatch(/information_schema\.columns/);
    expect(src).toMatch(/to_regclass\('public\.plaud_webhook_nonces'\)/);
  });

  it('adds clip_source with enum CHECK and default manual_upload', () => {
    expect(src).toMatch(/ADD COLUMN clip_source/);
    expect(src).toMatch(/DEFAULT 'manual_upload'/);
    expect(src).toMatch(/CHECK \(clip_source IN \('manual_upload', 'applaud_webhook'\)\)/);
  });

  it('adds clip_external_id as nullable VARCHAR(255)', () => {
    expect(src).toMatch(/ADD COLUMN clip_external_id VARCHAR\(255\) NULL/);
  });

  it('adds applaud_event_id as nullable VARCHAR(255)', () => {
    expect(src).toMatch(/ADD COLUMN applaud_event_id VARCHAR\(255\) NULL/);
  });

  it('creates partial UNIQUE index for atomic ON CONFLICT dedup (Codex CR-3)', () => {
    // Must include WHERE clip_external_id IS NOT NULL — otherwise it would
    // collide with all the manual_upload rows that have NULL external_id.
    expect(src).toMatch(
      /CREATE UNIQUE INDEX idx_plaud_clips_external_id_source[\s\S]{0,300}WHERE clip_external_id IS NOT NULL/,
    );
    // Index must include all three columns in the right order for the
    // composite uniqueness pattern the webhook handler relies on.
    expect(src).toMatch(
      /idx_plaud_clips_external_id_source[\s\S]{0,200}\(clip_source, clip_external_id, user_id\)/,
    );
  });

  it('creates plaud_webhook_nonces with composite PK (source, nonce) — Codex CR-2', () => {
    expect(src).toMatch(/CREATE TABLE plaud_webhook_nonces/);
    expect(src).toMatch(/PRIMARY KEY \(source, nonce\)/);
  });

  it('plaud_webhook_nonces has expires_at NOT NULL column', () => {
    expect(src).toMatch(/expires_at\s+TIMESTAMPTZ\s+NOT NULL/);
  });

  it('creates idx_plaud_webhook_nonces_expires_at index for cleanup cron', () => {
    expect(src).toMatch(
      /CREATE INDEX idx_plaud_webhook_nonces_expires_at[\s\S]{0,100}\(expires_at\)/,
    );
  });

  it('down migration drops nonce table + index + columns reversibly', () => {
    expect(src).toMatch(/DROP TABLE IF EXISTS plaud_webhook_nonces/);
    expect(src).toMatch(/DROP INDEX IF EXISTS idx_plaud_clips_external_id_source/);
    expect(src).toMatch(/DROP COLUMN IF EXISTS clip_source/);
    expect(src).toMatch(/DROP COLUMN IF EXISTS clip_external_id/);
    expect(src).toMatch(/DROP COLUMN IF EXISTS applaud_event_id/);
  });
});

describe('Slice 5.1 — PlaudClip model additions', () => {
  const src = readBackend('models/PlaudClip.mjs');

  it('declares clipSource with field mapping clip_source', () => {
    expect(src).toMatch(/clipSource:\s*\{[\s\S]{0,200}field:\s*'clip_source'/);
  });

  it('clipSource validator enforces the same enum as the migration', () => {
    expect(src).toMatch(
      /clipSource:[\s\S]{0,400}isIn:\s*\[\[\s*'manual_upload',\s*'applaud_webhook'\s*\]\]/,
    );
  });

  it('clipSource defaults to manual_upload (backfill compatibility)', () => {
    expect(src).toMatch(/clipSource:[\s\S]{0,200}defaultValue:\s*'manual_upload'/);
  });

  it('declares clipExternalId nullable, mapped to clip_external_id', () => {
    expect(src).toMatch(/clipExternalId:\s*\{[\s\S]{0,200}field:\s*'clip_external_id'/);
    expect(src).toMatch(/clipExternalId:[\s\S]{0,200}allowNull:\s*true/);
  });

  it('declares applaudEventId nullable, mapped to applaud_event_id', () => {
    expect(src).toMatch(/applaudEventId:\s*\{[\s\S]{0,200}field:\s*'applaud_event_id'/);
    expect(src).toMatch(/applaudEventId:[\s\S]{0,200}allowNull:\s*true/);
  });
});

describe('Slice 5.1 — PlaudWebhookNonce model', () => {
  const src = readBackend('models/PlaudWebhookNonce.mjs');

  it('exists and exports default Sequelize model', () => {
    expect(src).toMatch(/class PlaudWebhookNonce extends Model/);
    expect(src).toMatch(/export default PlaudWebhookNonce/);
  });

  it('uses tableName plaud_webhook_nonces', () => {
    expect(src).toMatch(/tableName:\s*'plaud_webhook_nonces'/);
  });

  it('declares source as part of composite primary key', () => {
    expect(src).toMatch(/source:\s*\{[\s\S]{0,200}primaryKey:\s*true/);
  });

  it('declares nonce as part of composite primary key', () => {
    expect(src).toMatch(/nonce:\s*\{[\s\S]{0,200}primaryKey:\s*true/);
  });

  it('uses timestamps: false (matches plaud_merge_locks; no created_at/updated_at)', () => {
    expect(src).toMatch(/timestamps:\s*false/);
  });

  it('source validator restricts to known sources (currently applaud_webhook)', () => {
    expect(src).toMatch(/isIn:\s*\[\[\s*'applaud_webhook'\s*\]\]/);
  });

  it('expiresAt column is mapped to expires_at (matches index)', () => {
    expect(src).toMatch(/expiresAt:\s*\{[\s\S]{0,200}field:\s*'expires_at'/);
  });

  it('receivedAt column is mapped to received_at with NOW() default', () => {
    expect(src).toMatch(/receivedAt:[\s\S]{0,200}defaultValue:\s*DataTypes\.NOW/);
  });
});

describe('Slice 5.1 — associations.mjs registration', () => {
  const src = readBackend('models/associations.mjs');

  it('imports the PlaudWebhookNonce module', () => {
    expect(src).toMatch(/PlaudWebhookNonceModule\s*=\s*await import\('\.\/PlaudWebhookNonce\.mjs'\)/);
  });

  it('destructures PlaudWebhookNonce from its module default', () => {
    expect(src).toMatch(/const PlaudWebhookNonce\s*=\s*PlaudWebhookNonceModule\.default/);
  });

  it('returns PlaudWebhookNonce in the early-return models payload', () => {
    // The first return point is the "all critical models exist" early return
    // around line 505-509. Both return points must include the new model.
    const matches = src.match(/PlaudWebhookNonce/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(4); // import line + destructure + 2 returns
  });
});

describe('Slice 5.1 — plaudCronJobs.mjs nonce-cleanup wiring', () => {
  const src = readBackend('jobs/plaudCronJobs.mjs');

  it('exports plaudWebhookNonceCleanupCron function', () => {
    expect(src).toMatch(/export async function plaudWebhookNonceCleanupCron/);
  });

  it('schedules nonce cleanup at 60-second interval', () => {
    expect(src).toMatch(/WEBHOOK_NONCE_CLEANUP_INTERVAL_MS\s*=\s*60\s*\*\s*1000/);
    expect(src).toMatch(
      /scheduleJob\(\s*plaudWebhookNonceCleanupCron,\s*WEBHOOK_NONCE_CLEANUP_INTERVAL_MS,\s*'webhookNonceCleanup'\s*\)/,
    );
  });

  it('cleanup query targets expires_at < NOW() (uses the index)', () => {
    expect(src).toMatch(
      /DELETE FROM plaud_webhook_nonces[\s\S]{0,80}WHERE expires_at < NOW\(\)/,
    );
  });

  it('runAll includes the new cleanup task at startup', () => {
    expect(src).toMatch(/runAll[\s\S]{0,400}plaudWebhookNonceCleanupCron\(\)/);
  });

  it('startup log mentions webhook-nonce sweeper (operator visibility)', () => {
    expect(src).toMatch(/webhook-nonce/);
  });
});
