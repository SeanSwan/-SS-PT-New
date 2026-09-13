#!/usr/bin/env node
/**
 * S17 triage query: print the dead links for chosen areas so the repair
 * decision is made from data rather than from the headline count.
 * Read-only over the parsed inventory.
 *
 * usage: node query-inventory.mjs <inventory.json> [area ...]
 */
import fs from 'node:fs';

const inv = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const wanted = process.argv.slice(3);

let files = 0;
let links = 0;
for (const rec of inv.perFile) {
  if (wanted.length && !wanted.includes(rec.area)) continue;
  files += 1;
  console.log(`\n### ${rec.file}  [${rec.area}]  dead=${rec.dead}`);
  for (const b of rec.broken) {
    links += 1;
    const abs = b.missingAbs ? ` :: ${b.missingAbs}` : '';
    console.log(`   - [${b.class}] ${b.target}${b.status ? ` (${b.status})` : ''}${abs}`);
  }
}
console.log(`\n== ${files} files, ${links} links ==`);
