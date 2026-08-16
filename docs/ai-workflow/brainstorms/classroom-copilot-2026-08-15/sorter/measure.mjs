/**
 * Accuracy harness for the rules-only sorter.
 *
 * Reports the number that matters to the kill criterion: what fraction of a real
 * dump comes back correctly typed with NO model involved. The panel's bar for the
 * full pipeline is >=90% accepted without correction; the rules path is expected to
 * land well below that on its own, and the point of this harness is to know exactly
 * where — because that gap is precisely what the local model has to buy.
 *
 * Run: node measure.mjs [--verbose]
 */
import { sort } from './sorter.mjs';
import { CORPUS, ROSTER } from './corpus.mjs';

const verbose = process.argv.includes('--verbose');

let totalExpected = 0;
let totalCorrect = 0;
let totalEmitted = 0;
let totalUnmatched = 0;
let childLinkedTotal = 0;
let childLinkedCorrectlyFlagged = 0;
const confusion = new Map();

const rows = [];

for (const testCase of CORPUS) {
  const { items, unmatched } = sort(testCase.text, ROSTER);

  // Order-independent multiset comparison of types.
  const expected = [...testCase.expect];
  const got = items.map((i) => i.type);
  const remaining = [...expected];
  let matched = 0;

  for (const type of got) {
    const idx = remaining.indexOf(type);
    if (idx >= 0) {
      remaining.splice(idx, 1);
      matched += 1;
    }
  }

  // Record what we produced that wasn't expected, for the confusion view.
  const surplus = [...got];
  for (const type of expected) {
    const idx = surplus.indexOf(type);
    if (idx >= 0) surplus.splice(idx, 1);
  }
  for (const type of surplus) {
    confusion.set(type, (confusion.get(type) || 0) + 1);
  }

  for (const item of items) {
    if (item.type === 'observation' || item.type === 'child_followup') {
      childLinkedTotal += 1;
      if (item.needsReview) childLinkedCorrectlyFlagged += 1;
    }
  }

  totalExpected += expected.length;
  totalCorrect += matched;
  totalEmitted += items.length;
  totalUnmatched += unmatched.length;

  const pct = expected.length ? Math.round((matched / expected.length) * 100) : 100;
  rows.push({ id: testCase.id, matched, expected: expected.length, pct, missed: remaining, unmatched });

  if (verbose) {
    console.log(`\n── ${testCase.id} ── ${matched}/${expected.length} (${pct}%)`);
    for (const item of items) {
      const child = item.childRef ? ` child=${item.childRef}(${item.childVia})` : '';
      const due = item.due ? ` due=${item.due}` : '';
      const flag = item.needsReview ? ' ⚑review' : '';
      console.log(`   ${item.type.padEnd(15)} c=${item.confidence}${child}${due}${flag}  "${item.body.slice(0, 58)}"`);
    }
    for (const u of unmatched) console.log(`   ${'UNTYPED'.padEnd(15)}  "${u.slice(0, 58)}"`);
    if (remaining.length) console.log(`   MISSED: ${remaining.join(', ')}`);
  }
}

console.log('\n' + '='.repeat(64));
console.log('RULES-ONLY SORTER — ACCURACY');
console.log('='.repeat(64));

for (const r of rows) {
  const bar = '█'.repeat(Math.round(r.pct / 5)).padEnd(20, '·');
  const note = r.missed.length ? ` missed: ${r.missed.join(',')}` : '';
  const un = r.unmatched.length ? ` +${r.unmatched.length} untyped` : '';
  console.log(`${r.id.padEnd(20)} ${bar} ${String(r.pct).padStart(3)}%${note}${un}`);
}

const typeAccuracy = (totalCorrect / totalExpected) * 100;
const flagRate = childLinkedTotal ? (childLinkedCorrectlyFlagged / childLinkedTotal) * 100 : 100;

console.log('-'.repeat(64));
console.log(`Fragments expected        ${totalExpected}`);
console.log(`Correctly typed           ${totalCorrect}  (${typeAccuracy.toFixed(1)}%)`);
console.log(`Emitted                   ${totalEmitted}`);
console.log(`Returned untyped          ${totalUnmatched}  (never silently dropped)`);
console.log(`Child-linked items        ${childLinkedTotal}`);
console.log(`  flagged for review      ${childLinkedCorrectlyFlagged}  (${flagRate.toFixed(1)}%)  <- must be 100%`);

if (confusion.size) {
  console.log('\nSurplus / mis-typed emissions:');
  for (const [type, n] of [...confusion].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type.padEnd(16)} ${n}`);
  }
}

console.log('\n' + '-'.repeat(64));
console.log(`GATE 1  rules-only type accuracy   ${typeAccuracy.toFixed(1)}%`);
console.log(`GATE 2  child items flagged        ${flagRate.toFixed(1)}%  (hard requirement: 100%)`);
console.log(`GATE 3  silent drops               ${totalUnmatched > 0 ? 'none — untyped items returned' : 'none'}`);
console.log('-'.repeat(64));

// Gate 2 is the one that must never regress: an unflagged child item is the
// unrecoverable error the panel named. Fail the run if it is not 100%.
if (flagRate < 100) {
  console.error('\nFAIL: a child-linked item was emitted without a review flag.');
  process.exit(1);
}
