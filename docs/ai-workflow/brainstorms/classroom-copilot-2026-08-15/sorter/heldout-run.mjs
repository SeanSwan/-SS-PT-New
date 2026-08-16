/**
 * Held-out adversarial run. This is the honest accuracy number.
 * Run: node heldout-run.mjs
 */
import { sort } from './sorter.mjs';
import { HELDOUT, ROSTER } from './heldout.mjs';

let expectedTotal = 0;
let correct = 0;
let falsePositives = 0;
let childLinkViolations = 0;
let unflaggedChildItems = 0;

console.log('='.repeat(72));
console.log('HELD-OUT ADVERSARIAL CORPUS — the honest number');
console.log('='.repeat(72));

for (const c of HELDOUT) {
  const { items, unmatched } = sort(c.text, ROSTER);
  const got = items.map((i) => i.type);
  const remaining = [...c.expect];
  let matched = 0;

  for (const t of got) {
    const i = remaining.indexOf(t);
    if (i >= 0) { remaining.splice(i, 1); matched += 1; }
  }

  const surplus = [...got];
  for (const t of c.expect) {
    const i = surplus.indexOf(t);
    if (i >= 0) surplus.splice(i, 1);
  }
  const tolerated = c.tolerate || [];
  const badSurplus = surplus.filter((t) => !tolerated.includes(t));

  // Hard invariants
  if (c.mustNotChildLink && items.some((i) => i.childRef)) childLinkViolations += 1;
  for (const item of items) {
    if ((item.type === 'observation' || item.type === 'child_followup') && !item.needsReview) {
      unflaggedChildItems += 1;
    }
  }

  expectedTotal += c.expect.length;
  correct += matched;
  falsePositives += badSurplus.length;

  const ok = matched === c.expect.length && badSurplus.length === 0;
  const status = ok ? 'PASS' : 'FAIL';
  console.log(`\n[${status}] ${c.id}`);
  console.log(`   trap: ${c.trap}`);
  for (const item of items) {
    const child = item.childRef ? ` child=${item.childRef}(${item.childVia})` : '';
    const flag = item.needsReview ? ' ⚑' : '';
    console.log(`     -> ${item.type.padEnd(15)} c=${item.confidence}${child}${flag} "${item.body.slice(0, 46)}"`);
  }
  for (const u of unmatched) console.log(`     -> ${'UNTYPED'.padEnd(15)} "${u.slice(0, 46)}"`);
  if (remaining.length) console.log(`     MISSED: ${remaining.join(', ')}`);
  if (badSurplus.length) console.log(`     FALSE POSITIVE: ${badSurplus.join(', ')}`);
  if (c.note) console.log(`     note: ${c.note}`);
}

const recall = expectedTotal ? (correct / expectedTotal) * 100 : 100;

console.log('\n' + '='.repeat(72));
console.log(`Expected fragments        ${expectedTotal}`);
console.log(`Correctly typed           ${correct}  (${recall.toFixed(1)}% recall)`);
console.log(`False positives           ${falsePositives}  (invented items — the expensive error)`);
console.log(`Child-link violations     ${childLinkViolations}  (must be 0)`);
console.log(`Unflagged child items     ${unflaggedChildItems}  (must be 0)`);
console.log('='.repeat(72));

if (childLinkViolations > 0 || unflaggedChildItems > 0) {
  console.error('\nFAIL: a hard child-safety invariant was violated.');
  process.exit(1);
}
