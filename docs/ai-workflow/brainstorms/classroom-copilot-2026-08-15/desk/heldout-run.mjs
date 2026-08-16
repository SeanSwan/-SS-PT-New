/**
 * Held-out adversarial run. This is the honest number.
 * Run: node heldout-run.mjs
 *
 * Three numbers matter, in this order:
 *
 *   BLOCK RECALL   — of everything that should have been refused, how much was.
 *                    A miss here is a child's circumstance on a cloud provider's
 *                    servers. Target ≥98% for the full pipeline; this file measures
 *                    only the deterministic floor, so its number will be lower and
 *                    must not be quoted as the system's.
 *
 *   FALSE BLOCK    — of everything that should have passed, how much was refused.
 *                    Guardrail ≤10%. Above that she abandons the tool, and every
 *                    control in the design evaporates at once. This number is not
 *                    a nice-to-have; it is the other half of the safety argument.
 *
 *   MIDDLE LANE    — what share landed in NAMED_ORDINARY. This is the number that
 *                    decides whether the Desk is worth building at all. If it is
 *                    near zero, Kimi K3's dissent wins: two lanes and a rule, no tool.
 *
 * Hard invariants (exit 1): a refusal must never emit outbound text, and no roster
 * name or canary may ever appear in outbound text.
 */
import { check, rosterCollisions } from './desk.mjs';
import { ROSTER, CANARIES } from './roster.fixture.mjs';
import { HELDOUT } from './heldout.mjs';

const collisions = rosterCollisions(ROSTER);
if (collisions.length) {
  console.log(`ROSTER WARNING — these names appear twice and will collapse to one `
    + `placeholder, which re-hydrates to the wrong child: ${collisions.join(', ')}\n`);
}

const shouldRefuse = HELDOUT.filter((c) => c.want === 'REFUSED');
const shouldPass = HELDOUT.filter((c) => c.want !== 'REFUSED');

let blocked = 0;
let falseBlocks = 0;
let middleLane = 0;
let escapes = 0;    // identifying text actually reached outbound — fatal
let netCatches = 0; // the last-resort leak check fired and refused — control worked
const misses = [];
const knownGaps = [];

console.log('='.repeat(74));
console.log('HELD-OUT ADVERSARIAL CORPUS — deterministic floor only');
console.log('='.repeat(74));

for (const c of HELDOUT) {
  const v = check(c.text, ROSTER, CANARIES);
  const ok = v.verdict === c.want;

  // I1 — a refusal must never produce copyable text.
  if (v.verdict === 'REFUSED' && v.outbound !== null) escapes += 1;
  // I2 — nothing identifying may survive into OUTBOUND. A `breach` with outbound
  // already null means the last-resort net caught what an earlier stage missed:
  // the control worked, and counting it as a failure would have hidden that the
  // real defect is upstream. It is reported loudly and is not fatal.
  if (v.breach && v.outbound !== null) escapes += 1;
  else if (v.breach) netCatches += 1;

  if (c.want === 'REFUSED' && v.verdict === 'REFUSED') blocked += 1;
  if (c.want !== 'REFUSED' && v.verdict === 'REFUSED') falseBlocks += 1;
  if (v.verdict === 'NAMED_ORDINARY') middleLane += 1;
  if (!ok) (c.knownGap ? knownGaps : misses).push({ ...c, got: v });

  console.log(`\n[${ok ? 'PASS' : 'MISS'}] ${c.id}  want=${c.want}  got=${v.verdict} (stage ${v.stage})`);
  console.log(`   trap: ${c.trap}`);
  if (v.outbound && v.outbound !== c.text) console.log(`   out : "${v.outbound.slice(0, 68)}"`);
  if (v.breach) console.log(`   BREACH: "${v.breach}" survived into outbound`);
  if (!ok) console.log(`   why : ${v.reason}`);
}

const recall = shouldRefuse.length ? (blocked / shouldRefuse.length) * 100 : 100;
const fbRate = shouldPass.length ? (falseBlocks / shouldPass.length) * 100 : 0;

console.log('\n' + '='.repeat(74));
console.log(`Block recall (Class C)    ${blocked}/${shouldRefuse.length}   ${recall.toFixed(1)}%   target >=98% for the FULL pipeline`);
console.log(`False-block rate          ${falseBlocks}/${shouldPass.length}   ${fbRate.toFixed(1)}%   guardrail <=10%`);
console.log(`Middle lane occupancy     ${middleLane}/${HELDOUT.length}   ${((middleLane / HELDOUT.length) * 100).toFixed(1)}%   (is the Desk worth building?)`);
console.log(`Escapes                   ${escapes}   MUST be 0 — identifying text reached outbound`);
console.log(`Net catches               ${netCatches}   last-resort check fired; upstream stage missed it`);
console.log('='.repeat(74));

if (misses.length) {
  console.log('\nMISSES — each is a real defect or a corpus disagreement, not noise:');
  for (const m of misses) {
    console.log(`\n  ${m.id}  want ${m.want}, got ${m.got.verdict}`);
    console.log(`      "${m.text}"`);
    console.log(`      trap: ${m.trap}`);
  }
}

if (knownGaps.length) {
  console.log('\nKNOWN GAPS — accepted limits of the deterministic floor, not regressions:');
  for (const g of knownGaps) console.log(`  ${g.id}  ${g.trap}\n      -> ${g.why}`);
}

if (escapes > 0) {
  console.error('\nFAIL: identifying text reached outbound.');
  process.exit(1);
}
