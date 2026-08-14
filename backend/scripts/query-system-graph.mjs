#!/usr/bin/env node
/**
 * query-system-graph.mjs — ask the system graph questions from a terminal.
 *
 * WHY THIS EXISTS (and why it is not a graph database):
 * The published system map is for human eyes. An agent cannot read a canvas, and
 * loading the 72 KB snapshot into context to answer "what touches Users?" is
 * wasteful. This is the same shape as the CATALOG (rule 72): a generated,
 * greppable artifact queried by a deterministic script — no vector store, no
 * embeddings, no graph engine, no LLM in the loop.
 *
 * The snapshot is a POINTER, never canon. It is true as of `generatedAt`; the
 * database is the authority. Regenerate before trusting it:
 *     node backend/scripts/export-system-graph.mjs > docs/ai-workflow/system-graph.json
 *
 * COMMANDS
 *   neighbors <table>     what this table connects to, both directions
 *   path <a> <b>          shortest FK path between two tables (or none)
 *   orphans               tables with no foreign key in either direction
 *   empty [--connected]   tables holding zero rows
 *   hubs [n]              most-connected tables
 *   components            disconnected clusters — the parts with no path to Users
 *   unindexed             tables carrying rows but thin on indexes
 *   stats                 one-line summary
 *   find <substr>         tables whose name contains a string
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const SNAPSHOT = process.env.SWAN_SYSTEM_GRAPH
  || path.resolve(HERE, '../../docs/ai-workflow/system-graph.json');

function load() {
  if (!fs.existsSync(SNAPSHOT)) {
    console.error(`[graph] snapshot missing: ${SNAPSHOT}`);
    console.error('[graph] regenerate: node backend/scripts/export-system-graph.mjs > docs/ai-workflow/system-graph.json');
    process.exit(2);
  }
  const g = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
  const ageH = (Date.now() - Date.parse(g.generatedAt)) / 3.6e6;
  if (ageH > 168) {
    console.error(`[graph] WARNING: snapshot is ${Math.round(ageH / 24)} days old — schema may have moved. Regenerate before trusting it.`);
  }
  g.byId = new Map(g.nodes.map((n) => [n.id, n]));
  g.nbr = new Map(g.nodes.map((n) => [n.id, new Set()]));
  for (const e of g.edges) {
    if (!g.nbr.has(e.source) || !g.nbr.has(e.target)) continue;
    g.nbr.get(e.source).add(e.target);
    g.nbr.get(e.target).add(e.source);
  }
  return g;
}

// Case-insensitive resolve — "users" should find "Users" without the caller
// having to know Postgres folding rules.
function resolve(g, name) {
  if (g.byId.has(name)) return name;
  const hit = [...g.byId.keys()].filter((k) => k.toLowerCase() === name.toLowerCase());
  if (hit.length === 1) return hit[0];
  const near = [...g.byId.keys()].filter((k) => k.toLowerCase().includes(name.toLowerCase()));
  console.error(`[graph] no table "${name}".` + (near.length ? ` Did you mean: ${near.slice(0, 6).join(', ')}` : ''));
  process.exit(1);
}

const g = load();
const [cmd, ...args] = process.argv.slice(2);
const num = (n) => (n == null ? '?' : n.toLocaleString());

switch (cmd) {
  case 'neighbors': {
    const t = resolve(g, args[0]);
    const n = g.byId.get(t);
    const list = [...g.nbr.get(t)].sort();
    console.log(`${t}  rows=${num(n.rows)}  fks=${n.degree}  indexes=${n.indexes}`);
    console.log(list.length ? list.map((x) => `  → ${x} (rows=${num(g.byId.get(x).rows)})`).join('\n')
                            : '  (no foreign key in either direction — isolated)');
    break;
  }
  case 'path': {
    const a = resolve(g, args[0]); const b = resolve(g, args[1]);
    const prev = new Map([[a, null]]); const q = [a];
    while (q.length) {
      const cur = q.shift();
      if (cur === b) break;
      for (const nb of g.nbr.get(cur)) if (!prev.has(nb)) { prev.set(nb, cur); q.push(nb); }
    }
    if (!prev.has(b)) { console.log(`no FK path between ${a} and ${b} — they are in different components`); break; }
    const out = []; for (let c = b; c; c = prev.get(c)) out.unshift(c);
    console.log(out.join(' → ') + `   (${out.length - 1} hop${out.length === 2 ? '' : 's'})`);
    break;
  }
  case 'orphans': {
    const o = g.nodes.filter((n) => n.degree === 0).sort((x, y) => (y.rows || 0) - (x.rows || 0));
    console.log(`${o.length} tables with no foreign key in either direction:`);
    for (const n of o) console.log(`  ${n.id.padEnd(38)} rows=${String(num(n.rows)).padStart(7)}  ${n.rows ? '' : '(empty)'}`);
    break;
  }
  case 'empty': {
    const onlyConnected = args.includes('--connected');
    const e = g.nodes.filter((n) => n.rows === 0 && (!onlyConnected || n.degree > 0));
    console.log(`${e.length} empty tables${onlyConnected ? ' that are wired into the graph' : ''}:`);
    for (const n of e.sort((x, y) => y.degree - x.degree)) console.log(`  ${n.id.padEnd(38)} fks=${n.degree}`);
    break;
  }
  case 'hubs': {
    const n = Number(args[0]) || 12;
    for (const t of [...g.nodes].sort((a, b) => b.degree - a.degree).slice(0, n)) {
      const pct = ((100 * t.degree) / g.summary.foreignKeys).toFixed(1);
      console.log(`  ${t.id.padEnd(34)} fks=${String(t.degree).padStart(3)} (${pct}% of all)  rows=${num(t.rows)}`);
    }
    break;
  }
  case 'components': {
    const seen = new Set(); const comps = [];
    for (const n of g.nodes) {
      if (seen.has(n.id)) continue;
      const stack = [n.id]; const members = []; seen.add(n.id);
      while (stack.length) {
        const c = stack.pop(); members.push(c);
        for (const nb of g.nbr.get(c)) if (!seen.has(nb)) { seen.add(nb); stack.push(nb); }
      }
      comps.push(members);
    }
    comps.sort((a, b) => b.length - a.length);
    console.log(`${comps.length} disconnected components:`);
    for (const c of comps) {
      if (c.length === 1) continue;
      console.log(`  [${String(c.length).padStart(3)}] ${c.length > 8 ? c.slice(0, 8).join(', ') + ` … +${c.length - 8}` : c.join(', ')}`);
    }
    console.log(`  [  1] × ${comps.filter((c) => c.length === 1).length} single isolated tables (see: orphans)`);
    break;
  }
  case 'unindexed': {
    // one index is the PK; a populated table with only that is usually a scan waiting to happen
    const u = g.nodes.filter((n) => (n.rows || 0) > 50 && n.indexes <= 1)
      .sort((a, b) => (b.rows || 0) - (a.rows || 0));
    console.log(u.length ? `${u.length} populated tables with <=1 index:` : 'none — every populated table carries more than a bare PK index');
    for (const n of u) console.log(`  ${n.id.padEnd(38)} rows=${String(num(n.rows)).padStart(7)} indexes=${n.indexes}`);
    break;
  }
  case 'find': {
    const q = (args[0] || '').toLowerCase();
    for (const n of g.nodes.filter((x) => x.id.toLowerCase().includes(q)))
      console.log(`  ${n.id.padEnd(38)} rows=${String(num(n.rows)).padStart(7)} fks=${n.degree} indexes=${n.indexes}`);
    break;
  }
  case 'stats':
    console.log(JSON.stringify({ ...g.summary, generatedAt: g.generatedAt }, null, 2));
    break;
  default:
    console.log(fs.readFileSync(url.fileURLToPath(import.meta.url), 'utf8')
      .split('\n').slice(1, 30).map((l) => l.replace(/^ \*ature?\/?/, '').replace(/^ \* ?/, '')).join('\n'));
}
