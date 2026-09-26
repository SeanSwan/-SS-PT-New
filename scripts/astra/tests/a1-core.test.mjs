/**
 * a1-core.test.mjs — slice A1's tests. IDs map to `04-TESTS-TRACEABILITY.md`.
 *
 * T-U-01  directions() returns 3 complete Directions with ZERO provider transport
 * T-U-04  explain() carries EVERY law check — passes and fails, and unobserved
 * T-U-05  the brain version is READ from code, never written down
 * T-U-06  personify() produces the legal form, never "[subject] by [artist]"
 * T-U-10  the loopback refusal: non-loopback bind addresses are refused
 *
 * Every test here runs against the SHIPPED modules — no mocks of the thing under
 * test. The only stubbing is a transport spy, and its job is to FAIL if the
 * zero-cost path ever reaches for the network.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { ASTRA_ROOT, REPO_ROOT } from '../core/paths.mjs';
import { bindAddress, assertLoopback } from '../core/bind.mjs';
import {
  compileAndExplain, directionsWithTiers, personify, readBrainVersion,
} from '../core/brain.mjs';
import * as compiler from '../../../shared/swanPromptCompiler.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(ASTRA_ROOT, 'fixtures');
const readFixture = (f) => JSON.parse(readFileSync(join(FIXTURES, f), 'utf8'));

const BRIEF = readFixture('brief-hero.json');
const CAPS = readFixture('caps-verified.json');
const VIOLATION = readFixture('law-violation.json');

/** Every .mjs under scripts/astra, recursively — Astra's own source. */
function astraSources(dir = ASTRA_ROOT) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...astraSources(p));
    else if (entry.name.endsWith('.mjs')) out.push(p);
  }
  return out;
}

/**
 * Strip comments before matching against source text.
 *
 * THIS IS NOT TIDINESS — IT IS THE FIX FOR A REAL FALSE POSITIVE. Both scans
 * below first ran against raw text and both matched inside COMMENTS: the purity
 * check flagged `swanDirections.mjs:118` ("no Math.random", which is a comment
 * ASSERTING purity), and the version check flagged its own author's trailing
 * `// e.g. '0.2.0'`. A scan that reads prose as code reports on the prose.
 * (The round-32 review found the same class in a coverage sweep that counted a
 * module as tested because its name appeared in a comment.)
 *
 * `//` is only treated as a comment start when preceded by whitespace or at line
 * start, so `http://` survives.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1');
}

// ---------------------------------------------------------------------------
// T-U-01 — Gate 0 is free, and PROVABLY free
// ---------------------------------------------------------------------------

test('T-U-01: directions() returns 3 complete Directions', () => {
  const dirs = directionsWithTiers(BRIEF, 3);
  assert.equal(dirs.length, 3);
  // The 6 required fields from the packet's Direction interface.
  for (const d of dirs) {
    for (const field of ['name', 'sentence', 'phenomenon', 'facets', 'paletteLaw', 'tier']) {
      assert.ok(d[field] !== undefined, `direction "${d.name}" is missing ${field}`);
    }
    assert.ok(Array.isArray(d.facets) && d.facets.length > 0);
    assert.ok(['evidence', 'prior'].includes(d.tier));
    assert.equal(d.paletteLaw, 'A-swan-native');
  }
  assert.equal(new Set(dirs.map((d) => d.name)).size, 3, 'directions must be distinct');
});

test('T-U-01: directions() makes ZERO provider calls — a transport spy proves it', () => {
  // The spy REPLACES the transport. If the zero-cost path reaches for the network
  // the test fails here rather than quietly costing money in production.
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = () => { calls += 1; throw new Error('SPY: directions() touched the network'); };
  try {
    const dirs = directionsWithTiers(BRIEF, 3);
    assert.equal(dirs.length, 3);
    assert.equal(calls, 0, 'directions() invoked the transport — it is not zero-cost');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('T-U-01: the purity is STRUCTURAL — swanDirections imports nothing that can spend', () => {
  // The spy above only proves this run did not fetch. This proves it CANNOT:
  // the module's entire import list is checked, so a future edit that adds
  // `node:http` fails the suite rather than passing until someone measures cost.
  const src = readFileSync(join(REPO_ROOT, 'shared', 'swanDirections.mjs'), 'utf8');
  const imports = [...src.matchAll(/^\s*import\s+[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1]);
  assert.deepEqual(imports, ['./swanVocabulary.mjs'],
    `swanDirections.mjs must import vocabulary and nothing else — found ${JSON.stringify(imports)}`);
  for (const forbidden of ['node:http', 'node:https', 'node:net', 'node:child_process', 'node:fs']) {
    assert.ok(!src.includes(forbidden), `swanDirections.mjs references ${forbidden}`);
  }
  // And no clock/random: a non-deterministic direction cannot be re-derived.
  // Matched against CODE, not comments — the module's own docstring SAYS "no
  // Math.random", and matching raw text flagged that sentence as a violation.
  assert.ok(!/Math\.random|Date\.now|new Date\b/.test(stripComments(src)),
    'swanDirections.mjs must be deterministic — no clock, no Math.random');
});

test('T-U-01: directions() is REPLAYABLE — same brief, same order', () => {
  const a = directionsWithTiers(BRIEF, 3).map((d) => d.name);
  const b = directionsWithTiers(BRIEF, 3).map((d) => d.name);
  assert.deepEqual(a, b);
});

test('T-U-01: no injected evidence means every direction is PRIOR, never fabricated EVIDENCE', () => {
  // Tier is truth (taste-discovery-grill §2 law 3). EVIDENCE requires >=2 of
  // Sean's own picks; with none injected, claiming EVIDENCE would be a lie.
  for (const d of directionsWithTiers(BRIEF, 3)) {
    assert.equal(d.tier, 'prior');
    assert.equal(d.evidenceEventIds, undefined);
    assert.match(d.tierReason, /picks/i);
  }
});

test('T-U-01: evidence is injected, and only >=2 ids flips the tier', () => {
  const facet = directionsWithTiers(BRIEF, 3)[0].facets[0];
  const one = directionsWithTiers(BRIEF, 3, { [facet]: ['ev-1'] })
    .find((d) => d.facets.includes(facet));
  assert.equal(one.tier, 'prior', 'a single pick is not EVIDENCE');
  const two = directionsWithTiers(BRIEF, 3, { [facet]: ['ev-1', 'ev-2'] })
    .find((d) => d.facets.includes(facet));
  assert.equal(two.tier, 'evidence');
  assert.deepEqual(two.evidenceEventIds, ['ev-1', 'ev-2']);
});

// ---------------------------------------------------------------------------
// T-U-04 — the explanation carries EVERY check, and never invents one
// ---------------------------------------------------------------------------

test('T-U-04: explain() lawChecks length equals the compiler\'s own check count', () => {
  const { compile, view } = compileAndExplain(BRIEF, CAPS);
  assert.equal(view.lawChecks.length, compile.lawChecks.length);
  assert.equal(view.lawChecks.length, 6);
  // Every law the compiler reported is present in the view — nothing dropped.
  for (const c of compile.lawChecks) {
    assert.ok(view.lawChecks.some((r) => r.law === c.law), `explain() dropped ${c.law}`);
  }
  assert.ok(view.lawChecks.every((r) => r.passed === true), 'the hero fixture must be lawful');
});

test('T-U-04: a BLOCKED compile shows the failure AND marks the rest NOT OBSERVED', () => {
  // The whole point. A blocked compile has no `checks` — so five of six laws never
  // ran. Marking them "passed" would be the defect class this repo keeps fixing:
  // a check that cannot RUN must not read as a check that FOUND something.
  const { ok, view } = compileAndExplain(VIOLATION, CAPS);
  assert.equal(ok, false);
  assert.equal(view.blocked, true);
  assert.equal(view.partial, true);
  assert.equal(view.lawChecks.length, 6);

  const failing = view.lawChecks.filter((r) => r.passed === false);
  assert.equal(failing.length, 1);
  assert.equal(failing[0].law, 'LAW3-kill-list');
  assert.equal(failing[0].slot, 'subject');
  assert.match(failing[0].detail, /iridescent/i);

  const unobserved = view.lawChecks.filter((r) => r.passed === null);
  assert.equal(unobserved.length, 5);
  assert.ok(unobserved.every((r) => r.observed === false));
  assert.equal(view.lawChecks.filter((r) => r.passed === true).length, 0,
    'a blocked compile must not report ANY law as passed');
});

test('T-U-04: an empty slot is given a REASON, and a facet-emptied one names the facet', () => {
  const withAbstract = { ...BRIEF, facets: ['Form>Abstract'] };
  const { view } = compileAndExplain(withAbstract, CAPS);
  const subject = view.slots.find((s) => s.key === 'subject');
  assert.equal(subject.empty, true);
  assert.match(subject.emptyReason, /Form>Abstract/);
  assert.match(subject.emptyReason, /pure phenomenon/);
  // A genuinely unset slot must NOT claim a facet emptied it.
  const anchor = view.slots.find((s) => s.key === 'styleAnchor');
  assert.equal(anchor.empty, true);
  assert.equal(anchor.emptyReason, 'not set by this brief');
});

test('T-U-04: explain() refuses an input that is neither a compile nor a law violation', () => {
  assert.throws(() => compiler.explain(null), /E_EXPLAIN_INPUT/);
});

// ---------------------------------------------------------------------------
// T-U-05 — the version is read, never written down
// ---------------------------------------------------------------------------

test('T-U-05: readBrainVersion() returns the LIVE export', () => {
  assert.equal(readBrainVersion(), compiler.BRAIN_VERSION);
  assert.match(readBrainVersion(), /^\d+\.\d+\.\d+$/);
});

test('T-U-05: NO version literal exists anywhere in Astra\'s own source', () => {
  // ESM exports cannot be mutated from outside, so "mutate it and re-read" is not
  // an executable test. The honest equivalent is stronger: prove the literal is
  // absent, so the value CAN only have come from the code.
  const literal = compiler.BRAIN_VERSION;
  const escaped = literal.replace(/\./g, '\\.');
  const offenders = [];
  for (const path of astraSources()) {
    // Comments are stripped: prose MAY cite a version as an example, code may not
    // hardcode one. The first version of this scan flagged a trailing comment in
    // THIS file — which is the scan working, and the comment being wrong.
    const code = stripComments(readFileSync(path, 'utf8'));
    if (new RegExp(`['"\`]${escaped}['"\`]`).test(code)) offenders.push(path);
  }
  assert.deepEqual(offenders, [],
    `these Astra modules hardcode the brain version ${literal} instead of reading it:\n  ${offenders.join('\n  ')}`);
});

test('T-U-05: the version reaches the ExplainView from the record', () => {
  const { view } = compileAndExplain(BRIEF, CAPS);
  assert.equal(view.brainVersion, compiler.BRAIN_VERSION);
});

// ---------------------------------------------------------------------------
// T-U-06 — the personification formula
// ---------------------------------------------------------------------------

test('T-U-06: personify() produces the legal form', () => {
  const s = personify('Anton Corbijn', 'classical photograph', 'a frozen structure');
  assert.equal(s, "Anton Corbijn's classical photograph depicting a frozen structure");
});

test('T-U-06: the raw "[subject] by [artist]" form never appears', () => {
  const s = personify('Anton Corbijn', 'classical photograph', 'a frozen structure');
  assert.doesNotMatch(s, /\bby\b/);
  const { view } = compileAndExplain(
    { ...BRIEF, artist: 'Anton Corbijn', artistMedium: 'classical photograph' }, CAPS,
  );
  const anchor = view.slots.find((x) => x.key === 'styleAnchor');
  assert.match(anchor.value, /depicting/);
  assert.doesNotMatch(anchor.value, /\bby\b/);
});

// ---------------------------------------------------------------------------
// T-U-10 — the loopback refusal
// ---------------------------------------------------------------------------

test('T-U-10: non-loopback addresses are REFUSED, including 0.0.0.0', () => {
  for (const host of ['0.0.0.0', 'localhost', '192.168.1.10', '::', '', null, undefined]) {
    assert.throws(() => assertLoopback(host), (e) => e.code === 'E_NOT_LOOPBACK',
      `${JSON.stringify(host)} must be refused`);
  }
});

test('T-U-10: literal loopback addresses are accepted', () => {
  assert.equal(assertLoopback('127.0.0.1'), '127.0.0.1');
  assert.equal(assertLoopback('::1'), '::1');
  assert.equal(bindAddress().url, 'http://127.0.0.1:7411/');
  assert.equal(bindAddress({ host: '::1' }).url, 'http://[::1]:7411/');
});

test('T-U-10: the CLI exits NON-ZERO on a refused bind', () => {
  const cli = join(ASTRA_ROOT, 'cli.mjs');
  // `stdio[0] = 'ignore'` is REQUIRED on Windows. The default pipes stdin, and a
  // piped-but-unwritten stdin makes `spawnSync` fail with EBUSY before the child
  // ever runs — a spawn failure that reads as a missing stdout, which is how it
  // presents: `stdout: undefined`. Measured, not guessed.
  const opts = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] };
  const bad = spawnSync(process.execPath, [cli, 'bind', '0.0.0.0'], opts);
  assert.equal(bad.error, undefined, `spawn failed: ${bad.error?.message}`);
  assert.notEqual(bad.status, 0, 'binding 0.0.0.0 must not exit 0');
  assert.match(bad.stdout, /E_NOT_LOOPBACK/);
  const good = spawnSync(process.execPath, [cli, 'bind'], opts);
  assert.equal(good.status, 0);
  assert.match(good.stdout, /http:\/\/127\.0\.0\.1:7411\//);
});
