/**
 * ============================================================================
 * BLUEPRINT: TrainerApplication schema contract
 * ============================================================================
 * PURPOSE: Keep the Sequelize runtime model and migration aligned on the
 *          one-active-application invariant and legal-evidence retention.
 * SAFETY: Migration work must be atomic. User deletion must not silently
 *         cascade through signed application evidence.
 * SCOPE: Metadata and query-interface behavior only; no database is contacted.
 * ============================================================================
 */
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { describe, expect, it, vi } from 'vitest';
import Sequelize, { Op } from 'sequelize';

import TrainerApplication from '../../models/TrainerApplication.mjs';
import TrainerCredentialUpload from '../../models/TrainerCredentialUpload.mjs';

const require = createRequire(import.meta.url);
const migration = require('../../migrations/20260723090000-create-trainer-applications.cjs');
const uploadMigration = require('../../migrations/20260827000000-create-trainer-credential-uploads.cjs');
const associationsSource = readFileSync(new URL('../../models/associations.mjs', import.meta.url), 'utf8');
const modelIndexSource = readFileSync(new URL('../../models/index.mjs', import.meta.url), 'utf8');
const serverSource = readFileSync(new URL('../../server.mjs', import.meta.url), 'utf8');
const cleanupWorkerSource = readFileSync(
  new URL('../../jobs/trainerCredentialCleanupWorker.mjs', import.meta.url),
  'utf8',
);
const ACTIVE_STATUSES = ['pending_review', 'approved', 'suspended'];

function queryInterfaceHarness() {
  const calls = { createTable: [], addIndex: [], dropTable: [], query: [] };
  const transaction = { id: 'trainer-onboarding-test-transaction' };
  const queryInterface = {
    sequelize: {
      transaction: vi.fn(async (callback) => callback(transaction)),
      query: vi.fn(async (...args) => { calls.query.push(args); }),
    },
    createTable: vi.fn(async (...args) => { calls.createTable.push(args); }),
    addIndex: vi.fn(async (...args) => { calls.addIndex.push(args); }),
    dropTable: vi.fn(async (...args) => { calls.dropTable.push(args); }),
  };
  return { calls, queryInterface, transaction };
}

describe('TrainerApplication model indexes', () => {
  it('declares the same partial unique active-application index as the migration', () => {
    const index = TrainerApplication.options.indexes.find(
      ({ name }) => name === 'trainer_applications_one_active_per_user',
    );
    expect(index).toBeTruthy();
    expect(index.unique).toBe(true);
    expect(index.fields).toEqual(['userId']);
    expect(index.where.status[Op.in]).toEqual(ACTIVE_STATUSES);
  });

  it('prevents user deletion from cascading through signed evidence', () => {
    expect(TrainerApplication.rawAttributes.userId.onDelete).toBe('RESTRICT');
    expect(TrainerApplication.rawAttributes.reviewedBy.onDelete).toBe('SET NULL');
  });

  it('keeps both runtime association paths aligned with evidence retention', () => {
    expect(TrainerApplication.associate.toString()).toMatch(/onDelete:\s*'RESTRICT'/);
    expect(associationsSource).toMatch(
      /User\.hasMany\(TrainerApplication,\s*\{[^}]*onDelete:\s*'RESTRICT'[^}]*\}\);/s,
    );
    expect(associationsSource).toMatch(
      /TrainerApplication\.belongsTo\(User,\s*\{[^}]*as:\s*'reviewer'[^}]*onDelete:\s*'SET NULL'[^}]*\}\);/s,
    );
  });
});

describe('trainer application migration', () => {
  it('creates the table and every index in one transaction', async () => {
    const { calls, queryInterface, transaction } = queryInterfaceHarness();
    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(calls.createTable).toHaveLength(1);
    expect(calls.createTable[0][2]).toEqual({ transaction });
    expect(calls.addIndex.length).toBe(4);
    for (const args of calls.addIndex) expect(args[2].transaction).toBe(transaction);

    const activeIndex = calls.addIndex.find(([, , options]) => (
      options.name === 'trainer_applications_one_active_per_user'
    ));
    expect(activeIndex[2].where.status[Op.in]).toEqual(ACTIVE_STATUSES);
    expect(calls.createTable[0][1].userId.onDelete).toBe('RESTRICT');
  });

  it('rolls the table and enum back atomically', async () => {
    const { calls, queryInterface, transaction } = queryInterfaceHarness();
    await migration.down(queryInterface, Sequelize);

    expect(queryInterface.sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(calls.dropTable[0][1]).toEqual({ transaction });
    expect(calls.query[0][1]).toEqual({ transaction });
  });
});

describe('TrainerCredentialUpload lifecycle schema', () => {
  it('pins owner, application, status, expiry, and storage-key constraints', () => {
    expect(TrainerCredentialUpload.rawAttributes.userId.onDelete).toBe('RESTRICT');
    expect(TrainerCredentialUpload.rawAttributes.attachedApplicationId.onDelete).toBe('RESTRICT');
    expect(TrainerCredentialUpload.rawAttributes.storageKey.unique).toBe(true);
    expect(TrainerCredentialUpload.rawAttributes.cleanupClaimedAt.allowNull).toBe(true);
    expect(TrainerCredentialUpload.rawAttributes.status.values).toEqual([
      'uploading', 'pending', 'deleting', 'attached',
    ]);
    expect(TrainerCredentialUpload.options.indexes.map(({ name }) => name)).toEqual([
      'trainer_credential_uploads_owner_status',
      'trainer_credential_uploads_expiry',
      'trainer_credential_uploads_application',
    ]);
  });

  it('is present in both association return paths and the synchronous model index', () => {
    expect((associationsSource.match(/TrainerCredentialUpload,/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(associationsSource).toContain("import('./TrainerCredentialUpload.mjs')");
    expect(associationsSource).toMatch(/User\.hasMany\(TrainerCredentialUpload,[\s\S]*onDelete:\s*'RESTRICT'/);
    expect(modelIndexSource).toContain(
      "getTrainerCredentialUpload = () => getModel('TrainerCredentialUpload')",
    );
  });

  it('starts and stops physical cleanup with the server lifecycle', () => {
    expect(serverSource).toContain('startTrainerCredentialCleanupWorker()');
    expect(serverSource).toContain('stopTrainerCredentialCleanupWorker()');
    expect(cleanupWorkerSource).toContain('TRAINER_CREDENTIAL_CLEANUP_ENABLED');
    expect(cleanupWorkerSource).not.toContain(
      "process.env.ENABLE_TRAINER_ONBOARDING !== 'true'",
    );
  });
});

describe('trainer credential upload migration', () => {
  it('creates the receipt table and indexes atomically with restrictive foreign keys', async () => {
    const { calls, queryInterface, transaction } = queryInterfaceHarness();
    await uploadMigration.up(queryInterface, Sequelize);

    expect(queryInterface.sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(calls.createTable[0][0]).toBe('trainer_credential_uploads');
    expect(calls.createTable[0][2]).toEqual({ transaction });
    expect(calls.createTable[0][1].userId.onDelete).toBe('RESTRICT');
    expect(calls.createTable[0][1].attachedApplicationId.onDelete).toBe('RESTRICT');
    expect(calls.createTable[0][1].storageKey.unique).toBe(true);
    expect(calls.addIndex).toHaveLength(3);
    for (const args of calls.addIndex) expect(args[2].transaction).toBe(transaction);
  });

  it('drops the receipt table and both enum types atomically', async () => {
    const { calls, queryInterface, transaction } = queryInterfaceHarness();
    await uploadMigration.down(queryInterface, Sequelize);

    expect(queryInterface.sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(calls.dropTable[0]).toEqual(['trainer_credential_uploads', { transaction }]);
    expect(calls.query).toHaveLength(2);
    for (const [, options] of calls.query) expect(options).toEqual({ transaction });
  });
});
