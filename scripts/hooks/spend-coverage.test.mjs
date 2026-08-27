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
import { CREDENTIAL_MARKERS, FREE_ALLOWLIST, KNOWN_UNGATED, invokesPaidSeat, readsCredential } from '../lib/paid-seats.mjs';

const SCRIPTS = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Every .mjs under scripts/ and scripts/context-gateway/src/, as repo-ish paths. */
function candidateScripts(dir = SCRIPTS, depth = 0) {
  // RECURSIVE. It used to walk exactly two flat directories, so a credential-bearing
  // script in scripts/lib/, scripts/hooks/, or anywhere deeper was invisible and the
  // contract passed green forever (GLM 5.3 F5 and 5.3-flash B3, independently).
  //
  // The old positive control could not have noticed: it asserted only that the walk
  // found more than five files and included consult-fable.mjs — both true of a blind
  // walk. An instrument check that cannot detect the instrument being blind is the
  // same class of defect as the thing it is guarding.
  const out = [];
  if (!existsSync(dir) || depth > 6) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) { out.push(...candidateScripts(full, depth + 1)); continue; }
    // `.js` and `.cjs` too (GLM F3 / flash 7): a credential-bearing helper in either
    // was invisible, and nothing about a file extension makes a key cheaper to leak.
    // Measured before widening — 14 such files exist under scripts/ and none reads a
    // credential today, so this costs nothing now and closes the hole for later.
    if (!/\.(mjs|js|cjs)$/.test(e.name) || /\.test\.(mjs|js|cjs)$/.test(e.name)) continue;
    out.push(full);
  }
  return out;
}

/**
 * USES a payment credential, not merely NAMES one.
 *
 * The first version tested `src.includes(marker)`, which flagged this file's own
 * siblings — `spend-guard-gate.mjs`, `paid-seats.mjs`, `secret-read-gate.mjs` all
 * contain those strings precisely because they are the guards that look for them.
 * The recursive walk surfaced that immediately: six new hits, three of them the
 * machinery doing the checking.
 *
 * Reading a key is the difference from talking about one. A grep loose enough to
 * flag its own guard is a grep that trains people to add exemptions, and every
 * exemption added for a false positive is a place a real one can later hide.
 *
 * The idiom list now lives in `readsCredential` (paid-seats.mjs) so the gate and this
 * contract cannot drift apart on what "uses a credential" means — the same reason the
 * seat roster stopped living inside a regex.
 */
const spendsMoney = (file) => readsCredential(readFileSync(file, 'utf-8'));

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

  // DEPTH is the part the old control missed. Asserting "more than five files, and
  // consult-fable is present" is true of a walk that never descends, so it certified
  // a blind instrument for two rounds. Name files that only exist BELOW the top level.
  const rel = all.map((f) => relative(SCRIPTS, f).replaceAll('\\', '/'));
  for (const deep of ['lib/spend-ledger.mjs', 'hooks/spend-guard-gate.mjs', 'context-gateway/src/consult.mjs']) {
    assert.ok(rel.includes(deep), `the walk must descend: ${deep} is missing, so the contract is blind below the top level`);
  }
  assert.ok(rel.some((f) => f.split('/').length > 2), 'at least one file two levels deep');

  // EXTENSION is the other axis, and it was an untested invariant until a mutation
  // reporting zero reds sent me looking for why. Widening the walk to .js/.cjs adds
  // no credential-bearing files TODAY, so nothing downstream depends on it and no
  // assertion could fail — a change that is real, correct, and invisible to the
  // suite. That is the same shape as the vacuous tests this workstream keeps
  // finding, arriving from the other direction: not a test that cannot fail, but a
  // behaviour nothing watches.
  assert.ok(rel.some((f) => /\.(js|cjs)$/.test(f)),
    'the walk must cover .js/.cjs — a credential in one of those spends money exactly the same');
});

test('the credential grep actually discriminates — and on its REAL subjects', () => {
  // Second control: if `spendsMoney` returned true for everything (or nothing),
  // the contract below would be vacuous in one direction or the other.
  const all = candidateScripts();
  const paid = all.filter(spendsMoney);
  assert.ok(paid.length > 0, 'no script reads a payment credential — the grep is broken');
  assert.ok(paid.length < all.length, 'every script looks paid — the grep is too broad');

  // GLM 5.3 finding 1 / flash finding 11 — the fifth vacuous test, and both were
  // right about the shape. `paid.length > 0` is satisfied FOREVER by the frozen
  // library entries (lib/preflight.mjs, the two gateway files), which sit in
  // KNOWN_UNGATED and are skipped by the contract anyway. So the control could not
  // detect the grep going blind on its actual subject: the seats that bill.
  //
  // Pinning named exemplars is what makes it a control. These are chosen because
  // they are REAL paid entrypoints, not libraries — a fan-out and an image probe.
  const names = paid.map((f) => f.split(/[\\/]/).pop());
  for (const seat of ['consult-openrouter-panel.mjs', 'forge-i2i-probe.mjs', 'consult-codex.mjs']) {
    assert.ok(names.includes(seat),
      `${seat} bills real money and the credential grep no longer sees it — the instrument went blind`);
  }
});

test('every credential idiom an honest author would write is detected', () => {
  // The detector tested exactly `process.env.<MARKER>`. GLM F3 and flash 7 both
  // named the consequence: one linter-driven refactor to destructuring, and a new
  // paid script passes every test green with nobody prompted to classify it.
  //
  // Each case below is a shape a normal author writes, not an evasion. The two
  // negatives matter as much as the positives: a detector that matches a MENTION
  // flags this repo's own guards, and exemptions added for false positives are where
  // real ones later hide.
  const K = 'OPENROUTER_API_KEY';
  const yes = [
    `const k = process.env.${K};`,
    `const k = process.env['${K}'];`,
    `const k = process.env["${K}"];`,
    `const { ${K} } = process.env;`,
    `const {\n  FOO,\n  ${K},\n} = process.env;`,
    `const k = Bun.env.${K};`,
    `const env = process.env;\nconst k = env.${K};`,
    // Round-5: optional chaining, a NON-`env` alias name, and `{ env } = process`.
    // The first widening had a hardcoded `env` inside it — the same assumption it
    // existed to remove, one layer down (GLM F2 / flash F10).
    `const k = process?.env?.${K};`,
    `const e = process.env;\nconst k = e.${K};`,
    `const { env } = process;\nconst k = env["${K}"];`,
    `const k = process.env?.["${K}"];`,
  ];
  for (const src of yes) assert.equal(readsCredential(src), true, `missed idiom:\n${src}`);

  const no = [
    `// we never read ${K} here`,
    `const MARKERS = ['${K}'];`,          // this repo's own guards look exactly like this
    `console.log('set ${K} in your .env');`,
  ];
  for (const src of no) assert.equal(readsCredential(src), false, `false positive on:\n${src}`);
});

test('CREDENTIAL_MARKERS is FROZEN — the exact set, like the debt list', () => {
  // flash finding 11: the freeze discipline was applied to KNOWN_UNGATED's key set
  // and never to the marker list the whole contract reads through. Deleting
  // OPENAI_API_KEY — plausibly, to silence the next guard file that trips the grep —
  // quietly removed every OpenAI-only seat from the contract with all tests green.
  //
  // Shrinking this list is not a cleanup; it is narrowing what counts as spending
  // money. Growing it is fine and expected, and still lands here so it is deliberate.
  assert.deepEqual([...CREDENTIAL_MARKERS].sort(), [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'OPENROUTER_API_KEY',
  ], [
    'CREDENTIAL_MARKERS changed. This list decides what the whole contract can see.',
    'REMOVING one silently drops every seat that pays with it — update this assertion',
    'in the same commit and say why. ADDING one is expected as new providers appear.',
  ].join('\n'));
});

test('CONTRACT: every credential-bearing script is gated or explicitly allowlisted', () => {
  const uncovered = [];
  for (const file of candidateScripts()) {
    if (!spendsMoney(file)) continue;
    const name = file.split(/[\\/]/).pop();
    const rel = relative(SCRIPTS, file).replaceAll('\\', '/');
    // AN EXEMPTION IS SCOPED TO THE FILE IT NAMES (flash finding 7c). Both lists
    // matched by BARE NAME first, so a nested `consult-gemini.mjs` anywhere under
    // scripts/ inherited the top-level entry's free pass and the ghost test stayed
    // green. A bare key now means the top-level file only; anything deeper must be
    // keyed by its relative path — which the two gateway entries already are.
    // A path key matches that exact file at any depth; a bare key matches only the
    // top-level file of that name. Both lists take both forms, symmetrically — the
    // asymmetry (only KNOWN_UNGATED accepted paths) is what forced three libraries
    // into the frozen DEBT list when FREE_ALLOWLIST is where they belong.
    const exempt = (list) => Object.prototype.hasOwnProperty.call(list, rel)
      || (Object.prototype.hasOwnProperty.call(list, name) && rel === name);
    if (exempt(FREE_ALLOWLIST)) continue;
    if (exempt(KNOWN_UNGATED)) continue;
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
  // SHRANK 5 -> 2 on 2026-08-27, and this assertion failing is what made the move a
  // deliberate act rather than a quiet one — exactly what the freeze is for.
  //
  // The three removed rows (lib/preflight.mjs and the two gateway files) are
  // LIBRARIES that cannot bill, which is FREE_ALLOWLIST's definition. They only sat
  // in the debt list because that list was the only one the contract matched by PATH
  // — an accident of plumbing, not a judgement (GLM 5.3 round-4 F5). Parking non-debt
  // in the baseline inflated the number this workstream is driving to zero and hid
  // the two entries that are real. Debt paid down by RECLASSIFICATION, and saying so
  // out loud matters: the alternative reading is that three holes were closed, and
  // they were not — they were never holes.
  assert.deepEqual(Object.keys(KNOWN_UNGATED).sort(), [
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

test('CONTRACT: SCRIPT_MODEL has no ghosts either', () => {
  // GLM 5.3 round-5 F9. The no-ghosts discipline was applied to FREE_ALLOWLIST and
  // KNOWN_UNGATED and never to the price tables — so `consult-grok.mjs`, one of the
  // two ghosts the gate's own header cites as PROOF the roster had drifted, was still
  // sitting in SCRIPT_MODEL afterwards. Purged from the matcher, left in the tables.
  //
  // A ghost row is not dangerous the way a MISSING row is: it errs toward pricing
  // something that cannot run. It is still a lie in a table people read to learn what
  // exists, and it had quietly become a fixture in this suite's own tests.
  const gateSrc = readFileSync(join(SCRIPTS, 'hooks', 'spend-guard-gate.mjs'), 'utf-8');
  const block = gateSrc.slice(gateSrc.indexOf('const SCRIPT_MODEL'), gateSrc.indexOf('\n};', gateSrc.indexOf('const SCRIPT_MODEL')));
  const named = [...block.matchAll(/^\s*'([\w.-]+\.mjs)':/gm)].map((m) => m[1]);
  assert.ok(named.length > 5, `instrument: only ${named.length} SCRIPT_MODEL keys parsed`);

  const present = new Set(candidateScripts().map((f) => f.split(/[\\/]/).pop()));
  for (const name of named) {
    assert.ok(present.has(name),
      `SCRIPT_MODEL prices ${name}, which does not exist — remove the ghost, as the allowlists already require`);
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

test('an exemption is scoped to the file it names, not to every file with that name', () => {
  // flash finding 7c. Both lists matched by BARE NAME first, so a nested
  // `consult-gemini.mjs` anywhere under scripts/ inherited the top-level entry's
  // free pass — and the ghost test stayed green because the basename existed
  // somewhere. Free-listing a name is a statement about ONE file (this Gemini shim
  // is on a free tier), never about every future file that reuses the name.
  //
  // Written against the real predicate rather than the filesystem: creating a decoy
  // file under scripts/ during a test run would be visible to any concurrent agent
  // in this shared tree, and Rule 67 says do not do that.
  const bareKeyApplies = (list, name, rel) =>
    Object.prototype.hasOwnProperty.call(list, name) && rel === name;

  assert.equal(bareKeyApplies(FREE_ALLOWLIST, 'consult-gemini.mjs', 'consult-gemini.mjs'), true,
    'the top-level file the allowlist actually names must still be exempt');
  assert.equal(bareKeyApplies(FREE_ALLOWLIST, 'consult-gemini.mjs', 'vendor/consult-gemini.mjs'), false,
    'a NESTED file must not inherit a top-level exemption by sharing its basename');

  // The path-keyed entries keep working, which is what makes the bare-key rule safe
  // to tighten: anything nested that genuinely needs an exemption already has one.
  // Asserted on FREE_ALLOWLIST since the 5 -> 2 reclassification moved the gateway
  // libraries there; the point is that BOTH lists take path keys, not which list a
  // given library sits in.
  assert.ok(FREE_ALLOWLIST['context-gateway/src/consult.mjs'], 'nested entries are path-keyed');
  const nested = (l) => Object.keys(l).some((k) => k.includes('/'));
  assert.ok(nested(FREE_ALLOWLIST), 'FREE_ALLOWLIST must accept path keys, or libraries get pushed into the debt list');
});

test('a mention of a paid script is still not an invocation', () => {
  // The contract must not achieve coverage by matching everything.
  assert.equal(invokesPaidSeat('cat scripts/consult-fable.mjs'), false);
  assert.equal(invokesPaidSeat('npm run build'), false);
});
