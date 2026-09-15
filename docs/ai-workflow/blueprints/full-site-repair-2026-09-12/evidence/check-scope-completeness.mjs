#!/usr/bin/env node
/**
 * S17 scope completeness check: are there archive-class directories the
 * manifest does not yet cover? Run before finalising the exclusion list, so the
 * "frozen record" class is applied uniformly rather than only where it was
 * noticed first. Read-only over a gate receipt.
 */
import fs from 'node:fs';

const r = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const all = [
  ...r.inScopeDead.map((d) => ({ ...d, scope: 'IN' })),
  ...r.excludedDead.map((d) => ({ ...d, scope: 'EX' })),
];
const counts = {};
for (const d of all) counts[d.file] = (counts[d.file] || 0) + 1;

const prefixes = ['docs/archive/', 'AI-Village-Documentation/archive/', '"archive/'];
for (const p of prefixes) {
  const hits = Object.entries(counts).filter(([f]) => f.startsWith(p));
  const total = hits.reduce((s, [, n]) => s + n, 0);
  console.log(`\n### prefix ${JSON.stringify(p)} -> ${hits.length} failing files, ${total} dead links`);
  hits.sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([f, n]) => console.log(`   ${String(n).padStart(3)}  ${f}`));
}

console.log('\n### other archive/attic-named failing files not covered by a listed prefix');
Object.entries(counts)
  .filter(([f]) => /archive|attic/i.test(f) && !prefixes.some((p) => f.startsWith(p)))
  .sort((a, b) => b[1] - a[1])
  .slice(0, 25)
  .forEach(([f, n]) => console.log(`   ${String(n).padStart(3)}  ${f}`));
