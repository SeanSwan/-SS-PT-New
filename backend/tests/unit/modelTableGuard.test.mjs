/**
 * modelTableGuard — contract tests (SWA-115 item 4).
 * The guard is the boot-time tripwire for the "model with no live table" drift class
 * that shipped 12 table-less models undetected (drift audit 2026-08-03). Pure-function
 * coverage here; the DB read path is a single pg_tables SELECT exercised at every boot.
 */
import { describe, it, expect } from 'vitest';
import { classifyMissingTables, extractModelTables } from '../../utils/modelTableGuard.mjs';

const fakeModel = (tableName) => ({ getTableName: () => tableName });

describe('extractModelTables', () => {
  it('normalizes embedded-quote tableNames (the User.mjs \'"Users"\' legacy hack)', () => {
    const entries = extractModelTables({ User: fakeModel('"Users"') });
    expect(entries).toEqual([{ model: 'User', table: 'Users' }]);
  });

  it('handles object-form getTableName and skips non-models', () => {
    const entries = extractModelTables({
      A: fakeModel({ tableName: 'a_table', schema: 'public' }),
      notAModel: { some: 'thing' },
      nullish: null,
    });
    expect(entries).toEqual([{ model: 'A', table: 'a_table' }]);
  });
});

describe('classifyMissingTables', () => {
  it('flags absent tables sorted by model name, split into known (allowlisted) vs fresh', () => {
    const { known, fresh } = classifyMissingTables(
      [
        { model: 'Zeta', table: 'zeta_things' },
        { model: 'User', table: 'Users' },
        { model: 'Alpha', table: 'alpha_things' },
        { model: 'Package', table: 'packages' },
      ],
      ['Users', 'unrelated_table'],
    );
    // Package/packages is a ticketed KNOWN_MISSING deferral (SWA-115) → info lane.
    expect(known).toEqual([{ model: 'Package', table: 'packages' }]);
    // Everything else absent is FRESH drift → error lane. `error` must always
    // mean "new drift", never wallpaper (Kimi F2).
    expect(fresh).toEqual([
      { model: 'Alpha', table: 'alpha_things' },
      { model: 'Zeta', table: 'zeta_things' },
    ]);
  });

  it('is case-sensitive — PascalCase twins must not mask snake_case absences', () => {
    // Real incident shape: canonical `workout_plans` model must NOT be satisfied
    // by the dead PascalCase "WorkoutPlans" twin existing.
    const { fresh } = classifyMissingTables(
      [{ model: 'WorkoutPlan', table: 'workout_plans' }],
      ['WorkoutPlans'],
    );
    expect(fresh).toHaveLength(1);
  });

  it('returns empty lanes when everything is present', () => {
    expect(classifyMissingTables([{ model: 'A', table: 'a' }], ['a']))
      .toEqual({ known: [], fresh: [] });
  });
});

describe('extractModelTables — malformed models (Kimi F5)', () => {
  it('skips models whose getTableName() is undefined/empty instead of emitting "undefined"', () => {
    const entries = extractModelTables({
      Broken: { getTableName: () => undefined },
      AlsoBroken: { getTableName: () => ({}) },
      Fine: { getTableName: () => 'fine_table' },
    });
    expect(entries).toEqual([{ model: 'Fine', table: 'fine_table' }]);
  });
});
