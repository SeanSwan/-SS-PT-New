#!/usr/bin/env node
/**
 * export-system-graph.mjs — READ-ONLY export of the production relationship graph.
 *
 * Emits nodes (tables + live row counts) and edges (foreign keys) as JSON so the
 * system can be SEEN rather than described. Touches pg_catalog and issues
 * COUNT(*) only; no DDL, no DML, no writes of any kind.
 *
 * Usage: node scripts/qa/export-system-graph.mjs > graph.json
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const ENV_PATH = 'C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/backend/.env';

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const raw = fs.readFileSync(ENV_PATH, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*DATABASE_URL\s*=\s*(.+?)\s*$/.exec(line);
    if (m) return m[1].replace(/^["']|["']$/g, '');
  }
  throw new Error('DATABASE_URL not found (value never printed)');
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

async function main() {
  const client = new pg.Client({
    connectionString: loadDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
    statement_timeout: 60_000,
  });
  await client.connect();

  const [tables, fks, indexes] = await Promise.all([
    client.query(TABLES_SQL),
    client.query(FK_SQL),
    client.query(INDEX_SQL),
  ]);

  // Exact counts for the graph's weight channel; estimates lie after bulk ops.
  const counts = new Map();
  for (const row of tables.rows) {
    try {
      const r = await client.query(`SELECT COUNT(*)::bigint AS n FROM "${row.table_name}"`);
      counts.set(row.table_name, Number(r.rows[0].n));
    } catch {
      counts.set(row.table_name, null); // permission or vanished mid-scan
    }
  }
  await client.end();

  const idx = new Map(indexes.rows.map((r) => [r.table_name, Number(r.index_count)]));
  const degree = new Map();
  const bump = (t) => degree.set(t, (degree.get(t) || 0) + 1);
  for (const e of fks.rows) { bump(e.source_table); bump(e.target_table); }

  const nodes = tables.rows.map((r) => ({
    id: r.table_name,
    rows: counts.get(r.table_name),
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
    nodes,
    edges,
    summary: {
      tables: nodes.length,
      foreignKeys: edges.length,
      isolated: nodes.filter((n) => n.degree === 0).length,
      emptyTables: nodes.filter((n) => n.rows === 0).length,
      totalRows: nodes.reduce((a, n) => a + (n.rows || 0), 0),
    },
  }, null, 2));
}

main().catch((err) => { console.error('[graph] FAILED:', err.message); process.exit(1); });
