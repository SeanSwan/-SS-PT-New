#!/usr/bin/env node
// Temporary dependency-free self-test for the shadow seeder's DB-free core.
// Runs under plain Node (no vitest/rollup -> no native binary needed), so the
// safety-gate + determinism + report contracts can be verified locally even
// where vitest cannot boot. NOT a deliverable; the vitest file is the CI test.
import * as m from './seed-shadow-db.mjs';

let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) { pass++; } else { fail++; console.error('  FAIL', msg); } };
const section = (t) => console.log('\n== ' + t + ' ==');

section('validateShadowUrl — the non-negotiable gate');
const VS = m.validateShadowUrl;
ok(VS('postgres://shadow:***@localhost:5432/shadow').ok === true, 'loopback+shadow accepted');
ok(VS('postgres://u:***@127.0.0.1:5432/shadowdb').ok === true, '127.0.0.1 + shadow accepted');
ok(VS('postgres://u:***@localhost:5432/mydb').ok === false, 'loopback WITHOUT "shadow" REFUSED (key gate)');
ok(VS('postgres://u:***@prod.aws-region.xyz:5432/shadow').ok === false, 'NON-loopback prod REFUSED even with word shadow');
ok(VS('postgres://u:***@production.example.com:5432/app').ok === false, 'non-loopback refused');
ok((VS(undefined) || {}).ok === false, 'undefined refused');
ok((VS('') || {}).ok === false, 'empty refused');
ok((VS('not a url') || {}).ok === false, 'garbage refused');

section('topoSort — parents before children, cycle-tolerant, never hangs');
{
  const d = new Map([['c', new Set(['b'])], ['b', new Set(['a'])], ['a', new Set()]]);
  const r = m.topoSort(d, ['c', 'b', 'a']);
  ok(r.order.indexOf('a') < r.order.indexOf('b') && r.order.indexOf('b') < r.order.indexOf('c') && r.cycle.length === 0, 'chain a<b<c, no cycle');
}
{
  const d = new Map([['x', new Set(['y'])], ['y', new Set(['x'])], ['z', new Set()]]);
  const r = m.topoSort(d, ['x', 'y', 'z']);
  ok(r.cycle.length === 2 && r.order.length === 3, '2-cycle flagged, nothing dropped');
}
{
  const d = new Map([['s', new Set(['s'])]]);
  const r = m.topoSort(d, ['s']);
  ok(r.cycle.length === 1 && r.cycle[0] === 's', 'self-cycle caught (no infinite loop)');
}
{
  const d = new Map([['a', new Set(['ghost'])]]);
  const r = m.topoSort(d, ['a']);
  ok(r.order[0] === 'a' && r.cycle.length === 0, 'unknown parent filtered, no hang');
}

section('deterministicUuid — same input/same out, shape-stable, parent-distinct');
const u = m.deterministicUuid;
ok(u('users.id.0') === u('users.id.0'), 'deterministic');
ok(u('users.id.0') !== u('users.id.1'), 'row-sensitive');
ok(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(u('x')), 'uuidv4-ish shape');
const p0 = u('p0'), p1 = u('p1');
ok(p0 !== p1, 'distinct parents give distinct ids (FK target integrity)');

section('serializeReport — CI-assertable, silent no-op must be visible');
{
  const line = m.serializeReport({ tables: 3, rows: 12, skipped: [{ table: 'A', reason: 'cycle' }], failed: [] });
  ok(line.startsWith('SHADOW-SEED '), 'prefix present: ' + line);
  const p = JSON.parse(line.slice('SHADOW-SEED '.length));
  ok(p.rows === 12 && p.tables === 3, 'rows/tables decode');
  ok(p.skipped[0].includes('cycle'), 'skipped reason survives');
}
{
  const p = JSON.parse(m.serializeReport({ rows: 0, failed: ['Boom: bad col'] }).slice('SHADOW-SEED '.length));
  ok(p.rows === 0, 'STILL rows:0 -> a silent no-op is NOT green');
  ok(p.failed[0].includes('bad col'), 'failed reason survives');
}

section('generateRowValues — PK/FK/enum/unique/email-guard/determinism');
{
  const attrs = {
    id: { type: 'UUID', pk: true, allowNull: false, unique: false },
    email: { type: 'STRING', pk: false, allowNull: false, unique: true },
    status: { type: 'ENUM', allowNull: false, enum: ['active', 'paused'] },
    flag: { type: 'BOOLEAN', allowNull: false },
    notes: { type: 'STRING', allowNull: true },
    ownerId: { type: 'STRING', pk: false, allowNull: false, foreignKeyTarget: { table: 'Users', pk: 'id' } },
  };
  const a0 = m.generateRowValues({ tableName: 'members', rowIndex: 0, attrs, parentIds: { users: [{ id: p0 }, { id: p1 }] } });
  const a1 = m.generateRowValues({ tableName: 'members', rowIndex: 1, attrs, parentIds: { users: [{ id: p0 }, { id: p1 }] } });
  ok(typeof a0.id === 'string' && a0.id.length === 36, 'UUID pk emitted');
  ok(a0.ownerId === p0 && a1.ownerId === p1, 'FK cycles across parent rows (0->p0, 1->p1)');
  ok(a0.status === 'active', 'enum -> first allowed value');
  ok(a0.email !== a1.email, 'unique col distinct per row (no collision)');
  ok(m.generateRowValues({ tableName: 'members', rowIndex: 0, attrs })[Object.keys(attrs)[0]] === a0.id, 'deterministic across two invocations');
  let threw = false;
  try {
    m.generateRowValues({ tableName: 't', rowIndex: 0, attrs: { e: { type: 'STRING', enum: ['a@b.co', 'x'] } } });
  } catch (e) { threw = /email/i.test(String(e.message)); }
  ok(threw, 'email-looking value is REFUSED (PII guard)');
}

section('value-type mirror (bool/int/json/date) + name guard');
{
  const attrs = {
    id: { type: 'UUID', pk: true, allowNull: false, unique: false },
    b: { type: 'BOOLEAN', pk: false, allowNull: false, unique: false },
    n: { type: 'INTEGER', pk: false, allowNull: false, unique: false },
    j: { type: 'JSONB', pk: false, allowNull: true, unique: false },
    d: { type: 'DATE', pk: false, allowNull: false, unique: false },
  };
  const v0 = m.generateRowValues({ tableName: 't', rowIndex: 0, attrs, parentIds: {} });
  const v1 = m.generateRowValues({ tableName: 't', rowIndex: 1, attrs, parentIds: {} });
  ok(v0.b === true && v1.b === false, 'booleans alternate by row');
  ok(v0.n === 1 && v1.n === 2, 'integers sequential');
  ok(typeof v0.j === 'object' && v0.j.seed === true, 'JSON object emitted');
  ok(/^\d{4}-\d{2}-\d{2}$/.test(v0.d), 'DATEONLY is a fixed date: ' + v0.d);
  const nameLike = Object.values(v0).some((v) =>
    typeof v === 'string' && v.split(/\s+/).length >= 2 &&
    v.split(/\s+/).every((w) => /^[A-Z][a-z]+$/.test(w)));
  ok(!nameLike, 'no value looks like a personal name');
  }

  section('normalizeModel + enum recovery (Panel ruling R15 NEW 11)');
  {
    // Sequelize declares enums as DataTypes.ENUM(...) -> values on a.type.values
    const attrs = m.normalizeModel({
      rawAttributes: {
        id: { type: 'UUID', pk: true, primaryKey: true },
        tier: { type: { values: ['basic', 'premium'] }, allowNull: false },
      },
    });
    ok(Array.isArray(attrs.tier.enum) && attrs.tier.enum[0] === 'basic', 'enum recovered from datatype instance: ' + JSON.stringify(attrs.tier.enum));
    const row = m.generateRowValues({ tableName: 'subs', rowIndex: 0, attrs, parentIds: {} });
    ok(row.tier === 'basic', 'generated enum = first value: ' + row.tier);
    // attribute-level .values still honoured
    const attrs2 = m.normalizeModel({ rawAttributes: { s: { type: 'ENUM', values: ['a', 'b'] } } });
    ok(Array.isArray(attrs2.s.enum) && attrs2.s.enum[0] === 'a', 'attribute-level .values kept');
    // stringified "ENUM(...)" type recovered, case preserved
    const rowS = m.generateRowValues({ tableName: 'x', rowIndex: 0, attrs: { status: { type: "ENUM('draft','active')", allowNull: false } } });
    ok(rowS.status === 'draft', 'ENUM(...) type string parsed case-preserved: ' + rowS.status);
  }

console.log('\n' + (pass + fail) + ' checks: ' + pass + ' passed, ' + fail + ' failed');
if (fail === 0) console.log('SELF-TEST: all local (DB-free) contracts PASS');
process.exit(fail === 0 ? 0 : 1);
