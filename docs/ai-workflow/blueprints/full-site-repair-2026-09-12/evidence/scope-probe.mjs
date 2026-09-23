#!/usr/bin/env node
/**
 * S17 scope probe: partition the baseline dead links by the *proposed* check
 * scope, so the repair set is enumerated rather than estimated.
 *
 * Proposed exclusion (each entry must carry a reason and be recorded in the
 * in-repo scope manifest before it is honoured):
 *   .agents/ .claude/ .continue/ .cursor/   vendored upstream skill bundles
 *   archive/                                self-declared frozen / pending-deletion
 *   AI-Village-Documentation/validation-prompts/   saved model transcripts
 *   docs/ai-workflow/AI-HANDOFF/            frozen historical receipts
 *
 * usage: node scope-probe.mjs <inventory.json>
 */
import fs from 'node:fs';

const EXCLUDED = [
  ['.agents/', 'vendored upstream skill bundle (hash in skills-lock.json)'],
  ['.claude/', 'vendored upstream skill bundle (hash in skills-lock.json)'],
  ['.continue/', 'vendored upstream skill bundle (hash in skills-lock.json)'],
  ['.cursor/', 'vendored upstream skill bundle (hash in skills-lock.json)'],
  ['archive/', 'frozen record: self-declared pending-deletion archive'],
  ['docs/ai-workflow/archive/', 'frozen record: archived phase audits'],
  ['docs/_attic/', 'frozen record: attic'],
  ['AI-Village-Documentation/validation-prompts/', 'generated transcript (ephemeral grounding URLs)'],
  ['docs/ai-workflow/validation-reports/', 'generated transcript (validation-orchestrator.mjs:191 legacyReportDir)'],
  ['docs/ai-workflow/AI-HANDOFF/', 'frozen record: historical receipts (preservation rule)'],
];

const inv = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

const inScope = [];
const outScope = [];
for (const rec of inv.perFile) {
  const hit = EXCLUDED.find(([p]) => rec.file.startsWith(p));
  (hit ? outScope : inScope).push({ rec, reason: hit ? hit[1] : null });
}

const sum = (a) => a.reduce((s, x) => s + x.rec.dead, 0);
const cls = (a) => {
  const o = { 'external-url': 0, 'internal-missing-file': 0, other: 0 };
  for (const x of a) for (const b of x.rec.broken) o[b.class] = (o[b.class] || 0) + 1;
  return o;
};

console.log(`IN SCOPE : ${inScope.length} files, ${sum(inScope)} dead links ${JSON.stringify(cls(inScope))}`);
console.log(`EXCLUDED : ${outScope.length} files, ${sum(outScope)} dead links ${JSON.stringify(cls(outScope))}`);
console.log('\n--- EXCLUDED breakdown by reason ---');
const byReason = {};
for (const x of outScope) {
  byReason[x.reason] = byReason[x.reason] || { files: 0, links: 0 };
  byReason[x.reason].files += 1;
  byReason[x.reason].links += x.rec.dead;
}
for (const [r, v] of Object.entries(byReason).sort((a, b) => b[1].links - a[1].links)) {
  console.log(`  ${String(v.links).padStart(5)} links / ${String(v.files).padStart(3)} files  ${r}`);
}

console.log('\n--- IN-SCOPE FILES (the repair set) ---');
inScope.sort((a, b) => b.rec.dead - a.rec.dead);
for (const { rec } of inScope) {
  console.log(`\n### ${rec.file} (${rec.dead})`);
  for (const b of rec.broken) console.log(`   - [${b.class}] ${b.target}${b.status ? ` (${b.status})` : ''}`);
}
