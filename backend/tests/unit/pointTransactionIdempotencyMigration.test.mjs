import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../..');

const readBackendFile = (relativePath) =>
  fs.readFileSync(path.join(backendRoot, relativePath), 'utf8').replace(/\r\n/g, '\n');

describe('PointTransaction idempotency schema repair', () => {
  it('ships the idempotencyKey repair as a deployable cjs migration', () => {
    const migration = readBackendFile('migrations/20260623060000-add-point-transaction-idempotency-key.cjs');
    const safeMigrate = readBackendFile('scripts/safe-migrate.mjs');
    const startupMigrations = readBackendFile('utils/startupMigrations.mjs');

    expect(safeMigrate).toContain("f.endsWith('.cjs') || f.endsWith('.js')");
    expect(migration).toContain("const TABLE_NAME = 'PointTransactions'");
    expect(migration).toContain("const COLUMN_NAME = 'idempotencyKey'");
    expect(migration).toContain('ADD VALUE IF NOT EXISTS');
    expect(migration).toContain('await queryInterface.addColumn(TABLE_NAME, COLUMN_NAME');
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS');
    expect(migration).toContain('point_transactions_user_source_idempotency_key');
    expect(startupMigrations).toContain('migratePointTransactionIdempotencyKey');
    expect(startupMigrations).toContain('ALTER TABLE "PointTransactions" ADD COLUMN "idempotencyKey"');
  });

  it('keeps read-only gamification responses from selecting idempotencyKey', () => {
    const controller = readBackendFile('controllers/gamificationController.mjs');
    const publicAttrs = controller.slice(
      controller.indexOf('const POINT_TRANSACTION_PUBLIC_ATTRIBUTES'),
      controller.indexOf('const POINT_TRANSACTION_FEED_ATTRIBUTES')
    );
    const feedAttrs = controller.slice(
      controller.indexOf('const POINT_TRANSACTION_FEED_ATTRIBUTES'),
      controller.indexOf('const weeklyRecapWorkoutSources')
    );

    expect(publicAttrs).toContain('const POINT_TRANSACTION_PUBLIC_ATTRIBUTES = Object.freeze([');
    expect(publicAttrs).not.toContain('idempotencyKey');
    expect(feedAttrs).not.toContain('idempotencyKey');
    expect(controller).toContain('attributes: POINT_TRANSACTION_PUBLIC_ATTRIBUTES');
    expect(controller).toContain('attributes: POINT_TRANSACTION_FEED_ATTRIBUTES');
  });
});