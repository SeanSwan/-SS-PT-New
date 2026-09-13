/**
 * Diff CI's receipt against the local one to name the exact links that differ.
 *
 * The CI run failed on ledger growth of exactly one link in
 * docs/ai-workflow/AI-HANDOFF/ (577 -> 578). That is either a new dead link or a
 * platform difference in external-link reachability. Name it rather than assume.
 */
import fs from 'node:fs';

const a = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); // CI
const b = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')); // local

const key = (d) => `${d.file}\u0000${d.link}`;
const inCi = new Set(a.excludedDead.map(key));
const inLocal = new Set(b.excludedDead.map(key));

const onlyCi = a.excludedDead.filter((d) => !inLocal.has(key(d)));
const onlyLocal = b.excludedDead.filter((d) => !inCi.has(key(d)));

console.log('CI   excludedDead:', a.excludedDead.length, ' inScopeDead:', a.counts.inScopeDead);
console.log('local excludedDead:', b.excludedDead.length, ' inScopeDead:', b.counts.inScopeDead);
console.log('\ndead in CI but not locally:', onlyCi.length);
for (const d of onlyCi) console.log(`   ${d.statusCode}  ${d.link}\n        ${d.file}`);
console.log('\ndead locally but not in CI:', onlyLocal.length);
for (const d of onlyLocal.slice(0, 20)) console.log(`   ${d.statusCode}  ${d.link}\n        ${d.file}`);

console.log('\nper-entry CI vs recorded baseline:');
for (const row of a.ledger) {
  const mark = row.observed > row.recorded ? '  <-- OVER' : '';
  console.log(`  ${String(row.observed).padStart(5)} / ${String(row.recorded).padStart(5)}  ${row.path}${mark}`);
}
