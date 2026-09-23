/**
 * S17 — verification of the numbers hostile review disputed.
 *
 * Answers, from the artifacts rather than from prose:
 *   1. Did the old engine validate same-document anchors at all?
 *      (CI log dead-link classes; the parser emits 'same-file-anchor'.)
 *   2. Did it validate mailto? (Reviewer says yes — the doc claimed otherwise.)
 *   3. How many excluded dead links are ephemeral Google grounding redirects,
 *      in total and inside the generated-transcript directories?
 *   4. How many in-scope anchor failures were there really — 51 or 55?
 *   5. Was the 3.14.2 baseline measured on a contaminated tree?
 */
import fs from 'node:fs';

const A = '.mega-blueprints/artifacts/docs-link-debt-20260913';
const ci = JSON.parse(fs.readFileSync(`${A}/docs-baseline-inventory.json`, 'utf8'));
const base = JSON.parse(fs.readFileSync(`${A}/gate-baseline-3.14.2.json`, 'utf8'));

console.log('=== 1/2. What the OLD engine (CI log) actually flagged ===');
console.log('classes across the whole CI log:', JSON.stringify(ci.byClass));
const ciAnchors = ci.perFile.flatMap((f) => f.broken.filter((b) => b.class === 'same-file-anchor'));
console.log(`same-document anchor failures in the CI log: ${ciAnchors.length}`);
const ciMailto = ci.perFile.flatMap((f) => f.broken.filter((b) => b.target.startsWith('mailto:')));
console.log(`mailto failures in the CI log: ${ciMailto.length}`);
ciMailto.slice(0, 4).forEach((m) => console.log(`   ${m.target}`));

console.log('\n=== 3. Excluded ledger composition ===');
const ex = base.excludedDead;
const isGrounding = (l) => String(l).includes('vertexaisearch.cloud.google.com');
const inTranscripts = (f) =>
  f.startsWith('AI-Village-Documentation/validation-prompts/') || f.startsWith('docs/ai-workflow/validation-reports/');
console.log(`excluded dead links (this receipt): ${ex.length}`);
console.log(`  ephemeral Google grounding redirects, ALL excluded: ${ex.filter((d) => isGrounding(d.link)).length}`);
const tx = ex.filter((d) => inTranscripts(d.file));
console.log(`  dead links inside generated-transcript dirs: ${tx.length}`);
console.log(`    of which grounding redirects: ${tx.filter((d) => isGrounding(d.link)).length}`);
console.log(`    of which ordinary external 404s: ${tx.filter((d) => !isGrounding(d.link)).length}`);
console.log(`  grounding redirects OUTSIDE the transcript dirs: ${ex.filter((d) => isGrounding(d.link) && !inTranscripts(d.file)).length}`);

console.log('\n=== 4. In-scope anchor failures in the 3.14.2 baseline ===');
const anchorRe = /^#/;
const baseAnchors = base.inScopeDead.filter((d) => anchorRe.test(String(d.link)));
console.log(`in-scope dead links total: ${base.inScopeDead.length}`);
console.log(`  of which same-document anchors: ${baseAnchors.length}`);
console.log(`  other: ${base.inScopeDead.length - baseAnchors.length}`);

console.log('\n=== 5. Was the 3.14.2 baseline measured on a moving tree? ===');
console.log(`receipt timestamp: ${base.at}  (concurrency ${base.concurrency}, scope ${base.scope})`);
const filesWithDeaths = [...new Set(base.inScopeDead.map((d) => d.file))];
let newer = 0;
for (const f of filesWithDeaths) {
  try {
    const m = fs.statSync(f).mtime.toISOString();
    if (m > base.at) newer += 1;
  } catch {
    /* ignore */
  }
}
console.log(`in-scope files whose mtime is AFTER the receipt timestamp: ${newer} of ${filesWithDeaths.length}`);
