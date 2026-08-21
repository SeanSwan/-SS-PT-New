#!/usr/bin/env node
/**
 * swan-brain — query the Karpathy Wiki (Hermes brain-vault) from inside this repo.
 *
 * One search surface over everything Sean has put in his brain: books, PDFs, repo docs, design
 * claims, his visual taste, and the Midjourney reference archive. Hermes already reaches this
 * through its MCP tools; this gives Codex and Claude the same reach from a terminal.
 *
 *   node scripts/swan-brain.mjs "chaos parameter"
 *   node scripts/swan-brain.mjs --collection swan-midlibrary "sref codes for cinematic"
 *   node scripts/swan-brain.mjs --open 4310            read a result in full
 *   node scripts/swan-brain.mjs --collections          what is in the brain
 *
 * The vault lives OUTSIDE this repo (WSL: ~/hermes2/brain-vault) and holds third-party
 * copyrighted material — books, PDFs, a subscription archive. That content must never be copied
 * into this repository or any other git tree. This tool reads; it never writes and never exports.
 * Quote sparingly in commits and docs: cite the source, do not paste the corpus.
 */
import { execFileSync } from 'node:child_process';

const VAULT = '/home/bigotsmasher/hermes2/brain-vault';
const argv = process.argv.slice(2);
const flag = (f, d = null) => { const i = argv.indexOf(f); return i > -1 && argv[i + 1] ? argv[i + 1] : d; };
const has = (f) => argv.includes(f);

if (!argv.length || has('-h') || has('--help')) {
  console.log(`
swan-brain — search Sean's Karpathy Wiki from this repo

  node scripts/swan-brain.mjs "<query>"                  search everything
  node scripts/swan-brain.mjs -c <collection> "<query>"  search one collection
  node scripts/swan-brain.mjs --open <id>                read a result in full
  node scripts/swan-brain.mjs --collections              list what is in the brain
  node scripts/swan-brain.mjs -n <limit> "<query>"       more results (default 5)

Search is FTS5: multiple words are ANDed. Two or three specific terms work far better
than a sentence, and a broad "a OR b OR c" probe under-returns rather than widening.

The vault is read-only from here and holds copyrighted reference material.
Cite what you find; never paste the corpus into this repo.
`.trim());
  process.exit(0);
}

/** Run python inside WSL. Args are passed via argv, never interpolated into a shell string —
 *  shell variables and quoting do not survive the Windows→WSL boundary intact. */
function vaultPy(code, ...args) {
  try {
    return execFileSync(
      'wsl.exe',
      ['--', 'python3', '-c', code, ...args.map(String)],
      { encoding: 'utf8', maxBuffer: 32 << 20, cwd: process.cwd() },
    );
  } catch (e) {
    const msg = (e.stderr || e.message || '').toString().trim();
    console.error(`\nCould not reach the brain-vault.\n${msg.split('\n').slice(-3).join('\n')}\n`);
    console.error(`Expected it at ${VAULT} inside WSL. Check: wsl.exe -- ls ${VAULT}\n`);
    process.exit(1);
  }
}

const PRELUDE = `
import sys, json
sys.path.insert(0, "${VAULT}/tools")
import hermes2_brain_search as brain
`;

if (has('--collections')) {
  const out = vaultPy(`${PRELUDE}
s = brain.index_status()
print(json.dumps(s.get("collections", []), indent=0))
`);
  const cols = JSON.parse(out);
  console.log(`\nKarpathy Wiki — ${cols.reduce((a, c) => a + c.documents, 0).toLocaleString()} documents\n`);
  for (const c of cols.sort((a, b) => b.documents - a.documents)) {
    console.log(`  ${String(c.documents).padStart(5)}  ${c.collection.padEnd(20)} ${(c.chars / 1e6).toFixed(1)} M chars`);
  }
  console.log();
  process.exit(0);
}

if (has('--open')) {
  const id = flag('--open');
  const out = vaultPy(`${PRELUDE}
d = brain.open_document(doc_id=int(sys.argv[1]), max_chars=int(sys.argv[2]))
print(d.get("text") or d.get("excerpt") or "")
`, id, flag('-n', '4000'));
  console.log(out);
  process.exit(0);
}

const collection = flag('-c', flag('--collection', ''));
const limit = flag('-n', flag('--limit', '5'));
const query = argv.filter((a, i) => !a.startsWith('-') && !['-c', '--collection', '-n', '--limit'].includes(argv[i - 1])).join(' ');

if (!query.trim()) { console.error('Give a query. See --help.'); process.exit(1); }

const out = vaultPy(`${PRELUDE}
hits = brain.search_index(query=sys.argv[1], collection=sys.argv[2], limit=int(sys.argv[3]))
print(json.dumps(hits))
`, query, collection, limit);

let hits;
try { hits = JSON.parse(out); } catch { console.error(out); process.exit(1); }

if (!hits.length) {
  console.log(`\nNo hits for "${query}"${collection ? ` in ${collection}` : ''}.`);
  console.log(`FTS ANDs your terms — try fewer, more specific words.\n`);
  process.exit(0);
}

console.log(`\n${hits.length} hit${hits.length === 1 ? '' : 's'} for "${query}"${collection ? ` in ${collection}` : ''}\n`);
for (const h of hits) {
  console.log(`[${h.id}] ${h.title}`);
  console.log(`      ${h.collection} · ${h.char_count.toLocaleString()} chars`);
  const snip = (h.snippet || '').replace(/\s+/g, ' ').trim();
  if (snip) console.log(`      ${snip.slice(0, 220)}…`);
  console.log();
}
console.log(`Read one in full:  node scripts/swan-brain.mjs --open <id>\n`);
