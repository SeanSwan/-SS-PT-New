// Import-graph reachability from the app's route entry (Rule 26/27 evidence, deterministic).
// Usage: node reachability.mjs <frontend/src root> <entry file> <candidates.txt>
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
const [root, entry, candFile] = process.argv.slice(2);
const cands = readFileSync(candFile, 'utf8').trim().split('\n').filter(Boolean).map((p) => resolve(p));
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
for (const c of cands) {
  const hit = seen.has(c);
  let chain = [];
  if (hit) { let cur = c; for (let i = 0; i < 6 && edges.has(cur); i++) { cur = edges.get(cur); chain.push(rel(cur)); } }
  console.log(`${hit ? 'REACHABLE' : 'UNREACHABLE'}\t${rel(c)}${hit ? '\t<- ' + chain.join(' <- ') : ''}`);
}
console.error(`graph: ${seen.size} files reached from ${rel(resolve(entry))}`);
