#!/usr/bin/env node
/**
 * spend-coverage.test.mjs — the coverage contract (SWA-218).
 * ==========================================================
 * Both hostile reviewers on 2026-08-26 named the same ONE THING, independently:
 * replace the hand-curated seat list with a generated contract that FAILS the day
 * drift lands, instead of the day someone notices a bill.
 *
 * The rule this file enforces, in one sentence: **every script that reads a payment
 * credential must either be matched by the spend gate, or be on the FREE allowlist
 * with a written reason.** No third option.
 *
 * It caught real drift the moment it was written — the gate priced two scripts that
 * do not exist while four live ones that read OPENROUTER_API_KEY matched nothing.
 *
 * Run: node scripts/hooks/spend-coverage.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CREDENTIAL_MARKERS, FREE_ALLOWLIST, KNOWN_UNGATED, invokesPaidSeat } from '../lib/paid-seats.mjs';

const SCRIPTS = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Every .mjs under scripts/ and scripts/context-gateway/src/, as repo-ish paths. */
function candidateScripts() {
  const out = [];
  const dirs = [SCRIPTS, join(SCRIPTS, 'context-gateway', 'src')];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.mjs') || name.endsWith('.test.mjs')) continue;
      out.push(join(dir, name));
    }
  }
  return out;
}

const spendsMoney = (file) => {
  const src = readFileSync(file, 'utf-8');
  return CREDENTIAL_MARKERS.some((m) => src.includes(m));
};

/** How the gate would see a normal invocation of this script. */
const invocationOf = (file) =>
  `node ${relative(SCRIPTS, file).replaceAll('\\', '/')} --document plan.md`;

// ---------------------------------------------------------------------------

test('the walker actually finds scripts — validate the instrument first', () => {
  // A coverage test that silently scans nothing would report perfect coverage.
  // This is the positive control: if the walk breaks, this fails before the
  // reassuring green appears below it.
  const all = candidateScripts();
  assert.ok(all.length > 5, `expected to walk several scripts, found ${all.length}`);
  assert.ok(all.some((f) => f.endsWith('consult-fable.mjs')), 'the known paid seat must be in the walk');
});

test('the credential grep actually discriminates', () => {
  // Second control: if `spendsMoney` returned true for everything (or nothing),
  // the contract below would be vacuous in one direction or the other.
  const all = candidateScripts();
  const paid = all.filter(spendsMoney);
  assert.ok(paid.length > 0, 'no script reads a payment credential — the grep is broken');
  assert.ok(paid.length < all.length, 'every script looks paid — the grep is too broad');
});

test('CONTRACT: every credential-bearing script is gated or explicitly allowlisted', () => {
  const uncovered = [];
  for (const file of candidateScripts()) {
    if (!spendsMoney(file)) continue;
    const name = file.split(/[\\/]/).pop();
    const rel = relative(SCRIPTS, file).replaceAll('\\', '/');
    if (Object.prototype.hasOwnProperty.call(FREE_ALLOWLIST, name)) continue;
    // The frozen baseline. Keyed by BOTH bare name and relative path so a nested
    // entry (context-gateway/src/transport.mjs) is unambiguous either way.
    if (KNOWN_UNGATED[name] || KNOWN_UNGATED[rel]) continue;
    if (invokesPaidSeat(invocationOf(file))) continue;
    uncovered.push(rel);
  }

  assert.deepEqual(uncovered, [], [
    '',
    'These scripts read a payment credential and the spend gate does not see them:',
    ...uncovered.map((f) => `    ${f}`),
    '',
    'Every one of them can spend real money with no cap, no token and no record.',
    'Fix by ONE of:',
    '  - make the invocation match PAID_INVOCATION in scripts/lib/paid-seats.mjs',
    '  - add it to FREE_ALLOWLIST there WITH A REASON, if it genuinely cannot bill',
    '',
    'Adding it to KNOWN_UNGATED is NOT a fix — that list is frozen debt, and growing',
    'it is admitting a new hole. Talk to Sean before you do.',
    '',
    'Do not delete this test to make it pass.',
  ].join('\n'));
});

test('CONTRACT: KNOWN_UNGATED is FROZEN — the exact key set, not merely reasoned', () => {
  // GLM 5.3 round-3 blocker 3, and it was right: "fails the moment it grows" was
  // FALSE for the list itself. The contract only checked that entries exist with
  // >10-char reasons, so adding a fourth reasoned entry kept everything green. The
  // pre-commit comment saying "adding to KNOWN_UNGATED is NOT a fix" was a comment,
  // not a control — and by this repo's own doctrine, a rule the model must remember
  // is a rule that will eventually be skipped.
  //
  // Now it is an asserted key set. Growing the list fails HERE, which is what the
  // freeze claimed to do all along.
  assert.deepEqual(Object.keys(KNOWN_UNGATED).sort(), [
    // Added 2026-08-27, and this assertion failing is what forced it to be a
    // deliberate act rather than a quiet one — exactly what the freeze is for.
    // It is a LIBRARY entry, not new debt: GLM 5.3-flash F4 showed the gate was
    // hard-blocking this no-op and telling the operator to price a library.
    'context-gateway/src/consult.mjs',
    'context-gateway/src/transport.mjs',
    'hermes-village.mjs',
    'validation-orchestrator.mjs',
  ], [
    'KNOWN_UNGATED changed. That list is FROZEN pre-existing debt, not a place to put',
    'a new script. If you added a row to make something pass, that is admitting a new',
    'hole — price it, or free-list it with a reason. If you genuinely PAID DOWN debt by',
    'removing a row, update this assertion in the same commit and say so.',
  ].join('\n'));
});

test('CONTRACT: the allowlist has no ghosts and no blank reasons', () => {
  // The drift ran both ways: the old gate also priced two scripts that do not
  // exist. An allowlist entry for a deleted file is the same rot, and a blank
  // reason is an exemption nobody can audit later.
  const present = new Set(candidateScripts().map((f) => f.split(/[\\/]/).pop()));
  for (const [name, reason] of [...Object.entries(FREE_ALLOWLIST), ...Object.entries(KNOWN_UNGATED)]) {
    const bare = name.split('/').pop();
    assert.ok(present.has(bare), `the allowlist names ${name}, which does not exist — remove the ghost`);
    assert.ok(reason && reason.trim().length > 10, `${name} needs a real reason, not a blank exemption`);
  }
});

test('CONTRACT: the gate sees the context-gateway engine path', () => {
  // Kept as defence in depth, with the CLAIM CORRECTED.
  //
  // GLM 5.3-flash blocker 2 called this a live "substitute path" bypass: call the
  // engine directly and spend Fable while matching nothing. I accepted it after
  // confirming the REGEX did not match it — and never checked whether the file was
  // EXECUTABLE. It is not. Verified 2026-08-27: that engine has no shebang and no
  // self-invocation guard, so running it directly defines exports and exits, spending
  // nothing. Matching is not the same as exploitable, and verifying the wrong
  // proposition is how a finding gets "confirmed" while staying wrong.
  //
  // The assertion stays because the day someone gives that engine a CLI entry, it
  // should already be covered rather than newly forgotten.
  assert.equal(invokesPaidSeat('node scripts/context-gateway/src/consult.mjs --seat fable'), true);
});

test('a mention of a paid script is still not an invocation', () => {
  // The contract must not achieve coverage by matching everything.
  assert.equal(invokesPaidSeat('cat scripts/consult-fable.mjs'), false);
  assert.equal(invokesPaidSeat('npm run build'), false);
});
