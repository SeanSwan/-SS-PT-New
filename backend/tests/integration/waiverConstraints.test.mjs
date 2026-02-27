/**
 * waiverConstraints — Phase 5W-C Integration Tests (Merge Gate)
 * ==============================================================
 * Live-DB tests proving enforcement of CHECK constraints added
 * by migration 20260227000002-reconcile-waiver-tables.cjs.
 *
 * Prerequisite: migration 20260227000002 applied to test DB.
 * Run: cd backend && npm run test:integration:waiver
 *
 * Uses a private Sequelize instance (config.cjs test settings)
 * — does NOT import database.mjs.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Sequelize } from 'sequelize';
import { createRequire } from 'module';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';

// ── Setup: private Sequelize instance from config.cjs test settings ──

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const require = createRequire(import.meta.url);
const config = require('../../config/config.cjs');
const testConfig = config.test;

let sequelize;
const RUN_ID = randomUUID().slice(0, 8); // Per-run suffix for unique values

// Captured IDs for FK-safe cleanup
const cleanupIds = {
  pendingWaiverMatches: [],
  waiverRecords: [],
  waiverVersions: [],
};

beforeAll(async () => {
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
});

afterAll(async () => {
  // Delete in FK-safe reverse order
  for (const id of cleanupIds.pendingWaiverMatches) {
    await sequelize.query('DELETE FROM pending_waiver_matches WHERE id = :id', {
      replacements: { id },
    });
  }
  for (const id of cleanupIds.waiverRecords) {
    await sequelize.query('DELETE FROM waiver_records WHERE id = :id', {
      replacements: { id },
    });
  }
  for (const id of cleanupIds.waiverVersions) {
    await sequelize.query('DELETE FROM waiver_versions WHERE id = :id', {
      replacements: { id },
    });
  }
  await sequelize.close();
});

// ── Helpers ──

const HASH_64 = '0'.repeat(64); // Valid 64-char textHash placeholder

function makeWaiverVersionSQL(waiverType, activityType) {
  const version = `${RUN_ID}-${waiverType}`;
  const title = `5WC Test ${RUN_ID}`;
  const actVal = activityType === null ? 'NULL' : `'${activityType}'`;
  return `
    INSERT INTO waiver_versions
      ("waiverType", "activityType", version, title, "textHash", "effectiveAt", "createdAt", "updatedAt")
    VALUES
      ('${waiverType}', ${actVal}, '${version}', '${title}', '${HASH_64}', NOW(), NOW(), NOW())
    RETURNING id
  `;
}

function makeWaiverRecordSQL(email, phone) {
  const fullName = `5WC-Test-${RUN_ID}`;
  const emailVal = email === null ? 'NULL' : `'${email}'`;
  const phoneVal = phone === null ? 'NULL' : `'${phone}'`;
  return `
    INSERT INTO waiver_records
      ("fullName", "dateOfBirth", email, phone, status, source, "activityTypes",
       "signatureData", "signedAt", "submittedByGuardian", "createdAt", "updatedAt")
    VALUES
      ('${fullName}', '2000-01-01', ${emailVal}, ${phoneVal}, 'pending_match', 'qr', '[]',
       'data:image/png;base64,test', NOW(), false, NOW(), NOW())
    RETURNING id
  `;
}

function makePendingMatchSQL(waiverRecordId, confidenceScore) {
  return `
    INSERT INTO pending_waiver_matches
      ("waiverRecordId", "confidenceScore", status, "createdAt", "updatedAt")
    VALUES
      (${waiverRecordId}, ${confidenceScore}, 'pending_review', NOW(), NOW())
    RETURNING id
  `;
}

// ── Section A: chk_wv_activity_type ──────────────────────────────────

describe('CHECK constraint: chk_wv_activity_type', () => {
  it('C1 — rejects activity_addendum with NULL activityType', async () => {
    try {
      await sequelize.query(makeWaiverVersionSQL('activity_addendum', null));
      expect.fail('Expected CHECK constraint violation');
    } catch (err) {
      expect(err.original?.constraint).toBe('chk_wv_activity_type');
    }
  });

  it('C2 — rejects core with non-NULL activityType', async () => {
    try {
      await sequelize.query(makeWaiverVersionSQL('core', 'HOME_GYM_PT'));
      expect.fail('Expected CHECK constraint violation');
    } catch (err) {
      expect(err.original?.constraint).toBe('chk_wv_activity_type');
    }
  });

  it('C3 — accepts activity_addendum with HOME_GYM_PT', async () => {
    const [rows] = await sequelize.query(makeWaiverVersionSQL('activity_addendum', 'HOME_GYM_PT'));
    const id = rows[0].id;
    expect(id).toBeDefined();
    cleanupIds.waiverVersions.push(id);
  });
});

// ── Section B: chk_wr_contact_required ───────────────────────────────

describe('CHECK constraint: chk_wr_contact_required', () => {
  it('C4 — rejects record with both email and phone NULL', async () => {
    try {
      await sequelize.query(makeWaiverRecordSQL(null, null));
      expect.fail('Expected CHECK constraint violation');
    } catch (err) {
      expect(err.original?.constraint).toBe('chk_wr_contact_required');
    }
  });

  it('C5 — accepts record with email only', async () => {
    const [rows] = await sequelize.query(
      makeWaiverRecordSQL(`c5-${RUN_ID}@test.example.com`, null),
    );
    const id = rows[0].id;
    expect(id).toBeDefined();
    cleanupIds.waiverRecords.push(id);
  });

  it('C6 — accepts record with phone only', async () => {
    const [rows] = await sequelize.query(makeWaiverRecordSQL(null, `555-${RUN_ID}`));
    const id = rows[0].id;
    expect(id).toBeDefined();
    cleanupIds.waiverRecords.push(id);
  });
});

// ── Section C: chk_pwm_confidence ────────────────────────────────────

describe('CHECK constraint: chk_pwm_confidence', () => {
  let parentRecordId;

  beforeAll(async () => {
    // Create a valid waiver_record as FK parent for pending_waiver_matches
    const [rows] = await sequelize.query(
      makeWaiverRecordSQL(`c7-parent-${RUN_ID}@test.example.com`, `555-parent-${RUN_ID}`),
    );
    parentRecordId = rows[0].id;
    cleanupIds.waiverRecords.push(parentRecordId);
  });

  it('C7 — rejects confidenceScore < 0', async () => {
    try {
      await sequelize.query(makePendingMatchSQL(parentRecordId, -0.5));
      expect.fail('Expected CHECK constraint violation');
    } catch (err) {
      expect(err.original?.constraint).toBe('chk_pwm_confidence');
    }
  });

  it('C8 — rejects confidenceScore > 1', async () => {
    try {
      await sequelize.query(makePendingMatchSQL(parentRecordId, 1.5));
      expect.fail('Expected CHECK constraint violation');
    } catch (err) {
      expect(err.original?.constraint).toBe('chk_pwm_confidence');
    }
  });

  it('C9 — accepts confidenceScore = 0.85', async () => {
    const [rows] = await sequelize.query(makePendingMatchSQL(parentRecordId, 0.85));
    const id = rows[0].id;
    expect(id).toBeDefined();
    cleanupIds.pendingWaiverMatches.push(id);
  });
});
