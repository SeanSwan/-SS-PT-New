/** Registry-shrink migration contract: clear design controls once while retaining append-only audit history. */
import { describe, expect, it } from 'vitest';
import migration from '../../migrations/20260721190000-degate-design-surfaces.cjs';

const DESIGN_FLAGS = [
  'homeVNext',
  'dashboardV2',
  'storeV4',
  'aboutVNext',
  'videoVNext',
  'contactVNext',
  'galleryVNext',
];

function recorder() {
  const queries = [];
  return {
    queries,
    queryInterface: {
      sequelize: {
        transaction: async (callback) => callback({ id: 'test-transaction' }),
        query: async (sql, options) => {
          expect(options?.transaction).toEqual({ id: 'test-transaction' });
          queries.push(sql.replace(/\s+/g, ' ').trim());
        },
      },
    },
  };
}

describe('de-gate design-surface migration', () => {
  it('removes all seven registry rows via their override cascade and never touches flag_audit', async () => {
    const { queries, queryInterface } = recorder();
    await migration.up(queryInterface);
    const sql = queries.join(' ');

    for (const flag of DESIGN_FLAGS) expect(sql).toContain(`'${flag}'`);
    expect(queries.filter((query) => /DELETE FROM flags/i.test(query))).toHaveLength(1);
    expect(sql).not.toMatch(/DELETE FROM flag_overrides/i);
    expect(sql).not.toMatch(/flag_audit/i);
    expect(sql).toMatch(/SET grp = 'feature'[\s\S]*WHERE flag = 'dashboardV2Finance'/i);
  });

  it('restores the seven registry definitions on down without inventing audit rows or overrides', async () => {
    const { queries, queryInterface } = recorder();
    await migration.down(queryInterface);
    const sql = queries.join(' ');

    for (const flag of DESIGN_FLAGS) expect(sql).toContain(`'${flag}'`);
    expect(sql).toMatch(/INSERT INTO flags/i);
    expect(sql).not.toMatch(/flag_overrides|flag_audit/i);
  });
});
