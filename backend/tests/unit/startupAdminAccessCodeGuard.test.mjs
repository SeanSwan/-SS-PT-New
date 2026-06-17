/**
 * startupAdminAccessCodeGuard
 * ===========================
 * Locks the production startup guard for public admin self-registration.
 * Production must not boot with the documented example code, a missing code,
 * or a short/low-shape code. Test/local startup stays unblocked.
 */
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('../../utils/startupMigrations.mjs', () => ({ runStartupMigrations: vi.fn() }));
vi.mock('../../core/schemaGuards/phase15ExerciseNoteGuard.mjs', () => ({
  assertPhase15ExerciseNoteColumn: vi.fn(),
}));
vi.mock('../../core/schemaGuards/phase16WorkoutSessionIntensityNullGuard.mjs', () => ({
  assertPhase16WorkoutSessionIntensityNullable: vi.fn(),
}));
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../../database.mjs', () => ({
  default: { authenticate: vi.fn(), close: vi.fn() },
}));
vi.mock('../../setupAssociations.mjs', () => ({ default: vi.fn() }));
vi.mock('../../utils/productionDatabaseSync.mjs', () => ({
  syncDatabaseSafely: vi.fn().mockResolvedValue({ success: true, tablesCreated: 0, tablesExisting: 0 }),
}));
vi.mock('../../seedStorefrontItems.mjs', () => ({ default: vi.fn() }));
vi.mock('../../seeders/seed-waiver-versions.mjs', () => ({ default: vi.fn() }));
vi.mock('../../scripts/seedExercises.mjs', () => ({ seedExercises: vi.fn() }));
vi.mock('../../socket/socketManager.mjs', () => ({ initSocketIO: vi.fn(), closeSocketIO: vi.fn() }));

const { assertAdminAccessCode, validateAdminAccessCode } = await import('../../core/startup.mjs');

describe('startup admin access code guard', () => {
  it('fails production startup when ADMIN_ACCESS_CODE is missing', () => {
    expect(() => assertAdminAccessCode({ nodeEnv: 'production', adminAccessCode: '' }))
      .toThrow(/ADMIN_ACCESS_CODE/);
  });

  it('rejects the documented example ADMIN_ACCESS_CODE in production', () => {
    expect(validateAdminAccessCode({
      nodeEnv: 'production',
      adminAccessCode: 'admin-access-code-123',
    })).toMatchObject({ ok: false, reason: 'placeholder' });
  });

  it('rejects low-entropy short ADMIN_ACCESS_CODE values in production', () => {
    expect(validateAdminAccessCode({
      nodeEnv: 'production',
      adminAccessCode: 'short-admin-code',
    })).toMatchObject({ ok: false, reason: 'too_short' });
  });

  it('allows a long non-placeholder ADMIN_ACCESS_CODE in production', () => {
    expect(validateAdminAccessCode({
      nodeEnv: 'production',
      adminAccessCode: 'SwanAdmin-2026-Launch-Gate-93f7c1',
    })).toMatchObject({ ok: true });
  });

  it('does not block local/test startup when ADMIN_ACCESS_CODE is unset', () => {
    expect(validateAdminAccessCode({
      nodeEnv: 'test',
      adminAccessCode: '',
    })).toMatchObject({ ok: true, skipped: true });
  });

  it('assertAdminAccessCode runs before startServer in initializeServer', () => {
    const source = readFileSync(resolve(process.cwd(), 'core/startup.mjs'), 'utf8');
    const guardIdx = source.indexOf('assertAdminAccessCode();');
    const startServerIdx = source.indexOf('await startServer(app)');

    expect(guardIdx).toBeGreaterThan(0);
    expect(startServerIdx).toBeGreaterThan(0);
    expect(guardIdx).toBeLessThan(startServerIdx);
  });
});
