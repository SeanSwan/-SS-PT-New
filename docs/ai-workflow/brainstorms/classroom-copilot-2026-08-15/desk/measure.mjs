/**
 * Development run. Tuned-against numbers — read `heldout-run.mjs` for the honest ones.
 * Run: node measure.mjs
 *
 * Three sections:
 *   CORPUS     the hand-written development set
 *   PROBES     regression cases found by adversarial probing during the build
 *   INVARIANTS degraded-input checks that cannot be expressed as (text -> verdict),
 *              because the thing under test is the roster or the argument type
 */
import { check, withPlaceholders, rosterCollisions } from './desk.mjs';
import { ROSTER, CANARIES } from './fixture-children.mjs';
import { CORPUS, PROBES } from './corpus.mjs';

let failed = 0;

function run(label, cases) {
  let pass = 0;
  console.log(`\n${label}`);
  for (const c of cases) {
    const v = check(c.text, ROSTER, CANARIES);
    const ok = v.verdict === c.want;
    if (ok) pass += 1;
    else {
      failed += 1;
      console.log(`  FAIL ${c.id.padEnd(6)} want=${c.want} got=${v.verdict} (stage ${v.stage})`);
      console.log(`       "${c.text}"`);
    }
  }
  console.log(`  ${pass}/${cases.length} (${((pass / cases.length) * 100).toFixed(1)}%)`);
}

run('CORPUS — development set', CORPUS);
run('PROBES — regressions found by adversarial probing', PROBES);

console.log('\nINVARIANTS — degraded input must fail closed');
const invariants = [
  ['non-string text',   () => check(undefined, ROSTER, CANARIES)],
  ['null text',         () => check(null, ROSTER, CANARIES)],
  ['roster missing',    () => check('Priya painted today')],
  ['roster empty',      () => check('Priya painted today', [], [])],
  ['roster not a list', () => check('Priya painted today', 'nope', [])],
  ['child with no name', () => check('hello', [{ id: 'x' }], [])],
  ['child with blank name', () => check('hello', [{ id: 'x', name: '  ' }], [])],
];
for (const [label, fn] of invariants) {
  const v = fn();
  const ok = v.verdict === 'REFUSED' && v.outbound === null;
  if (!ok) { failed += 1; console.log(`  FAIL ${label} -> ${v.verdict} outbound=${JSON.stringify(v.outbound)}`); }
  else console.log(`  ok   ${label.padEnd(18)} -> REFUSED, nothing copied`);
}

// A blank nickname compiles to an empty pattern, which matches at every punctuation
// gap and would spray "Child A" through her text. The child still has a real name,
// so this is a typo to survive, not a roster to refuse.
const blank = withPlaceholders([{ id: 'b1', name: 'Rafi', nicknames: ['  ', ''] }, { id: 'b2', name: 'Priya' }]);
const blankOut = check('hello, world, Priya painted, it was lovely', blank, ['']).outbound;
const blankOk = blankOut === 'hello, world, Child B painted, it was lovely';
if (!blankOk) { failed += 1; console.log(`  FAIL blank nickname -> ${JSON.stringify(blankOut)}`); }
else console.log('  ok   blank nickname      -> ignored, not sprayed through the text');

// Placeholders must not repeat: two children sharing "Child A" re-hydrate to the wrong one.
const many = withPlaceholders(Array.from({ length: 30 }, (_, i) => ({ id: `k${i}`, name: `N${i}` })));
const uniqueOk = new Set(many.map((c) => c.placeholder)).size === 30;
if (!uniqueOk) { failed += 1; console.log('  FAIL placeholders repeat past 26 children'); }
else console.log('  ok   30-child roster     -> 30 distinct placeholders');

const collisionOk = rosterCollisions(withPlaceholders([
  { id: 'a', name: 'Leo' }, { id: 'b', name: 'leo', nicknames: ['Lee'] }, { id: 'c', name: 'Ash', nicknames: ['Lee'] },
])).length === 2;
if (!collisionOk) { failed += 1; console.log('  FAIL duplicate-name detection'); }
else console.log('  ok   duplicate names     -> reported before they reach a family note');

console.log('\n' + '-'.repeat(72));
console.log(failed === 0 ? 'All development checks pass.' : `${failed} development check(s) FAILED.`);
console.log('-'.repeat(72));
if (failed > 0) process.exit(1);
