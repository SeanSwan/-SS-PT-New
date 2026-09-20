/**
 * mega-blueprint-coverage.test.mjs — the coverage claim, as a mechanism.
 * =====================================================================
 * R2 finding (hostile review round 2, 2026-09-19):
 *
 * The mandate module's docstring said "Four consult scripts share this behaviour...
 * One definition, imported." Measured: exactly ONE script imported it. The sentence
 * was false, and false in the direction that costs the most — it read as coverage,
 * so nobody would audit it. Sean's requirement is that Astra ALWAYS knows it is under
 * Mega Blueprint; a comment cannot enforce that, and in this repo comments provably
 * do not survive contact with a busy session.
 *
 * So the claim becomes a test with two halves:
 *
 *   1. Any script that can reach Astra must import the mandate — unless it is named
 *      in UNARMED_BY_DECISION below, with a reason.
 *   2. That exemption table is asserted exactly, so a THIRD unarmed Astra path cannot
 *      appear quietly: adding one requires editing this file on purpose.
 *
 * The two current exemptions are real and deliberate, not oversights:
 *
 *   - consult-astra-pro.mjs and consult-astra-multihost.mjs ride the OpenRouter PAID
 *     path, behind a two-gate spend confirmation. Arming them changes what a paid call
 *     returns, which is an operator decision — not a hostile-reviewer's. Multihost also
 *     declares a different output contract ("## PART A — MULTI-HOST ARCHITECTURE"), so
 *     bolting the Forge mandate onto it would fight its own purpose.
 *
 * This test is the thing that makes the gap un-silenceable. It is not a substitute for
 * arming them; it is what stops the gap from being forgotten.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPTS = join(ROOT, 'scripts');

/** A script can reach Astra if it can name the model. `-pro` also matches. */
const ASTRA_RE = /gpt-6-astra/;
const MANDATE_IMPORT_RE = /mega-blueprint-mandate/;

/**
 * Astra-reaching scripts that do NOT carry the mandate, each with the reason.
 * Keep this table honest: an entry here is a known, deliberate gap.
 *
 * `consult-astra-pro.mjs` was on this list and was removed on 2026-09-19 once the operator
 * said to proceed: its contract is already Forge-shaped (`## PART A — HOSTILE REVIEW`), it
 * routes through `fetchForEgress` so the egress chokepoint covers it, and it already had a
 * dry-run — so arming it is opt-in via the keyword and provable without spending.
 */
const UNARMED_BY_DECISION = {
  'consult-astra-multihost.mjs':
    'OpenRouter paid path AND a different output contract (## PART A — MULTI-HOST ARCHITECTURE); the Forge mandate would fight it, so arming it is a design change, not a wiring change',
};

const sourceOf = (file) => readFileSync(join(SCRIPTS, file), 'utf8');

test('COVERAGE: every Astra-reaching script carries the mandate, or is a named exemption', () => {
  const candidates = readdirSync(SCRIPTS)
    .filter((f) => f.endsWith('.mjs') && !f.endsWith('.test.mjs'))
    .filter((f) => ASTRA_RE.test(sourceOf(f)));

  assert.ok(candidates.length >= 3, `expected at least 3 Astra entry points, found ${candidates.length}`);

  const armed = candidates.filter((f) => MANDATE_IMPORT_RE.test(sourceOf(f)));
  const unarmed = candidates.filter((f) => !MANDATE_IMPORT_RE.test(sourceOf(f)));

  assert.deepEqual(
    armed, ['consult-astra-pro.mjs', 'consult-astra-subscription.mjs'],
    'both Astra paths that share the Forge contract must carry the mandate; if this changed, update the docstring too',
  );
  assert.deepEqual(
    unarmed.slice().sort(), Object.keys(UNARMED_BY_DECISION).sort(),
    'a new Astra path appeared without the mandate, or an exemption was removed. '
    + 'Arm it, or add it to UNARMED_BY_DECISION with a reason — do not let it be invisible.',
  );
});

test('COVERAGE: each exemption still exists and still lacks the mandate', () => {
  // A stale exemption is a lie of the same shape as the false docstring: it claims a
  // gap that may since have been closed, and hides the closing from review.
  for (const [file, reason] of Object.entries(UNARMED_BY_DECISION)) {
    const src = sourceOf(file);
    assert.ok(ASTRA_RE.test(src), `${file} is exempted but no longer reaches Astra — drop the exemption`);
    assert.ok(!MANDATE_IMPORT_RE.test(src), `${file} is exempted but NOW carries the mandate — drop the exemption`);
    assert.ok(reason.length > 30, `${file} needs a real reason, not a placeholder`);
  }
});

test('COVERAGE: the module docstring states the measured counts, not a slogan', () => {
  // The original defect was a docstring that overstated coverage. Pin the true numbers
  // so the prose cannot drift back into optimism.
  const src = readFileSync(join(SCRIPTS, 'lib', 'mega-blueprint-mandate.mjs'), 'utf8');
  assert.ok(!/Four consult scripts share/.test(src), 'the false "four scripts" claim must not return');
  assert.match(src, /COVERAGE — MEASURED, NOT ASSUMED/);
  assert.match(src, /consult-astra-pro\.mjs\s+ARMED/);
  assert.match(src, /consult-astra-multihost\.mjs\s+UNARMED/);
  assert.match(src, /consult-astra-subscription\.mjs\s+ARMED/);
});
