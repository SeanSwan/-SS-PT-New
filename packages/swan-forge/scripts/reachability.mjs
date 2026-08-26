// Import-graph reachability from the app's route entry (Rule 26/27 evidence, deterministic).
// Usage: node reachability.mjs <frontend/src root> <entry file> <candidates.txt>
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
const [root, entry, candFile] = process.argv.slice(2);
const exists = (p) => { try { return statSync(p).isFile(); } catch { return false; } };
/**
 * Candidates may be written relative to cwd OR to <root> (both read naturally); a path that
 * resolves to nothing is reported MISSING, never UNREACHABLE.
 * Why: `resolve(p)` alone silently produced UNREACHABLE for every candidate written relative to
 * root — including a KNOWN-LIVE positive control — and this tool's verdicts drive Rule 77
 * quarantine proposals. "I cannot find your file" must never render as "your file is dead."
 * (Own T2 round-0 finding, 2026-08-25; Ox R2 asked for exactly this typo guard.)
 */
const cands = readFileSync(candFile, 'utf8').trim().split('\n').filter(Boolean).map((p) => {
  const asIs = resolve(p.trim());
  if (exists(asIs)) return asIs;
  const underRoot = resolve(join(root, p.trim()));
  return exists(underRoot) ? underRoot : { missing: p.trim() };
});
const exts = ['.tsx', '.ts', '.jsx', '.js', '.mjs'];
const tryFile = (p) => { for (const e of ['', ...exts, ...exts.map((x) => '/index' + x)]) { const f = p + e; if (existsSync(f) && statSync(f).isFile()) return f; } return null; };
const resolveImport = (from, spec) => {
  if (spec.startsWith('@/')) return tryFile(join(root, spec.slice(2)));
  if (spec.startsWith('.')) return tryFile(resolve(dirname(from), spec));
  return null; // bare package
};
const seen = new Set(); const queue = [resolve(entry)]; const edges = new Map();
while (queue.length) {
  const f = queue.pop(); if (seen.has(f)) continue; seen.add(f);
  let src; try { src = readFileSync(f, 'utf8'); } catch { continue; }
  const specs = [...src.matchAll(/(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|import\s*['"]([^'"]+)['"]/g)].map((m) => m[1] || m[2] || m[3]);
  for (const s of specs) { const r = resolveImport(f, s); if (r) { if (!edges.has(r)) edges.set(r, f); queue.push(r); } }
}
const rel = (p) => p.replace(/\\/g, '/').split('/frontend/src/')[1] ?? p;
let missing = 0;
for (const c of cands) {
  if (typeof c === 'object') { missing++; console.log(`MISSING\t${c.missing}\t<- path does not resolve from cwd OR from root; NOT a reachability verdict`); continue; }
  const hit = seen.has(c);
  let chain = [];
  if (hit) { let cur = c; for (let i = 0; i < 6 && edges.has(cur); i++) { cur = edges.get(cur); chain.push(rel(cur)); } }
  console.log(`${hit ? 'REACHABLE' : 'UNREACHABLE'}\t${rel(c)}${hit ? '\t<- ' + chain.join(' <- ') : ''}`);
}
console.error(`graph: ${seen.size} files reached from ${rel(resolve(entry))}${missing ? ` · ${missing} candidate path(s) MISSING — fix those before trusting any UNREACHABLE above` : ''}`);
// A run whose graph is implausibly small never resolved the entry — refuse to emit quarantine bait.
if (seen.size < 50) { console.error(`REFUSING: only ${seen.size} file(s) reached — the entry did not resolve. Verdicts above are meaningless.`); process.exit(2); }
