import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const candidate = new URL('../../migrations/20260924000001-repair-skipped-gallery-columns.cjs', import.meta.url);
const datatype = new Proxy(function () { return datatype; }, { get: () => datatype });
function schema() {
  const tables = new Map(); const indexes = new Map(); const mutations = [];
  const qi = {
    tableExists: async name => tables.has(name),
    describeTable: async name => { if (!tables.has(name)) throw new Error('table missing'); return { ...tables.get(name) }; },
    createTable: async (name, fields) => { tables.set(name, fields); },
    addColumn: async (name, column, def) => { if (tables.get(name)[column]) throw new Error('duplicate column'); tables.get(name)[column] = def; mutations.push(column); },
    addIndex: async (name, fields, options) => { indexes.set(`${name}:${options.name}`, options); mutations.push(options.name); },
    showIndex: async name => [...indexes].filter(([key]) => key.startsWith(`${name}:`)).map(([, value]) => value),
    addConstraint: async () => {},
    sequelize: { transaction: async body => body({ synthetic: true }) },
  };
  return { qi, tables, mutations };
}
test('skipped gallery upgrades are restored after the later table-creation migration', async () => {
  const s = schema();
  await require('../../migrations/20260308-add-enhancement-credits.cjs').up(s.qi, datatype);
  await require('../../migrations/20260308-add-gallery-visitor-user-link.cjs').up(s.qi, datatype);
  await require('../../migrations/20260308-create-gallery-tables.cjs').up(s.qi, datatype);
  if (existsSync(candidate)) await require(fileURLToPath(candidate)).up(s.qi, datatype);
  const cols = s.tables.get('gallery_visitors');
  for (const key of ['enhancement_credits', 'is_vip', 'free_enhancements_used', 'user_id']) assert.ok(cols[key], `gallery bootstrap missing ${key}`);
});
test('repair is idempotent and refuses to silently skip a missing table', async () => {
  const repair = require(fileURLToPath(candidate));
  const s = schema();
  await assert.rejects(repair.up(s.qi, datatype), /requires gallery_visitors/);
  s.tables.set('gallery_visitors', {});
  await repair.up(s.qi, datatype);
  const count = s.mutations.length;
  await repair.up(s.qi, datatype);
  assert.equal(s.mutations.length, count);
  assert.equal(count, 5);
});
test('repair propagates transaction failures and refuses destructive automatic rollback', async () => {
  const repair = require(fileURLToPath(candidate)); const s = schema(); s.tables.set('gallery_visitors', {});
  s.qi.addColumn = async () => { throw new Error('synthetic alteration failure'); };
  await assert.rejects(repair.up(s.qi, datatype), /synthetic alteration failure/);
  await assert.rejects(repair.down(s.qi), /cannot be automatically reversed/);
});
