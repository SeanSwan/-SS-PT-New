/**
 * ox-final-review.identity.test.mjs — regression tests for the seat-identity gate.
 *
 * THE BUG THIS EXISTS FOR: until 2026-08-24 `ox-final-review.mjs` selected its seat
 * with an argv flag (`--model stealth/ox-alpha`) that `consult-grok.mjs` never parses
 * — it reads only `SWAN_GROK_MODEL`. The flag was silently dropped, the Grok default
 * won, and every "3x separated Ox Alpha final review" was three Grok calls filed under
 * an Ox filename. The panel's own Grok seat voted twice under two names, inflating
 * every consensus count that included the Ox verdict. Nothing errored.
 *
 * Three rounds of hostile review then found three faults in the FIXES themselves.
 * Each has a test below, because each was invisible until someone attacked it:
 *
 *   R1 (GLM 5.3 + Ox, independently) — the first fix read the model from the
 *      `Reviewer:` header, which the transport wrote from the REQUESTED value. It
 *      compared an env var with itself: tautological, and blind to substitution.
 *      → the gate now also reads a `Served:` line carrying the provider's own answer.
 *
 *   R2-F1 — exact string equality treated benign provider canonicalisation (dated
 *      snapshots, `:free`/`:nitro`) as substitution, and substitution aborts, so every
 *      run would hard-fail at call 1, already paid.  → canonicalise before comparing.
 *
 *   R2-F2 — the abort classifier regex anchored only half its alternatives, so an
 *      interpolated provider error containing "UNPROVEN" could turn a retryable blip
 *      into a hard paid abort.  → closed set of structured codes; classify on code.
 *
 *   R3-F1 — the canonicalisation fix added prefix matching, which silently passed the
 *      exact substitution the gate exists to catch (`gpt-4` ⊂ `gpt-4o` ⊂ `gpt-4o-mini`)
 *      while buying nothing, since canonicalSlug already handled every benign case.
 *      → exact equality after canonicalisation, plus an explicit operator allowlist.
 *
 * Imports the real symbols from `ox-identity.mjs` (side-effect free). They used to be
 * lifted out of source with a regex and `new Function`, which was coupled to formatting
 * and had already over-captured once.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FAULT, SEAT_ALIASES, OX_MODEL, canonicalSlug, modelsAgree, identityFault, oxIdentityFault } from './ox-identity.mjs';

// Imported, never restated. A local copy here would be a second source of truth —
// the same shape as the bug this file exists to catch.
const OX = OX_MODEL;
const check = (text) => identityFault(text, OX);
const header = (requested, served = requested) =>
  `# Seat — Hostile Gate Review\n\n**Reviewer:** OpenRouter \`${requested}\` (effort: high)\n`
  + `**Served:** \`${served}\`\n**Document:** packet.md\n`;
const isSeatFault = (f) => !!f && FAULT[f.code]?.abort === true;

// --- the seat-bound entry point the runner actually calls --------------------
// Ox round-4 F1: the runner used to bind the seat itself in a one-line wrapper that
// no test touched — a dropped argument there would pass this whole suite while
// shipping a gate pointed at the wrong model. The binding now lives in the module
// and is exercised here, so no seat-binding code ships untested.

test('R5 the exported pre-bound check is wired to the right seat', () => {
  assert.equal(oxIdentityFault(header(OX_MODEL)), null, 'the real seat must pass');
  assert.equal(oxIdentityFault(header('x-ai/grok-4.6'))?.code, 'WRONG_SEAT',
    'a different model must be refused by the pre-bound check, not just the parameterised one');
  // Behaviourally identical to calling the parameterised form with the real seat —
  // if the binding were wrong, these two would disagree.
  for (const text of [
    header(OX_MODEL),
    header(OX_MODEL, 'openai/gpt-5.6'),
    header(OX_MODEL, 'unreported'),
    '# no headers at all\n',
    `**Reviewer:** OpenRouter \`${OX_MODEL}\` (effort: high)\n`,
  ]) {
    assert.deepEqual(oxIdentityFault(text), identityFault(text, OX_MODEL),
      'pre-bound and parameterised forms must agree on every input');
  }
});

// --- happy path --------------------------------------------------------------

test('the requested seat, served by that same model, passes', () => {
  assert.equal(check(header(OX)), null);
});

// --- R1: the tautology -------------------------------------------------------

test('R1 right request, WRONG model served, is caught', () => {
  const f = check(header(OX, 'x-ai/grok-4.6'));
  assert.equal(f?.code, 'SUBSTITUTED');
  assert.match(f.message, /x-ai\/grok-4\.6/, 'must name what actually replied');
});

test('R1 a missing Served line is unproven, never a pass', () => {
  assert.equal(check(`**Reviewer:** OpenRouter \`${OX}\` (effort: high)\n`)?.code, 'UNPROVEN_NO_SERVED');
});

test('R1 an explicit "unreported" served model is unproven', () => {
  assert.equal(check(header(OX, 'unreported'))?.code, 'UNPROVEN_UNREPORTED');
});

test('R1 THE ORIGINAL BUG: a Grok reply filed as Ox is the wrong seat', () => {
  assert.equal(check(header('x-ai/grok-4.6'))?.code, 'WRONG_SEAT');
});

test('R1 a reply with no headers at all cannot prove its identity', () => {
  assert.equal(check('# Some Review\n\nLooks fine to me.\n')?.code, 'UNPROVEN_NO_HEADER');
});

// --- R2-F1: benign canonicalisation must not abort a paid run ----------------

test('R2 dated snapshots of the same model are not substitutions', () => {
  assert.equal(check(header(OX, `${OX}-2026-08-01`)), null, 'YYYY-MM-DD');
  assert.equal(check(header(OX, `${OX}-20260801`)), null, 'YYYYMMDD');
});

test('R2 routing variants of the same model are not substitutions', () => {
  for (const v of [':free', ':nitro', ':floor']) {
    assert.equal(check(header(OX, `${OX}${v}`)), null, `variant ${v}`);
  }
});

test('R2 case differences are not substitutions', () => {
  assert.equal(check(header(OX, OX.toUpperCase())), null);
});

// --- R2-F2: content must not be able to spoof the abort decision -------------

test('R2 abort keys on the code, so message content cannot spoof it', () => {
  // The literal string that defeated the old regex-on-prose classifier.
  const hostile = { code: 'IO_ERROR', message: 'unreadable output: UNPROVEN checksum at offset 0' };
  assert.equal(isSeatFault(hostile), false, 'content must not drive the abort decision');
  // An unclassified code is retryable: a fault we have not characterised is not
  // evidence of misconfiguration, and treating it as one would abort on unknowns.
  assert.equal(isSeatFault({ code: 'SOMETHING_NEW', message: 'x' }), false);
});

// --- R3-F1: prefix matching silently passed real substitutions ---------------
// GLM 5.3 round 3: `startsWith` has no token boundary, so a provider serving the
// cheaper family neighbour was waved through — the exact failure this gate exists
// to catch. And it bought nothing: canonicalSlug already handled every benign case.

test('R3 family neighbours are SUBSTITUTIONS, not matches', () => {
  // Each pair is prefix-related and would have passed under the old rule.
  for (const [requested, served] of [
    ['openai/gpt-4', 'openai/gpt-4o'],
    ['openai/gpt-4o', 'openai/gpt-4o-mini'],
    ['meta/llama-4', 'meta/llama-4-maverick'],
    [OX, `${OX}-lite`],
  ]) {
    assert.equal(modelsAgree(requested, served), false,
      `${requested} vs ${served} must NOT agree — prefix is not identity`);
    assert.equal(modelsAgree(served, requested), false, 'and not in the other direction either');
  }
});

test('R4 missing or non-string slugs fail CLOSED, never agree', () => {
  // Ox round-4 F4: canonicalSlug coerces with String(), so two undefineds both
  // become "undefined" and compare equal — an identity check answering "match"
  // because both sides are absent. Guarded explicitly rather than relying on the
  // caller, since this is the one function that must never assume identity.
  for (const [a, b] of [
    [undefined, undefined], [null, null], ['', ''], [OX, undefined],
    [undefined, OX], [OX, ''], [OX, null], [123, 123],
  ]) {
    assert.equal(modelsAgree(a, b), false, `${String(a)} vs ${String(b)} must not agree`);
  }
  // The real pair still agrees — the guard must not break the happy path.
  assert.equal(modelsAgree(OX, OX), true);
});

test('R3 a numeric-suffix strip cannot collapse two distinct models', () => {
  // `-\d{8}$` strips a snapshot id; it must not make a bare slug equal a distinct one.
  assert.equal(modelsAgree('vendor/model-12345678', 'vendor/other'), false);
  // But the SAME model with a stripped snapshot still agrees — that is the point.
  assert.equal(modelsAgree('vendor/model-12345678', 'vendor/model'), true);
});

test('R3 aliases are an explicit operator decision, never inferred', () => {
  assert.deepEqual(SEAT_ALIASES, {}, 'ships empty — an alias must be added deliberately');
  // When one IS added it works symmetrically. Proven against a local stand-in so the
  // test does not depend on the shipped table staying empty forever.
  const withAlias = { 'vendor/a': ['vendor/b'] };
  const agrees = (x, y) => x === y
    || (withAlias[x] || []).includes(y) || (withAlias[y] || []).includes(x);
  assert.ok(agrees('vendor/a', 'vendor/b') && agrees('vendor/b', 'vendor/a'));
});

test('R3 canonicalSlug still normalises every benign class on its own', () => {
  // The prefix clause was justified by these; canonicalSlug alone must cover them,
  // which is why removing prefix matching cost nothing.
  assert.equal(canonicalSlug(`${OX}:free`), OX);
  assert.equal(canonicalSlug(`${OX}-2026-08-01`), OX);
  assert.equal(canonicalSlug(`${OX}-20260801`), OX);
  assert.equal(canonicalSlug(OX.toUpperCase()), OX);
});

test('R3 a genuinely different vendor is still a substitution', () => {
  for (const other of ['x-ai/grok-4.6', 'openai/gpt-5.6', 'stealth/other-model']) {
    assert.equal(check(header(OX, other))?.code, 'SUBSTITUTED', other);
  }
});

// --- the abort/retry contract ------------------------------------------------

test('every fault code lands on the intended side of abort-vs-retry', () => {
  for (const [label, text] of [
    ['wrong seat', header('x-ai/grok-4.6')],
    ['substitution', header(OX, 'openai/gpt-5.6')],
    ['missing Served', `**Reviewer:** OpenRouter \`${OX}\` (effort: high)\n`],
    ['unreported served', header(OX, 'unreported')],
    ['no attribution', '# no headers at all\n'],
  ]) {
    assert.ok(isSeatFault(check(text)), `${label} must abort`);
  }

  const truncated = header(OX) + '\n> ⚠ **TRUNCATED** — the model hit max_tokens (48000) and this reply is INCOMPLETE.\n';
  assert.equal(check(truncated)?.code, 'TRUNCATED');
  assert.equal(isSeatFault(check(truncated)), false, 'truncation must NOT abort — retry is legitimate');

  for (const code of ['WRONG_SEAT', 'SUBSTITUTED', 'UNPROVEN_NO_HEADER',
    'UNPROVEN_NO_SERVED', 'UNPROVEN_UNREPORTED', 'TRUNCATED']) {
    assert.ok(code in FAULT, `${code} must be declared in the FAULT table`);
  }
});

test('identity is checked BEFORE truncation — a wrong seat is never merely truncated', () => {
  const text = header('x-ai/grok-4.6') + '\n> ⚠ **TRUNCATED** — hit max_tokens (48000).\n';
  assert.equal(check(text)?.code, 'WRONG_SEAT');
});
