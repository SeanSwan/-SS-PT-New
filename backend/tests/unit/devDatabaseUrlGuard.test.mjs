import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { devDatabaseUrlAllowed } from '../../database.mjs';

/**
 * H-06 regression guard (hostile review seat 3, fixing pass).
 *
 * A non-production process used to adopt DATABASE_URL unconditionally. The
 * repo-root .env points it at the production Render database, and database.mjs
 * calls testConnection() at import time — so every local command, including
 * `node scripts/safe-migrate.mjs development` and the whole test suite,
 * authenticated against production. That is how 9 rows were written into
 * production SequelizeMeta (§0 of the review ledger).
 */
describe('dev DATABASE_URL guard (H-06)', () => {
  const originalUrl = process.env.DATABASE_URL;
  const originalOverride = process.env.SWAN_DEV_ALLOW_PRODUCTION_DATABASE_URL;

  beforeEach(() => {
    delete process.env.SWAN_DEV_ALLOW_PRODUCTION_DATABASE_URL;
  });

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
    if (originalOverride === undefined) delete process.env.SWAN_DEV_ALLOW_PRODUCTION_DATABASE_URL;
    else process.env.SWAN_DEV_ALLOW_PRODUCTION_DATABASE_URL = originalOverride;
  });

  it('allows a local / docker DATABASE_URL', () => {
    process.env.DATABASE_URL = 'postgres://swan:swan@localhost:5432/swanstudios';
    expect(devDatabaseUrlAllowed()).toBe(true);
  });

  it('refuses a Render-hosted URL without the override', () => {
    process.env.DATABASE_URL = 'postgres://u:p@dpg-abc.oregon-postgres.render.com/swanstudios';
    // refuses by returning false (which drops through to the LOCAL config),
    // not by throwing — see the comment on the guard
    expect(devDatabaseUrlAllowed()).toBe(false);
  });

  it('refuses other hosted providers too', () => {
    for (const url of [
      'postgres://u:p@db.abc123.us-east-1.rds.amazonaws.com/app',
      'postgres://u:p@x.postgres.database.azure.com/app',
      'postgres://u:p@ep-cool-123.us-east-2.aws.neon.tech/app',
    ]) {
      process.env.DATABASE_URL = url;
      expect(devDatabaseUrlAllowed()).toBe(false);
    }
  });

  it('honours the explicit override', () => {
    process.env.DATABASE_URL = 'postgres://u:p@dpg-abc.oregon-postgres.render.com/swanstudios';
    process.env.SWAN_DEV_ALLOW_PRODUCTION_DATABASE_URL = '1';
    expect(devDatabaseUrlAllowed()).toBe(true);
  });

  it('is a no-op when DATABASE_URL is unset', () => {
    delete process.env.DATABASE_URL;
    expect(devDatabaseUrlAllowed()).toBe(false);
  });
});
