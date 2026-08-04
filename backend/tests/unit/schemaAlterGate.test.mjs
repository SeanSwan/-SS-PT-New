/**
 * Launch audit 2026-08-04 — the mutative-DDL boot gate.
 *
 * `sequelize.sync({ alter })` used to run on EVERY production boot by default.
 * It emits ALTER COLUMN ... TYPE / SET NOT NULL / ADD CONSTRAINT against the
 * LIVE database from model definitions this repo has repeatedly proven wrong,
 * so a bad model can abort boot (restart loop), rewrite a table under ACCESS
 * EXCLUSIVE (lock brownout), or silently coerce live data with no error.
 *
 * It is now fail-closed behind STARTUP_SCHEMA_ALTER. These tests pin the gate
 * itself, because "off by default" is the whole safety property — if this ever
 * silently flips back to on-by-default, every deploy becomes a live DDL event
 * again and nothing else in the suite would notice.
 */
import { describe, expect, it } from 'vitest';
import { shouldRunSchemaAlter } from '../../utils/productionDatabaseSync.mjs';

describe('mutative schema-ALTER boot gate', () => {
  it('is OFF when the env var is absent — the default for every environment', () => {
    expect(shouldRunSchemaAlter({ startupSchemaAlter: undefined })).toBe(false);
  });

  it('is OFF in production unless explicitly armed (the regression this fixes)', () => {
    // The old gate returned true whenever NODE_ENV === 'production'. Production
    // must NOT be sufficient on its own ever again.
    expect(shouldRunSchemaAlter({ startupSchemaAlter: undefined })).toBe(false);
    expect(shouldRunSchemaAlter({ startupSchemaAlter: 'false' })).toBe(false);
  });

  it('is OFF for every truthy-looking value that is not exactly "true"', () => {
    // Guards against a sloppy env value silently arming live DDL.
    for (const value of ['1', 'yes', 'TRUE', 'True', 'on', '', ' ']) {
      expect(shouldRunSchemaAlter({ startupSchemaAlter: value }), `value ${JSON.stringify(value)} must not arm DDL`).toBe(false);
    }
  });

  it('is ON only for the exact break-glass string', () => {
    expect(shouldRunSchemaAlter({ startupSchemaAlter: 'true' })).toBe(true);
  });
});
