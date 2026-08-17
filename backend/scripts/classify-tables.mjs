#!/usr/bin/env node
/**
 * classify-tables.mjs — turn the system graph's NUMBERS into ANSWERS.
 *
 * WHY THIS EXISTS
 * The graph reported "158 of 254 tables are empty" and "41 disconnected components."
 * Both were counts dressed up as findings. GLM-5.2 (2026-08-16, FINDINGS 7 and 8)
 * called that out: the count is not the deliverable, the classification is — and
 * each class demands a different action, so an unclassified count cannot be acted on
 * at all.
 *
 * It also refuted the lazier reading of the component count: a Sequelize association
 * declared with `constraints: false`, or without an explicit foreignKey, emits NO
 * database-level FK. Absence of an FK is therefore weak evidence of drift on its own.
 * What separates drift from a deliberate application-level reference is whether the
 * REFERENCE COLUMN exists without a constraint behind it.
 *
 * EMPTY-TABLE CLASSES
 *   modelled-uncalled   model exists + no caller  -> dead code, Rule 34 quarantine candidate
 *   modelled-called     model exists + callers    -> feature never exercised: seed it or cut it
 *   unmodelled          no model at all           -> a migration made a table no code uses
 *
 * COMPONENT CLASSES (tables with no FK path to the main component)
 *   app-ref             has *_id / *Id columns but no FK  -> application-level reference, normal
 *   truly-isolated      no reference columns, no FK       -> genuinely standalone
 *   drift-suspect       reference column NAMES a real table, no FK -> the only class worth chasing
 *
 * Read-only: pg_catalog + information_schema, plus grep over the repo. No writes.
 * Usage: SWAN_GRAPH_TARGET=production node backend/scripts/classify-tables.mjs [--csv]
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import pg from 'pg';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const SNAPSHOT = path.resolve(REPO, 'docs/ai-workflow/system-graph.json');

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const f of [process.env.SWAN_ENV_FILE, path.resolve(HERE, '../.env'), path.resolve(REPO, '.env')].filter(Boolean)) {
    if (!fs.existsSync(f)) continue;
    const m = /^\s*DATABASE_URL\s*=\s*(.+?)\s*$/m.exec(fs.readFileSync(f, 'utf8'));
    if (m) return m[1].replace(/^["']|["']$/g, '');
  }
  throw new Error('DATABASE_URL not found; set it or SWAN_ENV_FILE');
}

/**
 * Source scanning is done in-process rather than by shelling out to ripgrep: `rg` is
 * not guaranteed on PATH (it was absent on the machine this was written on), and a
 * missing binary would otherwise look like "no matches" — i.e. every table would
 * classify as uncalled. Files are read once and cached; the per-table cost is a regex
 * over memory, not a process spawn.
 */
const FILE_CACHE = new Map();   // dir -> [{path, text}]
function filesUnder(dirs) {
  const key = dirs.join('|');
  if (FILE_CACHE.has(key)) return FILE_CACHE.get(key);
  const out = [];
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!/\.(mjs|js|cjs|ts)$/.test(e.name)) continue;
      try { out.push({ path: full, text: fs.readFileSync(full, 'utf8') }); } catch { /* unreadable */ }
    }
  };
  for (const d of dirs) {
    const abs = path.resolve(REPO, d);
    if (fs.existsSync(abs)) walk(abs);
  }
  FILE_CACHE.set(key, out);
  return out;
}

function countMatches(pattern, dirs, exclude = null) {
  const re = new RegExp(pattern);
  let n = 0;
  for (const f of filesUnder(dirs)) {
    if (exclude && exclude.test(f.path)) continue;
    if (re.test(f.text)) n++;
  }
  return n;
}

const REF_COL_SQL = `
  SELECT table_name, column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND (column_name ILIKE '%\\_id' OR column_name ILIKE '%Id')
    AND column_name NOT IN ('id', 'uuid');`;

async function main() {
  if (!process.env.SWAN_GRAPH_TARGET) {
    console.error('[classify] REFUSING: set SWAN_GRAPH_TARGET to name the database you intend to read.');
    process.exit(2);
  }
  if (!fs.existsSync(SNAPSHOT)) {
    console.error(`[classify] snapshot missing: ${SNAPSHOT} — run export-system-graph.mjs first`);
    process.exit(2);
  }
  const g = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
  const byId = new Map(g.nodes.map((n) => [n.id, n]));

  const client = new pg.Client({
    connectionString: loadDatabaseUrl(),
    ssl: { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== '0' },
    statement_timeout: 15_000,
  });
  await client.connect();
  const refCols = await client.query(REF_COL_SQL);
  await client.end();

  const colsByTable = new Map();
  for (const r of refCols.rows) {
    if (!colsByTable.has(r.table_name)) colsByTable.set(r.table_name, []);
    colsByTable.get(r.table_name).push(r.column_name);
  }

  // Component walk, mirroring the CLI (self-FKs excluded so a self-referencing table
  // is not miscounted as its own neighbour).
  const nbr = new Map(g.nodes.map((n) => [n.id, new Set()]));
  for (const e of g.edges) {
    if (e.source === e.target || !nbr.has(e.source) || !nbr.has(e.target)) continue;
    nbr.get(e.source).add(e.target); nbr.get(e.target).add(e.source);
  }
  const comp = new Map(); let cid = 0;
  for (const n of g.nodes) {
    if (comp.has(n.id)) continue;
    const stack = [n.id]; comp.set(n.id, cid);
    while (stack.length) {
      const cur = stack.pop();
      for (const x of nbr.get(cur)) if (!comp.has(x)) { comp.set(x, cid); stack.push(x); }
    }
    cid++;
  }
  const sizes = new Map();
  for (const n of g.nodes) sizes.set(comp.get(n.id), (sizes.get(comp.get(n.id)) || 0) + 1);
  const GIANT = [...sizes.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const MODEL_DIRS = ['backend/models'];
  const CALLER_DIRS = ['backend/routes', 'backend/services', 'backend/controllers', 'backend/jobs', 'backend/scripts'];
  const tableNames = new Set(g.nodes.map((n) => n.id));
  const rows = [];

  for (const n of g.nodes) {
    const esc = n.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const hasModel = countMatches(`tableName:\\s*['"\`]${esc}['"\`]`, MODEL_DIRS) > 0
      || countMatches(`['"\`]${esc}['"\`]`, MODEL_DIRS) > 0;
    const callers = countMatches(`\\b${esc}\\b`, CALLER_DIRS);

    let emptyClass = '';
    if (n.rows === 0) {
      emptyClass = !hasModel ? 'unmodelled' : (callers > 0 ? 'modelled-called' : 'modelled-uncalled');
    }

    let compClass = '';
    if (comp.get(n.id) !== GIANT) {
      const cols = colsByTable.get(n.id) || [];
      // A reference column whose name maps to a real table, with no FK behind it, is
      // the only signal that separates drift from a deliberate app-level reference.
      const namesRealTable = cols.some((c) => {
        const stem = c.replace(/_?[iI]d$/, '').toLowerCase();
        if (!stem) return false;
        for (const t of tableNames) {
          const tl = t.toLowerCase();
          if (tl === stem || tl === `${stem}s` || tl.replace(/s$/, '') === stem) return true;
        }
        return false;
      });
      compClass = cols.length === 0 ? 'truly-isolated' : (namesRealTable ? 'drift-suspect' : 'app-ref');
    }

    rows.push({
      table: n.id, rows: n.rows, hasModel, callers,
      component: comp.get(n.id) === GIANT ? 'main' : `detached(${sizes.get(comp.get(n.id))})`,
      emptyClass, compClass, refCols: (colsByTable.get(n.id) || []).join('|'),
    });
  }

  if (process.argv.includes('--csv')) {
    console.log('table,rows,hasModel,callers,component,emptyClass,compClass,refCols');
    for (const r of rows) {
      console.log([r.table, r.rows, r.hasModel, r.callers, r.component, r.emptyClass, r.compClass, r.refCols].join(','));
    }
    return;
  }

  const tally = (key) => rows.reduce((acc, r) => { if (r[key]) acc[r[key]] = (acc[r[key]] || 0) + 1; return acc; }, {});
  console.log('EMPTY TABLES —', JSON.stringify(tally('emptyClass')));
  console.log('DETACHED     —', JSON.stringify(tally('compClass')));
  console.log('');
  console.log('DRIFT-SUSPECT (the only detached class worth chasing):');
  for (const r of rows.filter((r) => r.compClass === 'drift-suspect')) {
    console.log(`  ${r.table.padEnd(34)} rows=${String(r.rows).padStart(5)}  cols=${r.refCols}`);
  }
  console.log('');
  console.log('UNMODELLED + EMPTY (a migration made a table no code uses):');
  for (const r of rows.filter((r) => r.emptyClass === 'unmodelled')) console.log(`  ${r.table}`);
  console.log('');
  console.log('MODELLED BUT UNCALLED + EMPTY (dead-code candidates — Rule 34: verify before any drop):');
  for (const r of rows.filter((r) => r.emptyClass === 'modelled-uncalled')) console.log(`  ${r.table}`);
}

main().catch((err) => { console.error('[classify] FAILED:', err.message); process.exit(1); });
