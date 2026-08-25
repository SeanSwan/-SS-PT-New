#!/usr/bin/env node
/**
 * shadow-table-extract.selftest.mjs — dependency-free contract tests.
 *
 * The case that matters most is `runtime-computed table is UNRESOLVED`. If that one ever goes
 * green by returning [] instead of null, the audit that consumes it starts printing
 * "OK: no added migration targets a skipped table" for files it cannot read — which is the
 * exact vacuous-green defect the whole SWA-200 workstream exists to eliminate, reintroduced at
 * the bottom of the stack where nobody would look.
 *
 * Run: node scripts/shadow-table-extract.selftest.mjs
 */
import { tablesFromSource } from './shadow-table-extract.mjs';

let pass = 0;
let fail = 0;

function eq(name, got, want) {
  const norm = (v) => (v === null ? 'null' : [...v].sort().join(','));
  const g = norm(got);
  const w = norm(want);
  if (g === w) {
    pass++;
    console.log(`  ok    ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}`);
    console.log(`        got  = ${g}`);
    console.log(`        want = ${w}`);
  }
}

console.log('== tablesFromSource ==');

eq('literal createTable',
  tablesFromSource("queryInterface.createTable('users', {})"),
  ['users']);

eq('const-resolved createTable',
  tablesFromSource("const T = 'content_projects';\nqueryInterface.createTable(T, {})"),
  ['content_projects']);

eq('addColumn literal',
  tablesFromSource("queryInterface.addColumn('sessions', 'x', {})"),
  ['sessions']);

eq('raw CREATE TABLE IF NOT EXISTS',
  tablesFromSource('sequelize.query(`CREATE TABLE IF NOT EXISTS message_saves (id int)`)'),
  ['message_saves']);

eq('ALTER TABLE with ${CONST} interpolation',
  tablesFromSource("const TABLE_NAME = 'messages';\nsequelize.query(`ALTER TABLE ${TABLE_NAME} ADD COLUMN x int`)"),
  ['messages']);

eq('CREATE INDEX ... ON table',
  tablesFromSource('sequelize.query(`CREATE INDEX IF NOT EXISTS idx_a ON message_saves(id)`)'),
  ['message_saves']);

eq('multiple tables in one migration',
  tablesFromSource("queryInterface.createTable('a', {});\nqueryInterface.addColumn('b', 'c', {})"),
  ['a', 'b']);

// --- the load-bearing ones -------------------------------------------------------------

eq('runtime-computed table is UNRESOLVED (null, never [])',
  tablesFromSource('for (const fk of list) { await q(`ALTER TABLE ${fk.src} DROP CONSTRAINT c`); }'),
  null);

eq('unresolvable identifier is NOT invented as a table name',
  tablesFromSource('queryInterface.createTable(someRuntimeValue, {})'),
  null);

eq('declared escape rescues the unresolvable',
  tablesFromSource('// shadow-tables: users, sessions\nfor (const fk of list) { await q(`ALTER TABLE ${fk.src} DROP c`); }'),
  ['users', 'sessions']);

eq('empty / trivial source is UNRESOLVED, not empty-and-fine',
  tablesFromSource('module.exports = {};'),
  null);

eq('non-string input is UNRESOLVED',
  tablesFromSource(null),
  null);

console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
if (fail) {
  console.error('SELF-TEST FAILED');
  process.exit(1);
}
console.log('SELF-TEST: all table-extraction contracts PASS');
