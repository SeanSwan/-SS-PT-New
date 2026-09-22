/**
 * hostile-round24-probe.mjs — THE DOCUMENT'S OWN MODULE COUNT, and the file table's CONVERSE.
 *
 * ── WHY THIS ROUND EXISTS ──────────────────────────────────────────────────
 * The ledger test picked this surface the way every round has: grep the document for the file,
 * and a surface with no mention is new ground. Round 18's section G came up — it is named in
 * exactly one sentence, and that sentence carries a NUMBER.
 *
 *   README.md:507  "...section G asserts that every module in `shared/providers/video/`,
 *                   `media-api/` and `backend/scripts/handlers/` has a ROW in the document"
 *                   — and the count that sentence then gave was 53, against 59 on disk.
 *
 * Measured 2026-09-19, before this file existed: **59** modules. This probe is itself a module in
 * `media-api/`, so the population it asserts is **60**, and the document states 60. The count moved
 * by one for a reason that is not drift, and the round says so rather than leaving a reader to
 * wonder why the narrative quotes two different measurements.
 *
 * Gate 25 (hostile-round18-probe.mjs, section G) enumerates the directories itself and prints
 * `all 59 have a row` while exiting 0. So the gate is right, the document is wrong, and the two
 * have been able to disagree for five rounds.
 *
 * ── THE DEFECT IS NOT THE NUMBER. IT IS THE SHAPE OF THE CHECK. ─────────────
 * Gate 25 DERIVES the count and asserts only `modules.length >= 45` (its line 547). It PRINTS the
 * live count (its line 551) and nothing ever compares that print to the prose. A derived value
 * that is never compared to the document's stated value is not a check on the document: the gate
 * cannot fail on a drifted document, so the drift is invisible. The +6 is in the UNDER-claiming
 * direction, which rule 75 calls a correctness problem rather than a cosmetic one.
 *
 * This is the FIFTH appearance of one class in this lane, and the first four were each fixed by
 * editing the number that had drifted:
 *
 *   round 20  two hand-written counts drifted; nothing read the prose
 *   round 21  five more, and G5: "a self-consistency check has to be TOTAL over the places the
 *             fact is stated, not over the one the author happened to be editing"
 *   round 23  section E made the gate count, the defect total and the assertion total total over
 *             every place each is written — and stopped one surface short of this one
 *   round 24  this one
 *
 * Each fix was correct and each fix was scoped to the numbers the author was editing at the time.
 * So this round does not merely correct 53 to 60. It makes the stated count ASSERTED, so the next
 * drift fails a gate instead of waiting for someone to notice.
 *
 * ── WHY THE NUMBER IS KEPT RATHER THAN DELETED ─────────────────────────────
 * The stronger fix is to stop stating a derivable number at all, and that was considered. It was
 * rejected because the number is genuinely useful to a reader and because this lane's established
 * convention is to keep the number and assert it — E1 through E4 of round 23 all assert a stated
 * number against a derived one, and E4 was NARROWED rather than deleted when it over-fired.
 * A number that is asserted is redundant but honest; a number that is deleted is information the
 * next reader has to re-derive. Recorded so the trade-off is visible rather than implicit.
 *
 * ── SECTION B IS NEW GROUND GATE 25 CANNOT REACH ───────────────────────────
 * Gate 25 asserts one direction: every module has a ROW. Nothing asserts the CONVERSE — that every
 * row names a module that exists. An orphan row (documentation for a file that was deleted, or a
 * row invented for a file that never existed) is invisible to gate 25 by construction, and the
 * document is the licensor's evidence. Measured at the time of writing: 59 of them, 59 distinct
 * row names, 0 orphans, 0 missing — an exact bijection, so this check is currently clean and is a
 * ratchet rather than a repair. (59 before this file existed, 60 after: this probe is a module in
 * one of the three directories, so writing the check is what moved the population it asserts.)
 *
 * ── WHAT THIS ROUND DOES NOT DO ────────────────────────────────────────────
 * No job is created, no queue is contacted, no server is started, no provider is enabled, and no
 * file is written anywhere. This probe reads two files and one directory listing.
 */

import { readFileSync, readdirSync } from 'node:fs';

let passed = 0; let failed = 0;
const check = (name, ok, detail) => {
  if (ok) { passed += 1; console.log(`  PASS  ${name}${detail ? `\n          ${detail}` : ''}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
};
const section = (t) => console.log(`\n── ${t} ──`);

const README_REL = '../docs/ai-workflow/blueprints/swan-media-api-2026-09-18/README.md';
const readSource = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

/**
 * THE POPULATION, defined once. These are the same three directories gate 25 enumerates, and
 * check A4 below reads gate 25's source to prove that rather than assuming it — two copies of a
 * list agree until someone edits one, which is the drift this whole round is about.
 */
const LANE_DIRS = ['shared/providers/video', 'media-api', 'backend/scripts/handlers'];

/** The lane's modules, as `${dir}/${name}`, derived from the filesystem and never typed out. */
function modulesOnDisk() {
  const out = [];
  for (const d of LANE_DIRS) {
    for (const name of readdirSync(new URL(`../${d}/`, import.meta.url))) {
      if (name.endsWith('.mjs')) out.push(`${d}/${name}`);
    }
  }
  return out;
}

/**
 * Every stated module count, in the form the document uses: a number followed by "modules".
 *
 * DELIBERATELY BROAD, AND THE ROUND'S OWN NARRATIVE IS WRITTEN TO PASS IT. Round 23's E4 was
 * drafted as "every sentence stating the total must agree" and had to be NARROWED because it
 * fired on a QUOTATION — row 20's narrative quotes `936` when describing a defect that was
 * corrected, and a guard that fires on the document's own account of a fixed bug is a guard the
 * next author deletes. The same trap exists here: a round-24 narrative that reproduces the
 * corrected count WITH the noun attached — the plain form — would create a second claim and fail
 * this check.
 *
 * So the rule is: the narrative quotes the numbers WITHOUT the noun ("the count it stated",
 * "the count measured"), and this check stays total over the plain form rather than being narrowed
 * to one sentence. A guard that reads every plain statement of the fact is worth more than one that
 * reads the sentence the author happened to be editing — which is precisely the mistake rounds 20,
 * 21 and 23 each made in turn.
 *
 * IT FIRED, ON THE PROBE'S FIRST RUN, ON THIS ROUND'S OWN NARRATIVE — AND ON THIS HEADER. The
 * round-24 row was written with the noun attached, and A2 failed on it. This header's own example
 * sentence had the noun too, so the first statement of the convention was also its first violation;
 * both were rewritten. That is the same shape as round 20's control, which failed on its first run
 * because the document already contained the defect the control re-introduces — the author of the
 * check being the first to break it. Recorded rather than quietly tidied: the alternative fix, to
 * narrow the check so it skips quoted spans, was rejected for the same reason round 23 rejected
 * narrowing its E4 — a guard that has to guess which sentences are real is a guard the next author
 * deletes. This file therefore writes the plain form only where it MUST: in the regex, and in the
 * C4 fixture, which has to contain a second claim in order to prove A2 is total over more than one.
 */
const countClaims = (text) => [...text.matchAll(/(\d+)\s+modules\b/g)]
  .map((m) => ({ value: Number(m[1]), text: m[0] }));

/** Module table rows, line-leading `| \`name.mjs\``. The same row form gate 25 requires. */
const rowNames = (text) => [...text.matchAll(/^\| `([A-Za-z0-9._-]+\.mjs)`/gm)].map((m) => m[1]);

function main() {
  console.log('HOSTILE PROBE — ROUND 24: the document\'s own module count, and the file table\'s converse\n');

  const doc = readSource(README_REL);
  const modules = modulesOnDisk();
  const derived = modules.length;
  const claims = countClaims(doc);
  const rows = rowNames(doc);

  // ══ A. the stated count must be ASSERTED against the derived one ════════
  section('A. the module count the document states, against the count the filesystem has');

  // ── A1. non-vacuity: a check that reads a count which is not there passes forever ───────
  // Round 18's section G carried this guard for its own list ("the table has modules to check"),
  // and it is the reason the removal control below is not the only thing standing between this
  // check and a green pass over a document that states nothing at all.
  check('A1. the document states a module count at all',
    claims.length >= 1,
    claims.length
      ? `-> ${claims.length} statement(s): ${claims.map((c) => c.text).join(', ')}`
      : '-> NO COUNT FOUND. A check that compares a number to nothing is green on an empty '
        + 'document, which is the vacuity this round exists to close.');

  // ── A2. THE FINDING. Every stated count equals the derived count. ────────────────────────
  const wrong = claims.filter((c) => c.value !== derived);
  check('A2. every stated module count equals the number of modules on disk',
    claims.length >= 1 && wrong.length === 0,
    wrong.length
      ? `-> the document says ${wrong.map((c) => c.value).join(' and ')}; the filesystem has `
        + `${derived} (${LANE_DIRS.map((d) => `${d.split('/').pop()}: `
        + `${modules.filter((m) => m.startsWith(d)).length}`).join(', ')}). Gate 25 derives the same `
        + `${derived} and exits 0, which is why nothing caught this: the gate prints the count and `
        + 'never compares it to the document.'
      : `-> ${claims.length} statement(s), all saying ${derived}, which is what the directories hold`);

  // ── A3. the same fact, third expression: the row count. ──────────────────────────────────
  // If the prose, the filesystem and the table disagree, at least one is wrong, and the document
  // is the artifact a licensor reads. Asserting only two of the three is how round 20's defect
  // survived: one paragraph carried two different file counts and neither was checked.
  //
  // THE DIAGNOSTIC BELOW IS ITSELF A FIX. Its first version printed `claims[0].value` and appended
  // "all three agree" whenever `rows.length === derived` — so with two claims (60 and 53) it
  // printed "stated 60, derived 60, rows 60 — all three agree" ON A FAILING CHECK. A check whose
  // own account of the facts is false is worse than one that merely fails, because the reader
  // trusts the detail line over the verdict. It now names every DISTINCT stated value and derives
  // the suffix from all three conditions rather than from one of them. This is the round's own
  // defect class — a value that is computed and never compared — turned on the round's own gate.
  const distinctStated = [...new Set(claims.map((c) => c.value))];
  const disagreements = [
    ...distinctStated.filter((v) => v !== derived).map((v) => `the prose says ${v}`),
    ...(rows.length !== derived ? [`the table has ${rows.length} row(s)`] : []),
    ...(claims.length === 0 ? ['the prose states no count'] : []),
  ];
  check('A3. the stated count, the derived count and the table row count are one number',
    claims.length >= 1 && claims.every((c) => c.value === derived) && rows.length === derived,
    `-> stated ${distinctStated.length ? distinctStated.join(' and ') : '(none)'}, `
    + `derived ${derived}, rows ${rows.length}`
    + (disagreements.length
      ? ` — DISAGREEMENT: ${disagreements.join('; ')}`
      : ' — all three agree'));

  // ── A4. this check and gate 25 must enumerate the SAME population. ───────────────────────
  // Two copies of a list agree until someone edits one. Read gate 25's own source rather than
  // trusting a comment, because the failure is silent in exactly the direction that matters: add
  // a fourth directory to gate 25 and this check keeps reporting a stale-but-green count.
  const g25 = readSource('./hostile-round18-probe.mjs');
  const dirListMatch = g25.match(/for \(const d of \[([^\]]*shared\/providers\/video[^\]]*)\]/);
  const g25Dirs = dirListMatch
    ? [...dirListMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
    : null;
  check('A4. the directories this check enumerates are the ones gate 25 enumerates',
    g25Dirs !== null && g25Dirs.length === LANE_DIRS.length
      && g25Dirs.every((d) => LANE_DIRS.includes(d)),
    g25Dirs === null
      ? '-> GATE 25\'S DIRECTORY LIST COULD NOT BE READ, so this agreement is unproven rather '
        + 'than established'
      : `-> gate 25: ${g25Dirs.join(', ')} | this probe: ${LANE_DIRS.join(', ')}`);

  // ── A5. the ASSERTION TOTAL, in EVERY form the document writes it. ──────────────────────
  // Round 23's E4 reads one form: `all green — **N assertions**`. The document writes the same
  // total a second time, in the handover paragraph, as `**N assertions, all green**` — a live
  // claim about the patch verification that NO gate reads. This is the round's own rule applied
  // one level up: asserting a fact in one place does not cover the other places it is written.
  // Narrowed deliberately to the bolded `N assertions` form rather than "every number that looks
  // like a total", because the gate-16 sentence legitimately quotes a HISTORICAL base (853) and
  // round 23's E4 already had to be narrowed for firing on a quotation.
  const receipt = doc.split('## Readiness receipt')[1]?.split('```')[1] ?? '';
  const parts = [];
  for (const line of receipt.split('\n')) {
    const m = line.match(/\((\d+) tests\)/)            // a vitest suite
      || line.match(/#\s*tests (\d+)\b/)               // node --test
      || line.match(/ALL (\d+) CHECKS PASSED/)         // demo / http probe
      || line.match(/# (\d+) CHECKS —/)                // a round probe
      || line.match(/#\s+(\d+) passed/);               // control-round12
    if (m) parts.push(Number(m[1]));
  }
  const receiptSum = parts.reduce((a, b) => a + b, 0);
  const boldTotals = [...doc.matchAll(/\*\*(\d+) assertions/g)].map((m) => Number(m[1]));
  check('A5. every place the document states the assertion total agrees with the receipt',
    boldTotals.length >= 1 && boldTotals.every((v) => v === receiptSum),
    `-> the receipt lists ${parts.length} gate counts summing to ${receiptSum}; the document `
    + `states ${boldTotals.length ? boldTotals.join(' and ') : '(none)'} in the bolded form. `
    + 'A total asserted in one place and typed in another is exactly the drift this round closes.');

  // ── A6. THE ROUND'S SECOND FINDING. Every gate must contribute a countable number. ──────
  // E2 checks the receipt's commands against the STATED GATE COUNT. E4 checks the stated total
  // against the SUM of the parts it can parse. Neither notices a gate that contributes NO part —
  // so a gate whose summary line carries no number is counted as a gate and omitted from the
  // total, and every check stays green.
  //
  // Measured: `smoke-adapters.mjs` printed a bare `ALL CHECKS PASSED` with no number, so its 15
  // assertions were missing from a headline total of 1097 over a receipt listing 30 gates. The
  // total was not wrong by arithmetic; it was wrong by SCOPE, which no arithmetic can see. Fixed
  // by making that gate print its count (the shape the other two demo/probe gates already used),
  // and asserted here so the next gate to print an uncountable summary fails a check instead.
  const gateCommands = receipt.split('\n')
    .map((l) => l.trim())
    .filter((l) => /^(cd backend && npx vitest run|node --test|node media-api\/|node )/.test(l));
  check('A6. every gate in the receipt contributes exactly one countable number',
    gateCommands.length > 0 && parts.length === gateCommands.length,
    `-> the receipt lists ${gateCommands.length} gate command(s) and ${parts.length} countable `
    + `number(s). A gate whose summary carries no number is counted as a gate and omitted from the `
    + `total, which is how ${gateCommands.length - parts.length} gate(s) can be missing from the `
    + 'headline figure while E2 and E4 both stay green.');

  // ══ B. the CONVERSE of gate 25 — a direction nothing has ever checked ════
  section('B. the file table\'s converse: every row must name a module that exists');

  const onDisk = new Set(modules.map((m) => m.split('/').pop()));
  const orphans = rows.filter((n) => !onDisk.has(n));

  // ── B1. an orphan row is documentation for a file that is not there. ─────────────────────
  check('B1. every module row names a module that exists on disk',
    orphans.length === 0,
    orphans.length
      ? `-> ORPHAN ROW(S): ${orphans.join(', ')}. Gate 25 cannot see these: it asks whether every `
        + 'module has a row, never whether every row has a module, so a row for a deleted or '
        + 'invented file is invisible to it by construction.'
      : `-> all ${rows.length} row(s) name a module that exists. Gate 25 asserts the other `
        + 'direction only, which is why this is new ground rather than a duplicate.');

  // ── B2. the exact bijection, with the floor that keeps it from passing vacuously. ────────
  const missing = modules.filter((m) => !rows.includes(m.split('/').pop()));
  check('B2. the tables and the disk are in exact bijection',
    rows.length === derived && orphans.length === 0 && missing.length === 0,
    `-> ${derived} module(s) on disk, ${rows.length} distinct row name(s); `
    + `${orphans.length} orphan row(s), ${missing.length} module(s) with no row. `
    + (missing.length ? `NO ROW: ${missing.join(', ')}` : 'Neither direction is empty.'));

  // ── B3. THE ROUND'S THIRD FINDING: the TABLE's own check counts. ────────────────────────
  // Each probe's table row states how many checks it runs, and the receipt states the same number
  // for the same file. Two places, one fact, asserted nowhere. Measured: the row for
  // `hostile-round23-probe.mjs` read "43 checks" while its receipt line read 49 — a drift of six
  // in the table that A2/A3/B1/B2 cannot see, because they compare rows to the FILESYSTEM and
  // this compares a number inside a row to a number inside the receipt.
  //
  // The check is scoped to files the receipt states a count for, so it is total over every gate
  // whose count is written twice, and it fails loudly on a probe that has a receipt line and no
  // row rather than skipping it.
  const receiptCounts = new Map();
  for (const line of receipt.split('\n')) {
    const m = line.match(/node media-api\/([A-Za-z0-9._-]+\.mjs)\s*#\s*(\d+) CHECKS/);
    if (m) receiptCounts.set(m[1], Number(m[2]));
  }
  const countMismatch = [];
  for (const [file, n] of receiptCounts) {
    const row = doc.split('\n').find((l) => l.startsWith(`| \`${file}\``));
    if (!row) { countMismatch.push(`${file} (receipt states ${n}, NO ROW)`); continue; }
    const stated = row.match(/(\d+) checks/);
    const v = stated ? Number(stated[1]) : null;
    if (v !== n) countMismatch.push(`${file}: table says ${v}, receipt says ${n}`);
  }
  check('B3. every probe\'s stated check count matches its own receipt count',
    receiptCounts.size > 0 && countMismatch.length === 0,
    countMismatch.length
      ? `-> ${countMismatch.join('; ')}. The same number is written in two places and read by `
        + 'nothing, which is the defect class this whole round is about.'
      : `-> all ${receiptCounts.size} probe(s) state the same count in the table as in the receipt`);

  // ══ C. mutation controls — re-introduce the drift and require a FAILURE ══
  section('C. mutation controls — re-introduce the defect and require the check to fail');
  // The re-introduce direction, per the skill: a control must change the source AND be detected.
  // An absence assertion cannot tell "removed" from "never there", which cost round 18 three
  // vacuous controls, so each control below asserts the mutation CHANGED the text as well.

  const bumped = claims.length
    ? doc.replace(/(\d+)(\s+modules\b)/, (s, n, rest) => `${Number(n) + 1}${rest}`)
    : doc;
  const bumpedClaims = countClaims(bumped);
  check('C1. CONTROL: incrementing the stated count is DETECTED',
    bumped !== doc && bumpedClaims.some((c) => c.value !== derived),
    bumped === doc
      ? '-> MUTATION WAS A NO-OP: the count is not where this control thinks it is'
      : `-> the mutated document states ${bumpedClaims.map((c) => c.value).join(' and ')} against `
        + `${derived} on disk, so A2 can fail`);

  // ── C2. the REMOVE control — and the round's fourth finding, which is in this control. ───
  // The first version was `doc.replace(/\s*—\s*\d+\s+modules\./, '.')`: NON-GLOBAL, and anchored to
  // the `— N modules.` shape. With two plain-form occurrences in the document it removed ONE, so
  // the predicate correctly failed — while the diagnostic, a two-branch ternary on `removed === doc`,
  // printed the SUCCESS text. A control that fails while reporting that it succeeded is the same
  // defect as A3's, one step worse: the reader has no way to tell a partial mutation from a clean one.
  //
  // The mutation is now TOTAL over the population the check reads — the same regex source, applied
  // globally — because a control that removes one of several occurrences is not a control over the
  // population, and "a guard scoped to the files you fixed is a confirmation, not a check" applies
  // to controls as much as to guards. The diagnostic now has the three branches the situation
  // actually has: no-op, partial, and clean removal.
  const removed = doc.replace(/(\d+)(\s+modules\b)/g, 'the stated count');
  const survived = countClaims(removed);
  check('C2. CONTROL: removing the stated count is DETECTED (A1 is not vacuous)',
    removed !== doc && survived.length === 0,
    removed === doc
      ? '-> MUTATION WAS A NO-OP: no `N modules` clause exists to remove, so this control proves '
        + 'nothing about A1'
      : survived.length
        ? `-> MUTATION WAS PARTIAL: ${survived.length} occurrence(s) survived `
          + `(${survived.map((c) => c.text).join(', ')}). A control that removes one of several `
          + 'occurrences is not total over the population the check reads, and a partial mutation '
          + 'reported as a success is the defect this control was written to catch.'
        : '-> every occurrence is removed and A1 fails on the result. Without this, A1 would be '
          + 'satisfiable by deleting the sentence, which is the "a check that cannot fail is not a '
          + 'check" failure this lane has filed four times.');

  const ghost = `${doc}\n| \`ghost-module-that-does-not-exist.mjs\` | nothing | 0 |\n`;
  const ghostOrphans = rowNames(ghost).filter((n) => !onDisk.has(n));
  check('C3. CONTROL: adding an orphan row is DETECTED',
    ghost !== doc && ghostOrphans.length === 1,
    `-> the mutated document carries ${ghostOrphans.length} orphan row(s), so B1 can fail`);

  // ── C4. the control C2's own bug revealed was missing. ───────────────────────────────────
  // C2's first version removed ONE of two occurrences and reported success — which means nothing in
  // this probe asserted that A2 is TOTAL over every statement of the fact, only that it reads the
  // first one. That is the same shape as the defect the round is about, one level up: a check that
  // reads one surface and is believed to cover all of them. Re-introduce a SECOND plain-form claim
  // and require A2 to fail on it. Without this control, A2 could be implemented as "the first claim
  // matches" and every other check in this file would still be green.
  const twin = `${doc}\nThe file table also covers 53 modules.\n`;
  const twinClaims = countClaims(twin);
  check('C4. CONTROL: a SECOND plain-form claim is DETECTED (A2 is total, not first-only)',
    twinClaims.length === claims.length + 1 && twinClaims.some((c) => c.value !== derived),
    `-> the mutated document carries ${twinClaims.length} claim(s) `
    + `(${twinClaims.map((c) => c.value).join(', ')}) against ${derived} on disk, so a first-only `
    + 'implementation of A2 would fail this control while A2 itself stayed green.');

  console.log(`\n${passed + failed} CHECKS — ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main();
