/**
 * startupMigrationReporting.test.mjs
 * ==================================
 * Contract: `runStartupMigrations()` must not report success it never verified.
 *
 * Background: every migration in utils/startupMigrations.mjs is individually
 * try/caught and deliberately does not abort startup. The old implementation
 * returned a bare `true` from the outer block, which could only ever mean
 * "nothing escaped" — so it returned success even when every step inside had
 * failed, and both call sites in core/startup.mjs logged
 * "✅ Startup migrations completed successfully" unconditionally.
 *
 * These tests force every migration step to fail and assert the failure is
 * now visible to the caller. Behaviour is unchanged: startup still does not
 * abort, and no migration was added or removed.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const queryMock = vi.fn();

vi.mock('../../database.mjs', () => ({
  default: {
    query: (...args) => queryMock(...args),
    QueryTypes: { SELECT: 'SELECT', UPDATE: 'UPDATE' },
  },
}));

const { runStartupMigrations, dataFixesEnabled } = await import(
  '../../utils/startupMigrations.mjs'
);

describe('runStartupMigrations reporting contract', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('reports ok:false with a non-empty problem list when every step fails', async () => {
    queryMock.mockRejectedValue(new Error('relation "Users" does not exist'));

    const report = await runStartupMigrations();

    expect(report).toBeTruthy();
    expect(report.ok).toBe(false);
    expect(Array.isArray(report.problems)).toBe(true);
    expect(report.problems.length).toBeGreaterThan(0);
    // The failure text must survive to the caller, not just to the log.
    expect(report.problems.join(' ')).toContain('does not exist');
  });

  it('does not abort startup when steps fail (behaviour preserved)', async () => {
    queryMock.mockRejectedValue(new Error('boom'));

    // Must resolve rather than reject — a missing optional index should not
    // stop the server booting, which is why the swallows exist at all.
    await expect(runStartupMigrations()).resolves.toBeTruthy();
  });

  it('never returns a bare boolean, so a caller cannot mistake it for success', async () => {
    queryMock.mockRejectedValue(new Error('boom'));
    const report = await runStartupMigrations();
    expect(typeof report).toBe('object');
    expect(report).not.toBe(true);
  });
});

describe('startup migration reporting — source ratchet', () => {
  const readBackendFile = (relativePath) =>
    readFileSync(resolve(__dirname, '../..', relativePath), 'utf8').replace(/\r\n/g, '\n');

  it('routes every swallowed [Migration] warning through the problem ledger', () => {
    const source = readBackendFile('utils/startupMigrations.mjs');
    expect(source).toContain('function migrationProblem(message)');
    expect(source).toContain('migrationProblems.push(message)');
    // No swallowed [Migration] warning may bypass the ledger.
    expect(source).not.toContain('logger.warn(`[Migration] ');
  });

  it('gates the success log on the verified report in both call sites', () => {
    const startup = readBackendFile('core/startup.mjs');
    const gateCount = startup.split('if (migrationReport?.ok)').length - 1;
    expect(gateCount).toBe(2);
    // The success strings still exist, but only inside the verified branch.
    expect(startup).toContain('✅ Startup migrations completed successfully');
    expect(startup).toContain('✅ Startup migrations applied (pre-listen preflight)');
  });
});

/**
 * Data-repair migrations (N-01).
 *
 * `migrateSeanSwanLastName` and `migrateCleanupTestUsers` are not schema
 * migrations — they UPDATE rows addressed by hard-coded primary keys, on every
 * boot. `migrateCleanupTestUsers` is a standing rule ("whoever holds IDs 3, 4,
 * 33, 34, 55, 56 and is not already soft-deleted gets soft-deleted"), so it
 * re-fires after any restore or un-delete that puts a real user back on one of
 * those IDs. Both are one-time historical repairs that have already run.
 *
 * They must therefore be opt-in, and the report must say whether they ran.
 */
describe('data-repair migrations are opt-in', () => {
  const ENV_KEY = 'RUN_STARTUP_DATA_FIXES';
  let original;

  const readBackendFile = (relativePath) =>
    readFileSync(resolve(__dirname, '../..', relativePath), 'utf8').replace(/\r\n/g, '\n');

  beforeEach(() => {
    original = process.env[ENV_KEY];
    delete process.env[ENV_KEY];
    queryMock.mockReset();
    // Resolve empty: every migration's guard sees "nothing to do" and returns
    // before issuing an UPDATE, so the only observable difference between gated
    // and ungated is whether the migration ran its probe query at all.
    queryMock.mockResolvedValue([]);
  });

  afterEach(() => {
    if (original === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = original;
  });

  /** Migration 8's probe — unique to it. */
  const sawLastNameProbe = () =>
    queryMock.mock.calls.some(([sql]) => String(sql).includes('WHERE id = 2'));
  /** Migration 9's probe — unique to it. */
  const sawCleanupProbe = () =>
    queryMock.mock.calls.some(([sql]) => String(sql).includes('COUNT(*) as cnt'));

  it('defaults to off', () => {
    expect(dataFixesEnabled()).toBe(false);
  });

  it('does not run either data repair when the flag is unset', async () => {
    const report = await runStartupMigrations();
    expect(report.dataFixesApplied).toBe(false);
    expect(sawLastNameProbe()).toBe(false);
    expect(sawCleanupProbe()).toBe(false);
  });

  it('does not run either data repair when the flag is set to anything but 1', async () => {
    for (const value of ['', '0', 'true', 'yes']) {
      process.env[ENV_KEY] = value;
      queryMock.mockClear();
      const report = await runStartupMigrations();
      expect(report.dataFixesApplied, `flag=${JSON.stringify(value)}`).toBe(false);
      expect(sawLastNameProbe(), `flag=${JSON.stringify(value)}`).toBe(false);
    }
  });

  it('runs both data repairs, and says so, only under RUN_STARTUP_DATA_FIXES=1', async () => {
    process.env[ENV_KEY] = '1';
    expect(dataFixesEnabled()).toBe(true);

    const report = await runStartupMigrations();
    expect(report.dataFixesApplied).toBe(true);
    expect(sawLastNameProbe()).toBe(true);
    expect(sawCleanupProbe()).toBe(true);
  });

  it('never issues an ID-keyed UPDATE outside the flag', async () => {
    await runStartupMigrations();
    const updates = queryMock.mock.calls
      .map(([sql]) => String(sql))
      .filter((sql) => /UPDATE "Users" SET/i.test(sql));
    expect(updates).toEqual([]);
  });

  it('calls both repairs only from inside the gate', () => {
    // A source ratchet: adding `await migrateCleanupTestUsers();` back onto the
    // main sequence is the regression this exists to catch.
    const source = readBackendFile('utils/startupMigrations.mjs');
    const gateBody = source.slice(
      source.indexOf('if (dataFixesEnabled()) {'),
      source.indexOf('await migrateSessionRemindersSent();'),
    );
    expect(gateBody).toContain('await migrateSeanSwanLastName();');
    expect(gateBody).toContain('await migrateCleanupTestUsers();');

    const outsideGate = source.slice(0, source.indexOf('if (dataFixesEnabled()) {'));
    expect(outsideGate).not.toContain('await migrateSeanSwanLastName();');
    expect(outsideGate).not.toContain('await migrateCleanupTestUsers();');
  });
});
