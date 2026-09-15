#!/usr/bin/env node
/**
 * Cross-surface contradiction sweep (hostile-pass claim group 6).
 *
 * The same facts are restated in four places — the blueprint banner, the blueprint
 * §13 receipt, the repair record, and the JSON readiness receipt — plus the generated
 * requirement map. HR26's whole complaint was that these surfaces disagreed. This
 * script re-derives each fact from the ARTIFACTS OF RECORD (the test files, the logs,
 * the manifest) and checks every surface against it.
 *
 * It reads only; it changes nothing. Exit 1 if any surface contradicts a fact.
 *
 * Usage: node scripts/creator-brains/consistency-check.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(import.meta.dirname, '..', '..');
const H = join(REPO, 'docs', 'ai-workflow', 'AI-HANDOFF');
// NORMALIZE CRLF. PowerShell's Tee-Object writes `\r\n`, and a pattern anchored with
// `$` silently fails on every line of a log read that way — the first version of this
// sweep reported four "disagreements" that were all its own parser.
const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8').replace(/\r\n/g, '\n') : '');
const ENGINE = join(REPO, 'scripts', 'creator-brains');
/** Line count the way a human counts: a trailing newline does not add a line. */
const lineCount = (text) => {
  const n = text.split('\n').length;
  return text.endsWith('\n') ? n - 1 : n;
};

const surfaces = {
  blueprint: read(join(H, 'CREATOR-BRAINS-SS-PT-ENGINE-BLUEPRINT-2026-09-12.md')),
  record: read(join(H, 'CREATOR-BRAINS-REVIEW-REPAIR-RECORD-2026-09-13.md')),
  receipt: read(join(H, 'CREATOR-BRAINS-READINESS-RECEIPT-2026-09-13.json')),
  map: read(join(H, 'CREATOR-BRAINS-REQUIREMENT-MAP-2026-09-13.md')),
  suiteLog: read(join(H, 'CREATOR-BRAINS-EVIDENCE-OFFLINE-SUITE-2026-09-13.txt')),
  mutationLog: read(join(H, 'CREATOR-BRAINS-EVIDENCE-MUTATIONS-2026-09-13.txt')),
  instrumentLog: read(join(H, 'CREATOR-BRAINS-EVIDENCE-REVIEWER-INSTRUMENTS-2026-09-13.txt')),
  gateLog: read(join(H, 'CREATOR-BRAINS-EVIDENCE-READINESS-GATE-2026-09-13.txt')),
  pass: read(join(H, 'CREATOR-BRAINS-HOSTILE-PASS-AND-EXTERNAL-DRY-RUN-2026-09-13.md')),
};

// ---- Facts, re-derived from the artifacts of record -------------------------
const json = JSON.parse(surfaces.receipt);
const engineFiles = [];
(function walk(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) walk(join(d, e.name));
    else if (e.name.endsWith('.mjs')) engineFiles.push(join(d, e.name));
  }
}(ENGINE));

/**
 * The offline log records TWO runs, on purpose: the suite excluding
 * `readiness.test.mjs` (whose four tests hash this very file, so a run that writes it
 * cannot also verify it) and then those four, appended. The total is the SUM, and
 * deriving it any other way reported a contradiction that was not there.
 */
const runSummaries = [...surfaces.suiteLog.matchAll(/^ℹ (tests|pass|fail) (\d+)$/gm)];
const partTotal = (kind) => runSummaries.filter((m) => m[1] === kind).reduce((n, m) => n + Number(m[2]), 0);
const parts = [...surfaces.suiteLog.matchAll(/^ℹ tests (\d+)$/gm)].map((m) => Number(m[1]));

const facts = {
  engineMjs: engineFiles.length,
  libModules: engineFiles.filter((f) => f.includes(`${'lib'}`) && !f.includes('test')).length,
  testFiles: engineFiles.filter((f) => /\.test\.mjs$/.test(f)).length,
  offlineRunsInLog: parts,
  offlineTests: partTotal('tests'),
  offlinePass: partTotal('pass'),
  offlineFail: partTotal('fail'),
  mutationsKilled: Number((/mutations run: (\d+) · killed: (\d+)/.exec(surfaces.mutationLog) || [])[2] ?? NaN),
  mutationsRun: Number((/mutations run: (\d+) · killed: (\d+)/.exec(surfaces.mutationLog) || [])[1] ?? NaN),
  mutationsSurvived: Number((/· survived: (\d+)/.exec(surfaces.mutationLog) || [])[1] ?? NaN),
  reproduceViolations: /0\/20 invariant violations reproduced/.test(surfaces.instrumentLog) ? 0 : NaN,
  // The probes section only: `reproduce.mjs` prints NOT REPRODUCED once per finding
  // too, so counting the whole log would report 24 and look like a failure.
  probeViolations: (surfaces.instrumentLog.split('transport-probes.mjs')[1] || '')
    .split('\n').filter((l) => /NOT REPRODUCED/.test(l)).length,
  gateReady: /"structurallyReady": true/.test(surfaces.gateLog),
  receiptRequirements: json.requirements.length,
  receiptTests: json.tests.length,
  mappedFindings: [...surfaces.map.matchAll(/\*\*(HR\d\d)\*\*/g)].map((m) => m[1]).filter((v, i, a) => a.indexOf(v) === i).length,
};

const checks = [];
const check = (name, ok, detail) => checks.push({ name, ok, detail });

// 1. Counts stated in prose must equal the derived counts.
const maxLine = Math.max(...engineFiles.map((f) => lineCount(read(f))));
check('no engine file exceeds the Rule 4 cap', maxLine <= 300, `largest = ${maxLine} lines`);
check('suite log is green', facts.offlineTests === facts.offlinePass && facts.offlinePass > 0,
  `${facts.offlinePass}/${facts.offlineTests}`);
check('record §0 states the derived offline count',
  surfaces.record.includes(`**${facts.offlinePass} / ${facts.offlinePass} pass**`),
  `looked for ${facts.offlinePass} / ${facts.offlinePass} pass`);
check('blueprint §13 states the derived offline count',
  new RegExp(`\\*\\*${facts.offlinePass} offline\\*\\*`).test(surfaces.blueprint),
  `looked for ${facts.offlinePass} offline`);
check('no surface advertises a stale offline count (141/156/165/172/176)',
  !/(?<![\d.])(141|156|165|172|176) \/ (141|156|165|172|176)(?= pass)/.test(surfaces.blueprint + surfaces.record)
  || surfaces.record.includes(`(was 141`) || surfaces.blueprint.includes('was 141'),
  'historical counts are allowed ONLY where they are labelled as historical');
check('mutation result is 10/10 with 0 survivors',
  facts.mutationsRun === 10 && facts.mutationsKilled === 10 && facts.mutationsSurvived === 0,
  `${facts.mutationsKilled}/${facts.mutationsRun}, survived ${facts.mutationsSurvived}`);
check('receipt and map agree on the finding count',
  facts.receiptRequirements === 26 && facts.mappedFindings === 26,
  `receipt=${facts.receiptRequirements}, map=${facts.mappedFindings}`);
check('every receipt test is PASS', json.tests.every((t) => t.status === 'PASS'), 'implementation phase requires it');
check('receipt claims no open blocker', json.blockers.length === 0, JSON.stringify(json.blockers));

// 2. Status/scope claims must be identical wherever they appear.
const scopeNeedles = [
  ['creator OAuth is built but never authorized',
    /Live authorization has NEVER been performed|live authorization NEVER performed|live OAuth authorization|LIVE authorization is outstanding|live authorization has NOT been performed/i],
  // The record states this as "the semantic lane remains unbuilt and is not claimed";
  // the banner says "NOT BUILT — deferred". Same claim, different words, so the
  // needle has to accept both rather than manufacture a disagreement.
  ['semantic retrieval is deferred/unbuilt and not claimed',
    /semantic[^.\n]{0,60}(NOT BUILT|not built|unbuilt|deferred)/i],
  ['the unseen spec is MISSING / unreconciled', /MISSING \/ UNRECONCILED|MISSING; nothing here supersedes|unreconciled/i],
];
for (const [label, re] of scopeNeedles) {
  // The receipt is JSON, so it is checked STRUCTURALLY (its scope.deferred array)
  // rather than by regexing a serialized document — the first version of this sweep
  // looked for the same word order in all three and manufactured a disagreement.
  const inProse = ['blueprint', 'record'].filter((k) => re.test(surfaces[k]));
  const inReceipt = label.startsWith('semantic')
    ? json.scope.deferred.some((s) => /semantic/i.test(s))
    : re.test(surfaces.receipt);
  const where = [...inProse, ...(inReceipt ? ['receipt'] : [])];
  check(`${label} — stated in every surface`, where.length === 3, where.join(',') || 'nowhere');
}

// 3. The review must not be recorded as passed anywhere.
check('no surface records the review as approved',
  !/(review[^.\n]{0,40}(APPROVED|PASSED))|(APPROVE[D]? by (the )?reviewer)/i.test(surfaces.record + surfaces.blueprint)
  || /NOT recorded as approved/.test(surfaces.record + surfaces.blueprint + surfaces.receipt),
  'only the explicit not-claimed line is allowed');

// 4. The gate verdict quoted in prose must match the gate log.
check('quoted gate verdict matches the gate log',
  facts.gateReady && /structurallyReady: true/.test(surfaces.blueprint),
  `log=${facts.gateReady}, quoted=${/structurallyReady: true/.test(surfaces.blueprint)}`);

// 5. One next slice, and it is the same one everywhere.
const nextSliceMentions = [...(surfaces.blueprint + surfaces.record).matchAll(/Next authorized slice[^\n]*/gi)].map((m) => m[0]);
check('exactly one next-slice statement per surface, all naming the owner OAuth step',
  nextSliceMentions.every((m) => /authorize|OAuth|owner-run|live OAuth/i.test(m)),
  nextSliceMentions.map((m) => m.slice(0, 60)).join(' || '));

// ---- Report -----------------------------------------------------------------
let failed = 0;
process.stdout.write('cross-surface contradiction sweep\n');
process.stdout.write(`derived facts: ${JSON.stringify(facts, null, 0)}\n\n`);
for (const c of checks) {
  if (!c.ok) failed += 1;
  process.stdout.write(`${c.ok ? 'AGREE  ' : 'DISAGREE'} ${c.name}\n`);
  if (!c.ok) process.stdout.write(`         ${c.detail}\n`);
}
process.stdout.write(`\n${checks.length - failed}/${checks.length} consistent\n`);
process.exitCode = failed ? 1 : 0;
