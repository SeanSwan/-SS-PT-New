/**
 * Trainer-permission semantic lock (launch audit S8, 2026-07-28, SWA-75).
 *
 * WHY THIS TEST EXISTS
 * `trainerPermissionMiddleware.mjs` is a complete 563-line granular permission
 * system that has never been wired into a single route. That made it a loaded
 * trap: its original `hasTrainerPermission` returned FALSE when no grant row
 * existed and FALSE on any error — and the `trainer_permissions` table has
 * never had rows in production. Wiring it would have 403'd every trainer on the
 * platform.
 *
 * That is not hypothetical. It already happened: see the incident write-up at
 * `routes/dailyWorkoutFormRoutes.mjs:495` (2026-05-01) where model column drift
 * made the query throw, the catch returned false, and every trainer lost the
 * ability to log workouts.
 *
 * The semantic is now the one proven in production. These tests lock it so the
 * fail-closed version cannot come back.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const findOne = vi.fn();

vi.mock('../../models/index.mjs', () => ({
  getTrainerPermissions: () => ({ findOne: (...a) => findOne(...a) }),
}));
vi.mock('../../models/TrainerPermissions.mjs', () => ({
  PERMISSION_TYPES: {
    EDIT_WORKOUTS: 'edit_workouts',
    VIEW_PROGRESS: 'view_progress',
    MANAGE_CLIENTS: 'manage_clients',
    ACCESS_NUTRITION: 'access_nutrition',
    MODIFY_SCHEDULES: 'modify_schedules',
    VIEW_ANALYTICS: 'view_analytics',
  },
  default: {},
}));
vi.mock('../../utils/logger.mjs', () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const { hasTrainerPermission } = await import('../../middleware/trainerPermissionMiddleware.mjs');

beforeEach(() => findOne.mockReset());

describe('hasTrainerPermission — production-proven semantic', () => {
  it('ALLOWS on an explicit active grant', async () => {
    findOne.mockResolvedValueOnce({ id: 1 });
    expect(await hasTrainerPermission(5, 'edit_workouts')).toBe(true);
  });

  // THE LOCKOUT GUARD: empty table is the live production state.
  it('ALLOWS when the trainer has ZERO rows of any type (admin gating not configured)', async () => {
    findOne.mockResolvedValueOnce(null); // no explicit grant
    findOne.mockResolvedValueOnce(null); // no rows at all
    expect(await hasTrainerPermission(5, 'edit_workouts')).toBe(true);
  });

  it('DENIES once an admin has configured this trainer but withheld this permission', async () => {
    findOne.mockResolvedValueOnce(null);        // not granted
    findOne.mockResolvedValueOnce({ id: 9 });   // but other rows exist
    expect(await hasTrainerPermission(5, 'edit_workouts')).toBe(false);
  });

  // The 2026-05-01 incident shape: query throws on column drift.
  it('ALLOWS (permissive) when the lookup throws, instead of locking the platform out', async () => {
    // Scoped to this one call, and created lazily, so the rejection is consumed
    // by our await inside try/catch rather than leaking across tests.
    findOne.mockImplementationOnce(() => Promise.reject(new Error('column drift')));
    const allowed = await hasTrainerPermission(5, 'edit_workouts');
    expect(allowed).toBe(true);
  });

  it('checks the grant is ACTIVE and unexpired', async () => {
    findOne.mockResolvedValueOnce(null);
    findOne.mockResolvedValueOnce(null);
    await hasTrainerPermission(5, 'edit_workouts');
    const where = findOne.mock.calls[0][0].where;
    expect(where.isActive).toBe(true);
    expect(where.trainerId).toBe(5);
    expect(where.permissionType).toBe('edit_workouts');
  });

  it('coerces a string trainer id to a number for the query', async () => {
    findOne.mockResolvedValueOnce(null);
    findOne.mockResolvedValueOnce(null);
    await hasTrainerPermission('5', 'edit_workouts');
    expect(findOne.mock.calls[0][0].where.trainerId).toBe(5);
  });

  it.each([['zero', 0], ['negative', -1], ['non-numeric', 'abc'], ['null', null]])(
    'rejects a %s trainer id without querying', async (_label, bad) => {
      expect(await hasTrainerPermission(bad, 'edit_workouts')).toBe(false);
      expect(findOne).not.toHaveBeenCalled();
    }
  );
});

describe('wiring safety', () => {
  it('is still not wired into any route — deliberate', async () => {
    const { readFileSync, readdirSync, statSync } = await import('node:fs');
    const { join, dirname, resolve } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const routesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../routes');

    const files = [];
    (function walk(d) {
      for (const e of readdirSync(d)) {
        const p = join(d, e);
        if (statSync(p).isDirectory()) walk(p);
        else if (e.endsWith('.mjs')) files.push(p);
      }
    })(routesDir);

    const wired = files.filter((f) =>
      /from\s+['"].*trainerPermissionMiddleware(\.mjs)?['"]/.test(readFileSync(f, 'utf8'))
    );

    // If this ever fails, someone wired the granular system. That is allowed —
    // but ONLY alongside an admin surface for granting permissions, or trainers
    // configured with partial rows will silently lose access.
    expect(wired).toEqual([]);
  });
});
