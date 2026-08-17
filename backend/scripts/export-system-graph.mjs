#!/usr/bin/env node
/**
 * export-system-graph.mjs — READ-ONLY export of the production relationship graph.
 *
 * Emits nodes (tables + live row counts) and edges (foreign keys) as JSON so the
 * system can be SEEN rather than described. Touches pg_catalog and issues
 * COUNT(*) only; no DDL, no DML, no writes of any kind.
 *
 * Usage: node backend/scripts/export-system-graph.mjs > docs/ai-workflow/system-graph.json
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import pg from 'pg';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));

/**
 * Resolve DATABASE_URL without hardcoding anyone's machine. The first version of
 * this file pinned an absolute Windows path containing a username, which made the
 * tool unrunnable for every other machine, agent, and CI runner — and wrote a
 * local filesystem layout into the repo. Order: real env first (Render, CI, any
 * shell that already exported it), then .env files resolved RELATIVE to this
 * script, then an explicit override.
 */
function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const candidates = [
    process.env.SWAN_ENV_FILE,
    path.resolve(HERE, '../.env'),          // backend/.env  (this script lives in backend/scripts)
    path.resolve(HERE, '../../.env'),       // repo-root .env
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'backend/.env'),
  ].filter(Boolean);

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const raw = fs.readFileSync(file, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = /^\s*DATABASE_URL\s*=\s*(.+?)\s*$/.exec(line);
      if (m) return m[1].replace(/^["']|["']$/g, '');   // value stays in memory, never printed (Rule 59)
    }
  }
  throw new Error(
    'DATABASE_URL not found. Export it, or set SWAN_ENV_FILE to an env file that defines it. '
    + `Looked in: ${candidates.join(', ')}`
  );
}

const TABLES_SQL = `
  SELECT c.relname AS table_name,
         c.reltuples::bigint AS est_rows,
         pg_total_relation_size(c.oid) AS bytes
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  ORDER BY c.relname;`;

const FK_SQL = `
  SELECT src.relname AS source_table,
         tgt.relname AS target_table,
         con.conname AS constraint_name
  FROM pg_constraint con
  JOIN pg_class src ON src.oid = con.conrelid
  JOIN pg_class tgt ON tgt.oid = con.confrelid
  JOIN pg_namespace n ON n.oid = src.relnamespace
  WHERE con.contype = 'f' AND n.nspname = 'public';`;

const INDEX_SQL = `
  SELECT c.relname AS table_name, COUNT(i.indexrelid) AS index_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_index i ON i.indrelid = c.oid
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  GROUP BY c.relname;`;

// COUNT(*) is a sequential scan under MVCC — it cannot use an index and it holds a
// snapshot for its whole duration, which blocks autovacuum from reclaiming dead rows
// behind it. 254 of those serialized against the OLTP primary is fine while the DB is
// small and becomes an incident the first time a log table crosses a million rows.
// Above these thresholds we take pg_class's estimate instead and label it as one.
const EXACT_COUNT_MAX_ROWS = 100_000;
const EXACT_COUNT_MAX_BYTES = 50 * 1024 * 1024;

async function main() {
  const conn = loadDatabaseUrl();

  // Provenance: which database did this snapshot actually come from? Without it a
  // dev .env picked up by the search order produces a file that looks like production
  // and silently misdirects every downstream reader. Host and database name are not
  // secrets (Render hostnames are public DNS); the URL itself is never printed.
  let host = 'unknown', database = 'unknown';
  try {
    const u = new URL(conn);
    host = u.hostname;
    database = u.pathname.replace(/^\//, '') || 'unknown';
  } catch { /* non-URL DSN — leave as unknown rather than guess */ }

  // Fail closed when the caller has not said which database they meant. An opt-in is
  // cheap; a snapshot mislabelled as production is not.
  const target = process.env.SWAN_GRAPH_TARGET;
  if (!target) {
    console.error(`[graph] REFUSING: set SWAN_GRAPH_TARGET to name the database you intend to read.`);
    console.error(`[graph] resolved connection points at host=${host} db=${database}`);
    console.error(`[graph] e.g. SWAN_GRAPH_TARGET=production node backend/scripts/export-system-graph.mjs`);
    process.exit(2);
  }
  console.error(`[graph] source host=${host} db=${database} target=${target}`);

  const client = new pg.Client({
    connectionString: conn,
    // Render internal hostnames have no MITM surface; a public host does. Default to
    // verifying and let an operator opt out explicitly rather than silently never checking.
    ssl: { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== '0' },
    statement_timeout: 5_000,
  });
  await client.connect();

  const [tables, fks, indexes] = await Promise.all([
    client.query(TABLES_SQL),
    client.query(FK_SQL),
    client.query(INDEX_SQL),
  ]);

  const counts = new Map();
  const approx = new Set();
  const countErrors = new Map();
  for (const row of tables.rows) {
    const est = Number(row.est_rows);
    if (est > EXACT_COUNT_MAX_ROWS || Number(row.bytes) > EXACT_COUNT_MAX_BYTES) {
      counts.set(row.table_name, Math.max(0, est));
      approx.add(row.table_name);
      continue;
    }
    try {
      const r = await client.query(`SELECT COUNT(*)::bigint AS n FROM "${row.table_name}"`);
      counts.set(row.table_name, Number(r.rows[0].n));
    } catch (err) {
      // A silent null here reads downstream as "empty", which is the same mistake this
      // whole campaign exists to prevent. Say what failed.
      counts.set(row.table_name, null);
      countErrors.set(row.table_name, err.message);
      console.error(`[graph] count failed for ${row.table_name}: ${err.message}`);
    }
  }
  await client.end();

  const idx = new Map(indexes.rows.map((r) => [r.table_name, Number(r.index_count)]));
  const degree = new Map();
  const bump = (t) => degree.set(t, (degree.get(t) || 0) + 1);
  // A self-referencing FK is ONE relationship, not two. Bumping both ends gave such a
  // table degree=2, so `orphans` (degree-based) excluded it while `components`
  // (neighbour-based) called it a singleton — the two disagreeing about the same table.
  for (const e of fks.rows) {
    if (e.source_table === e.target_table) { bump(e.source_table); continue; }
    bump(e.source_table); bump(e.target_table);
  }

  const nodes = tables.rows.map((r) => ({
    id: r.table_name,
    rows: counts.get(r.table_name),
    rowsApprox: approx.has(r.table_name) || undefined,   // estimate, not a count
    countError: countErrors.get(r.table_name) || undefined,
    bytes: Number(r.bytes),
    indexes: idx.get(r.table_name) || 0,
    degree: degree.get(r.table_name) || 0,
  }));

  const edges = fks.rows.map((e) => ({
    source: e.source_table,
    target: e.target_table,
    name: e.constraint_name,
  }));

  process.stdout.write(JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: { host, database, target, sslVerified: process.env.PGSSL_REJECT_UNAUTHORIZED !== '0' },
    nodes,
    edges,
    summary: {
      tables: nodes.length,
      foreignKeys: edges.length,
      isolated: nodes.filter((n) => n.degree === 0).length,
      emptyTables: nodes.filter((n) => n.rows === 0).length,
      totalRows: nodes.reduce((a, n) => a + (n.rows || 0), 0),
      approximated: approx.size,
      countFailures: countErrors.size,
    },
  }, null, 2));
}

main().catch((err) => { console.error('[graph] FAILED:', err.message); process.exit(1); });
