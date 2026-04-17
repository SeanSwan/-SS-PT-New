/**
 * Phase 15.2 — startup preflight ordering tests
 * ================================================
 * Locks the contract that the Phase 15 schema guard runs BEFORE the
 * HTTP server starts listening, and that guard failure is fatal (the
 * server never listens). This is a direct response to the Phase 15.1
 * finding that the guard was wired into a background setTimeout whose
 * catch block swallowed errors and let the server keep running.
 *
 * Strategy: test `criticalDatabasePreflight` directly with a mocked
 * Sequelize, then source-lock the startup file to verify
 * `criticalDatabasePreflight` is called before `startServer`. We
 * cannot easily mock the full `initializeServer` in a unit test
 * (it calls `process.exit`), so the source-order assertion is the
 * realistic alternative.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ─────────────────────────────────────────────────────────────
// The guard helper is tested in depth in
// phase15ExerciseNoteGuard.test.mjs — these tests focus on ordering
// and error propagation through the criticalDatabasePreflight wrapper.
// ─────────────────────────────────────────────────────────────

// Mock runStartupMigrations so the import doesn't pull in the real
// migration runner.
vi.mock('../../utils/startupMigrations.mjs', () => ({
  runStartupMigrations: vi.fn().mockResolvedValue(undefined),
}));

// Mock the Phase 15 guard so we can control its pass/fail.
const mockGuard = vi.fn().mockResolvedValue({ status: 'ok', column: 'present' });
vi.mock('../../core/schemaGuards/phase15ExerciseNoteGuard.mjs', () => ({
  assertPhase15ExerciseNoteColumn: (...args) => mockGuard(...args),
}));

// Mock logger so test output stays clean.
vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the database module — startup.mjs imports sequelize at module scope.
vi.mock('../../database.mjs', () => ({
  default: {
    authenticate: vi.fn().mockResolvedValue(undefined),
    getQueryInterface: () => ({
      showAllTables: vi.fn().mockResolvedValue([]),
      describeTable: vi.fn().mockResolvedValue({}),
    }),
    close: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock various other startup dependencies to prevent real imports.
vi.mock('../../setupAssociations.mjs', () => ({ default: vi.fn() }));
vi.mock('../../utils/productionDatabaseSync.mjs', () => ({ syncDatabaseSafely: vi.fn().mockResolvedValue({ success: true, tablesCreated: 0, tablesExisting: 0 }) }));
vi.mock('../../seedStorefrontItems.mjs', () => ({ default: vi.fn().mockResolvedValue({}) }));
vi.mock('../../seeders/seed-waiver-versions.mjs', () => ({ default: vi.fn().mockResolvedValue({}) }));
vi.mock('../../scripts/seedExercises.mjs', () => ({ seedExercises: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../socket/socketManager.mjs', () => ({
  initSocketIO: vi.fn(),
  closeSocketIO: vi.fn(),
}));

// Now import the preflight function. The static import pulls the mocked
// modules above.
import { criticalDatabasePreflight } from '../../core/startup.mjs';
import { runStartupMigrations } from '../../utils/startupMigrations.mjs';

// ─────────────────────────────────────────────────────────────
// Behavioral tests for criticalDatabasePreflight
// ─────────────────────────────────────────────────────────────

function makeFakeSequelize(overrides = {}) {
  return {
    authenticate: vi.fn().mockResolvedValue(undefined),
    getQueryInterface: () => ({
      showAllTables: vi.fn().mockResolvedValue(['workout_logs']),
      describeTable: vi.fn().mockResolvedValue({ exerciseNote: { type: 'TEXT' } }),
    }),
    ...overrides,
  };
}

describe('criticalDatabasePreflight — execution order', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default success behavior after each test.
    mockGuard.mockResolvedValue({ status: 'ok', column: 'present' });
    runStartupMigrations.mockResolvedValue(undefined);
  });

  it('calls authenticate THEN runStartupMigrations THEN the schema guard', async () => {
    const callOrder = [];
    const seq = makeFakeSequelize({
      authenticate: vi.fn(async () => { callOrder.push('authenticate'); }),
    });
    runStartupMigrations.mockImplementation(async () => { callOrder.push('migrations'); });
    mockGuard.mockImplementation(async () => { callOrder.push('guard'); return { status: 'ok' }; });

    await criticalDatabasePreflight(seq);

    expect(callOrder).toEqual(['authenticate', 'migrations', 'guard']);
  });

  it('throws if authenticate fails (DB unreachable)', async () => {
    const seq = makeFakeSequelize({
      authenticate: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    });

    await expect(criticalDatabasePreflight(seq)).rejects.toThrow('ECONNREFUSED');
  });

  it('still runs the guard even if migrations warn (migration failures are non-fatal)', async () => {
    const seq = makeFakeSequelize();
    runStartupMigrations.mockRejectedValueOnce(new Error('migration had issues'));
    mockGuard.mockResolvedValueOnce({ status: 'ok', column: 'present' });

    // Should NOT throw — migration failure is a warning, guard is the real gate.
    await expect(criticalDatabasePreflight(seq)).resolves.not.toThrow();
    expect(mockGuard).toHaveBeenCalledTimes(1);
  });

  it('throws if the schema guard fails (column missing)', async () => {
    const seq = makeFakeSequelize();
    const guardError = new Error('workout_logs.exerciseNote column missing');
    guardError.code = 'PHASE_15_SCHEMA_GUARD_FAILED';
    mockGuard.mockRejectedValueOnce(guardError);

    await expect(criticalDatabasePreflight(seq)).rejects.toThrow(
      /exerciseNote column missing/,
    );
  });

  it('passes the sequelize instance through to the guard', async () => {
    const seq = makeFakeSequelize();
    mockGuard.mockResolvedValueOnce({ status: 'ok', column: 'present' });

    await criticalDatabasePreflight(seq);

    expect(mockGuard).toHaveBeenCalledWith(seq);
  });
});

// ─────────────────────────────────────────────────────────────
// Source-order lock: criticalDatabasePreflight BEFORE startServer
// ─────────────────────────────────────────────────────────────

describe('startup.mjs — Phase 15.2 initializeServer execution order', () => {
  // Resolve the file relative to the test's location.
  const resolveStartup = () => {
    const fromCwd = resolve(process.cwd(), 'core/startup.mjs');
    try {
      return readFileSync(fromCwd, 'utf8');
    } catch {
      return readFileSync(resolve(process.cwd(), 'backend/core/startup.mjs'), 'utf8');
    }
  };
  const STARTUP_SOURCE = resolveStartup();

  it('criticalDatabasePreflight is called BEFORE startServer in initializeServer', () => {
    // Both calls must appear inside initializeServer. The preflight
    // must come first in source order — if a refactor swaps them, the
    // server would start accepting requests before the schema guard
    // runs, exactly the Phase 15.1 bug this test locks against.
    const preflightIdx = STARTUP_SOURCE.indexOf('await criticalDatabasePreflight(');
    const startServerIdx = STARTUP_SOURCE.indexOf('await startServer(app)');

    expect(preflightIdx).toBeGreaterThan(0);
    expect(startServerIdx).toBeGreaterThan(0);
    expect(preflightIdx).toBeLessThan(startServerIdx);
  });

  it('criticalDatabasePreflight runs migrations THEN the schema guard (inside the preflight body)', () => {
    // Lock the internal order of the preflight function: migrations
    // first, guard second. If someone swaps these, migrations might
    // not have a chance to create the column before the guard checks.
    const fnStart = STARTUP_SOURCE.indexOf('export const criticalDatabasePreflight');
    expect(fnStart).toBeGreaterThan(-1);

    const fnSlice = STARTUP_SOURCE.slice(fnStart, fnStart + 2000);
    const migrationsIdx = fnSlice.indexOf('runStartupMigrations()');
    const guardIdx = fnSlice.indexOf('assertPhase15ExerciseNoteColumn(');

    expect(migrationsIdx).toBeGreaterThan(0);
    expect(guardIdx).toBeGreaterThan(migrationsIdx);
  });

  it('the Phase 15 guard is NOT in the background setTimeout block', () => {
    // Anti-regression: the Phase 15.1 guard was inside the
    // `setTimeout(async () => { ... })` background block, where its
    // failure was swallowed. The Phase 15.2 fix moved it to the
    // pre-listen critical path. If the guard ever re-appears inside
    // the setTimeout block, this test fails.
    const setTimeoutIdx = STARTUP_SOURCE.indexOf('setTimeout(async () =>');
    expect(setTimeoutIdx).toBeGreaterThan(0);
    const backgroundSlice = STARTUP_SOURCE.slice(setTimeoutIdx);
    expect(backgroundSlice).not.toMatch(/assertPhase15ExerciseNoteColumn/);
  });

  it('guard failure in the preflight propagates to the process.exit catch block', () => {
    // The outer try/catch in initializeServer calls process.exit(1)
    // on any throw. Lock that:
    //   - criticalDatabasePreflight is NOT wrapped in a try/catch that
    //     swallows its error
    //   - the only catch block above it is the outer one with
    //     process.exit(1)
    //
    // Approach: extract the `initializeServer` body and verify there
    // is NO `catch` between criticalDatabasePreflight and startServer
    // that swallows the error.
    const initIdx = STARTUP_SOURCE.indexOf('export const initializeServer');
    expect(initIdx).toBeGreaterThan(-1);
    const fnSlice = STARTUP_SOURCE.slice(initIdx);
    const preflightCall = fnSlice.indexOf('await criticalDatabasePreflight(');
    const startServerCall = fnSlice.indexOf('await startServer(app)');
    const between = fnSlice.slice(preflightCall, startServerCall);
    // No catch block should appear between preflight and startServer.
    // A try/catch that swallowed the guard error would break the
    // fail-fast contract.
    expect(between).not.toMatch(/\bcatch\b/);
  });
});
