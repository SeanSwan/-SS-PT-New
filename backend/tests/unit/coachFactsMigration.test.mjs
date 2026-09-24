/**
 * coachFactsMigration.test.mjs
 * ============================
 * Executes the create-coach-facts migration against a recording fake
 * queryInterface. Fable blueprint 2026-08-31, S1.
 *
 * WHY THIS EXISTS: `node --check` proves a migration parses, not that it runs.
 * A typo like `Sequelize.DATEONY` or a `queryInterface` method that does not
 * exist parses cleanly and then throws mid-deploy, with half the DDL applied.
 * Running up()/down() here against a fake catches that class in CI, at zero
 * risk, because the migration is never pointed at a real database.
 *
 * It also pins the property the blast-radius taxonomy cares about most: the FK
 * target. `references: { model: 'Users' }` is quoted by Sequelize into
 * `REFERENCES "Users"`, the canonical table. A bare `users` would resolve to
 * production's stale duplicate — succeeding silently, corrupting quietly. That
 * exact substitution is asserted against below rather than assumed.
 *
 * The idempotence assertions matter because Render can re-run a partially
 * applied deploy: up() on an existing table must be a no-op, not an error.
 */
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const migration = require('../../migrations/20260831200000-create-coach-facts.cjs');

/** Minimal Sequelize DataTypes surface, recording what the migration asks for. */
const FakeSequelize = {
  INTEGER: 'INTEGER',
  TEXT: 'TEXT',
  JSONB: 'JSONB',
  DATE: 'DATE',
  DATEONLY: 'DATEONLY',
  ENUM: (...values) => ({ type: 'ENUM', values }),
  literal: (sql) => ({ type: 'LITERAL', sql }),
};

function makeQueryInterface({ existingTables = [] } = {}) {
  const calls = { createTable: [], addIndex: [], dropTable: [], query: [] };
  return {
    calls,
    showAllTables: vi.fn(async () => [...existingTables]),
    createTable: vi.fn(async (name, columns) => calls.createTable.push({ name, columns })),
    addIndex: vi.fn(async (name, fields, options) => calls.addIndex.push({ name, fields, options })),
    dropTable: vi.fn(async (name) => calls.dropTable.push(name)),
    sequelize: {
      query: vi.fn(async (sql) => calls.query.push(sql)),
    },
  };
}

describe('create-coach-facts migration — up()', () => {
  it('creates coach_facts with both read-path indexes', async () => {
    const qi = makeQueryInterface();
    await migration.up(qi, FakeSequelize);

    expect(qi.calls.createTable).toHaveLength(1);
    expect(qi.calls.createTable[0].name).toBe('coach_facts');
    expect(qi.calls.addIndex.map((c) => c.options.name)).toEqual([
      'coach_facts_user_status',
      'coach_facts_user_cat_status',
    ]);
  });

  it('points every "Users" FK at the QUOTED canonical table, never lowercase users', async () => {
    const qi = makeQueryInterface();
    await migration.up(qi, FakeSequelize);
    const columns = qi.calls.createTable[0].columns;

    const userFks = ['userId', 'createdByUserId', 'approvedByUserId'];
    for (const column of userFks) {
      expect(columns[column].references).toEqual(
        expect.objectContaining({ model: 'Users', key: 'id' }),
      );
      // the stale-duplicate trap, asserted rather than assumed
      expect(columns[column].references.model).not.toBe('users');
    }
  });

  it('types every "Users" FK as INTEGER, matching "Users".id', async () => {
    const qi = makeQueryInterface();
    await migration.up(qi, FakeSequelize);
    const columns = qi.calls.createTable[0].columns;

    for (const column of ['userId', 'createdByUserId', 'approvedByUserId']) {
      expect(columns[column].type).toBe('INTEGER');
    }
  });

  it('self-references coach_facts for supersession, as INTEGER and nullable', async () => {
    const qi = makeQueryInterface();
    await migration.up(qi, FakeSequelize);
    const column = qi.calls.createTable[0].columns.invalidatedByFactId;

    expect(column.references).toEqual(expect.objectContaining({ model: 'coach_facts', key: 'id' }));
    expect(column.type).toBe('INTEGER');
    expect(column.allowNull).toBe(true);
    // SET NULL, not CASCADE: deleting a successor must not delete the history it superseded
    expect(column.onDelete).toBe('SET NULL');
  });

  it('defaults status to proposed — the machine cannot write an active row by omission', async () => {
    const qi = makeQueryInterface();
    await migration.up(qi, FakeSequelize);
    const status = qi.calls.createTable[0].columns.status;

    expect(status.defaultValue).toBe('proposed');
    expect(status.type.values).toEqual(['proposed', 'active', 'invalidated', 'rejected']);
  });

  it('requires validFrom but allows validTo to be open-ended', async () => {
    const qi = makeQueryInterface();
    await migration.up(qi, FakeSequelize);
    const columns = qi.calls.createTable[0].columns;

    expect(columns.validFrom.allowNull).toBe(false);
    expect(columns.validFrom.type).toBe('DATEONLY');
    expect(columns.validTo.allowNull).toBe(true);
  });

  it('is a no-op when the table already exists (a re-run deploy must not error)', async () => {
    const qi = makeQueryInterface({ existingTables: ['coach_facts'] });
    await migration.up(qi, FakeSequelize);

    expect(qi.calls.createTable).toHaveLength(0);
    expect(qi.calls.addIndex).toHaveLength(0);
  });

  it('tolerates the object form showAllTables returns on some dialects', async () => {
    const qi = makeQueryInterface({ existingTables: [{ tableName: 'coach_facts' }] });
    await migration.up(qi, FakeSequelize);

    expect(qi.calls.createTable).toHaveLength(0);
  });
});

describe('create-coach-facts migration — down()', () => {
  it('drops the table and all three ENUM types', async () => {
    const qi = makeQueryInterface({ existingTables: ['coach_facts'] });
    await migration.down(qi, FakeSequelize);

    expect(qi.calls.dropTable).toEqual(['coach_facts']);
    // Postgres keeps ENUM types after the owning table is dropped; leaving them
    // behind makes a re-run of up() fail with "type already exists".
    const dropped = qi.calls.query.join('\n');
    for (const enumName of [
      'enum_coach_facts_category',
      'enum_coach_facts_status',
      'enum_coach_facts_sourceType',
    ]) {
      expect(dropped).toContain(`DROP TYPE IF EXISTS "${enumName}"`);
    }
  });

  it('is a no-op when the table is already gone', async () => {
    const qi = makeQueryInterface({ existingTables: [] });
    await migration.down(qi, FakeSequelize);

    expect(qi.calls.dropTable).toHaveLength(0);
    expect(qi.calls.query).toHaveLength(0);
  });

  it('destroys nothing outside coach_facts', async () => {
    const qi = makeQueryInterface({ existingTables: ['coach_facts', 'Users', 'client_notes'] });
    await migration.down(qi, FakeSequelize);

    expect(qi.calls.dropTable).toEqual(['coach_facts']);
    expect(qi.calls.query.join('\n')).not.toMatch(/Users|client_notes/);
  });
});
