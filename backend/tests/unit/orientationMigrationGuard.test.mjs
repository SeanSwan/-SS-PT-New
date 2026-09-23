import { describe, expect, it } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const MIGRATION = '../../migrations/20240115000000-update-orientation-model.cjs';
const migrationPath = join(__dirname, MIGRATION);
const migrationSrc = readFileSync(migrationPath, 'utf8');
const migration = require(MIGRATION);

/**
 * H-01 / H-02 regression guard (hostile review of the review, 2026-09-18).
 *
 * 20240115000000-update-orientation-model.cjs is the lexicographically earliest
 * migration in the repo, so it is ALWAYS first in the pending chain. It alters
 * a table `orientations` that no migration in the repository creates — the
 * table only ever existed because sequelize.sync({alter}) built it from
 * models/Orientation.mjs. On a genuinely empty database the chain therefore
 * died on migration #1 with `relation "orientations" does not exist`, which
 * broke fresh onboarding, CI shadow gates and disaster recovery at once.
 *
 * These tests drive the real exported `up`/`down` with a fake queryInterface,
 * so they assert BEHAVIOUR (no ALTERs are issued when the table is absent)
 * rather than merely grepping for the word `tableExists`.
 */

function makeQueryInterface({ tableExists }) {
  const calls = [];
  const tx = { id: 'tx' };
  const qi = {
    tableExists: async (t) => { calls.push(`tableExists(${t})`); return tableExists; },
    changeColumn: async (t) => { calls.push(`changeColumn(${t})`); },
    addColumn: async (t) => { calls.push(`addColumn(${t})`); },
    removeColumn: async (t) => { calls.push(`removeColumn(${t})`); },
    sequelize: {
      transaction: async (fn) => { calls.push('transaction'); return fn(tx); },
      query: async () => { calls.push('query'); return [[], {}]; },
    },
  };
  return { qi, calls };
}

const SequelizeStub = {
  UUID: 'UUID',
  STRING: 'STRING',
  DATE: 'DATE',
  ENUM: (...v) => ({ type: 'ENUM', values: v }),
};

describe('orientation migration is safe on an empty database (H-01)', () => {
  it('issues no schema changes when the table is absent', async () => {
    const { qi, calls } = makeQueryInterface({ tableExists: false });
    await migration.up(qi, SequelizeStub);

    expect(calls).toEqual(['tableExists(orientations)']);
    expect(calls.some(c => /changeColumn|addColumn|removeColumn/.test(c))).toBe(false);
  });

  it('still performs the migration when the table is present', async () => {
    const { qi, calls } = makeQueryInterface({ tableExists: true });
    await migration.up(qi, SequelizeStub);

    expect(calls).toContain('changeColumn(orientations)');
    expect(calls.filter(c => c === 'addColumn(orientations)').length).toBe(5);
  });

  it('rollback is a no-op when the table is absent', async () => {
    const { qi, calls } = makeQueryInterface({ tableExists: false });
    await migration.down(qi, SequelizeStub);

    expect(calls).toEqual(['tableExists(orientations)']);
  });

  it('uses queryInterface.tableExists, not the always-truthy SELECT EXISTS shape', () => {
    expect(migrationSrc).toContain('queryInterface.tableExists(');
    // the pattern the ledger warns about: a rows ARRAY tested directly
    expect(migrationSrc).not.toMatch(/const\s+\w+\s*=\s*await\s+queryInterface\.sequelize\.query/);
  });

  it('keeps the file (production has it recorded in SequelizeMeta)', () => {
    // deleting it would rewrite history for a live database
    expect(migrationSrc).toContain('20240115000000');
  });
});
