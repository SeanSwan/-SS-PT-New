/**
 * orient-gate.test.mjs — coverage for the ORIENT Stop gate.
 * Run: node scripts/hooks/orient-gate.test.mjs
 *
 * Live git facts and the ledger hash are INJECTED, so these assertions do not change meaning
 * every time somebody commits. The gate's third and fourth parameters exist for exactly this.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { decide, analyzeTurn, parseTranscript, isKnownSha } from './orient-gate.mjs';
import { parseOrient, contentHash } from '../lib/orient-contract.mjs';

/** Hash a block exactly the way the renderer does — via the contract, not a reimplementation.
 *  A hand-rolled copy here would let the test pass while the real detector was broken. */
const hashOf = (block) => contentHash(parseOrient(block), createHash);

let pass = 0;
const fail = [];
const t = (name, fn) => {
  try { fn(); pass += 1; console.log(`  PASS  ${name}`); }
  catch (e) { fail.push(name); console.log(`  FAIL  ${name}\n        ${e.message}`); }
};

const user = (text) => JSON.stringify({ type: 'user', message: { content: text } });
const write = (p) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Write', input: { file_path: p } }] } });
const bash = (c) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { command: c } }] } });
const say = (text) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text }] } });
const tx = (...l) => l.join('\n');

const LIVE = { branch: 'wip/x', sha: 'abc1234', recentShas: ['abc1234', 'def5678'] };

const ID = (branch = 'wip/x', sha = 'abc1234', size = 'L', status = 'WIP') =>
  `Reporting Standard v3 · ${branch}@${sha} · 3/7 · [${status}] · ${size}`;
const A = 'ASK   Replace the dual-tier closeout with an index I can trust from any tab';
const N = 'NOW   Contract and renderer landed; the gate is next in line';
const X = 'NEXT  Delete the old gate and flip enforcement in one commit';
const W = 'WHY   Many parallel projects and no way to tell which one a tab belongs to';
const D = 'DONE  Two reviewers decided replace-atomically on wrong-target grounds';
const P = 'PROOF abc1234 · 46/46 tests · scripts/lib/orient-contract.mjs';

const light = (id = ID()) => [id, A, N, X].join('\n');
const full = (id = ID('wip/x', 'abc1234', 'F')) => [id, A, W, D, N, P, X].join('\n');

const workTurn = (text) => tx(user('go'), write('a.ts'), write('b.ts'), say(text));
const commitTurn = (text) => tx(user('go'), write('a.ts'), bash('git commit -m x'), say(text));

console.log('== the happy paths ==');
t('LIGHT block on a work turn -> allow', () => assert.equal(decide({}, workTurn(light()), LIVE, null), null));
t('FULL block on a commit turn -> allow', () => assert.equal(decide({}, commitTurn(full()), LIVE, null), null));
t('block inside a markdown fence, as it appears in chat -> allow', () =>
  assert.equal(decide({}, workTurn('```\n' + light() + '\n```\n\nprose.'), LIVE, null), null));

console.log('\n== identity-line variants the renderer really emits ==');
// REGRESSION (2026-08-27): once several agents each kept a ledger, the read path correctly
// refused to guess whose it was and emitted `· no-ledger`. The parser demanded the size marker
// IMMEDIATELY after the status, so every degraded-but-honest block became unparseable and was
// rejected as absent. Graceful degradation that the gate rejects is not graceful degradation.
for (const [label, id] of [
  ['no-ledger segment present', 'SS-PT · wip/x@abc1234 · [WIP] · no-ledger · L'],
  ['no step segment', 'SS-PT · wip/x@abc1234 · [WIP] · L'],
  ['pre-first-commit sha', 'SS-PT · wip/x@NONE · [WIP] · no-ledger · L'],
]) {
  t(`${label} -> parses and allows`, () =>
    assert.equal(decide({}, workTurn([id, A, N, X].join('\n')), LIVE, null), null));
}
t('identity line with no size marker -> BLOCK as absent', () =>
  assert.match(String(decide({}, workTurn(['SS-PT · wip/x@abc1234 · [WIP]', A, N, X].join('\n')), LIVE, null)), /ORIENT-ABSENT/));

console.log('\n== Sean\'s trivial-turn exemption (his call 2026-08-27) ==');
t('bare acknowledgement, no tools -> allow', () =>
  assert.equal(decide({}, tx(user('looks good'), say('Ack — moving to the flip.')), LIVE, null), null));
t('short reply that still USED a tool -> BLOCK (not trivial)', () =>
  assert.match(String(decide({}, tx(user('check'), write('a.ts'), say('done.')), LIVE, null)), /ORIENT-ABSENT/));
t('long substantive answer with no tools -> BLOCK', () => {
  const longText = 'The panel found that '.repeat(20);
  assert.match(String(decide({}, tx(user('what did they say?'), say(longText)), LIVE, null)), /ORIENT-ABSENT/);
});

console.log('\n== escape hatch is a whitelist, not free text ==');
t('whitelisted reason -> allow', () =>
  assert.equal(decide({}, workTurn('ORIENT: N/A — NO-WORK'), LIVE, null), null));
t('free-text reason -> BLOCK (this is what rotted the old hatch)', () =>
  assert.match(String(decide({}, workTurn('ORIENT: N/A — not needed here'), LIVE, null)), /ORIENT-ABSENT/));

console.log('\n== empty theater: present, well-formed, and worthless ==');
for (const [label, bad] of [
  ['NOW is "done"', [ID(), A, 'NOW   done', X].join('\n')],
  ['NEXT is "TBD"', [ID(), A, N, 'NEXT  TBD'].join('\n')],
  ['NOW is "see above"', [ID(), A, 'NOW   see above', X].join('\n')],
]) {
  t(`${label} -> BLOCK as vacuous`, () =>
    assert.match(String(decide({}, workTurn(bad), LIVE, null)), /ORIENT-VACUOUS/));
}
t('a field under the floor -> BLOCK as budget', () =>
  assert.match(String(decide({}, workTurn([ID(), A, 'NOW   ok fine', X].join('\n')), LIVE, null)), /ORIENT-(VACUOUS|BUDGET)/));
t('a field over the cap -> BLOCK as budget', () =>
  assert.match(String(decide({}, workTurn([ID(), A, `NOW   ${'x'.repeat(200)}`, X].join('\n')), LIVE, null)), /ORIENT-BUDGET/));

console.log('\n== PROOF must make a checkable claim ==');
t('PROOF with no machine token -> BLOCK', () => {
  const bad = [ID('wip/x', 'abc1234', 'F'), A, W, D, N, 'PROOF everything works nicely now', X].join('\n');
  assert.match(String(decide({}, commitTurn(bad), LIVE, null)), /ORIENT-UNVERIFIABLE-PROOF/);
});
t('PROOF citing a sha that is not in recent history -> BLOCK', () => {
  const bad = [ID('wip/x', 'abc1234', 'F'), A, W, D, N, 'PROOF 9999999 · all green across the suite', X].join('\n');
  assert.match(String(decide({}, commitTurn(bad), LIVE, null)), /ORIENT-UNVERIFIABLE-PROOF/);
});
t('PROOF citing a real recent sha -> allow', () =>
  assert.equal(decide({}, commitTurn(full()), LIVE, null), null));
// REGRESSION (2026-08-27): recentShas came from `%h`, which honours core.abbrev — 9 chars in
// this repo — while the cited token was sliced to 7. Exact-matching two different abbreviation
// lengths could never succeed, so the check rejected every legitimately-cited commit, including
// the one the gate itself had just made. Full shas are stored now and matched by PREFIX.
const LIVE_FULL = { ...LIVE, recentShas: ['abc1234def5678901234567890abcdef12345678'] };
for (const [label, cited] of [
  ['7-char prefix', 'abc1234'],
  ['9-char prefix', 'abc1234de'],
  ['12-char prefix', 'abc1234def567'],
  ['full 40-char sha', 'abc1234def5678901234567890abcdef12345678'],
]) {
  t(`PROOF citing a ${label} of a real commit -> allow`, () => {
    const b = [ID('wip/x', 'abc1234', 'F'), A, W, D, N, `PROOF ${cited} · 46/46 tests pass`, X].join('\n');
    assert.equal(decide({}, commitTurn(b), LIVE_FULL, null), null);
  });
}
t('PROOF citing a sha that is a prefix of nothing -> BLOCK', () => {
  const b = [ID('wip/x', 'abc1234', 'F'), A, W, D, N, 'PROOF fedcba9 · 46/46 tests pass', X].join('\n');
  assert.match(String(decide({}, commitTurn(b), LIVE_FULL, null)), /ORIENT-UNVERIFIABLE-PROOF/);
});
t('isKnownSha rejects a token shorter than 7', () =>
  assert.equal(isKnownSha('abc123', LIVE_FULL.recentShas), false));

console.log('\n== derived-line checks a typed header cannot survive ==');
t('wrong branch -> BLOCK as wrong project', () =>
  assert.match(String(decide({}, workTurn(light(ID('other/branch'))), LIVE, null)), /ORIENT-WRONG-PROJECT/));
t('stale sha with no commit this turn -> BLOCK', () =>
  assert.match(String(decide({}, workTurn(light(ID('wip/x', '0000000'))), LIVE, null)), /ORIENT-STALE/));
t('stale sha WITH a commit this turn -> allow (HEAD moved after an honest render)', () =>
  assert.equal(decide({}, commitTurn(full(ID('wip/x', '0000000', 'F'))), LIVE, null), null));
t('LIGHT block on a committing turn -> BLOCK as size mismatch', () =>
  assert.match(String(decide({}, commitTurn(light()), LIVE, null)), /ORIENT-SIZE-MISMATCH/));

console.log('\n== carried copy: fresh sha, frozen prose ==');
t('content identical to last render on a work turn -> BLOCK', () => {
  const h = hashOf(light());
  assert.match(String(decide({}, workTurn(light()), LIVE, h)), /ORIENT-CARRIED-COPY/);
});
t('same content but a turn that changed nothing -> allow', () => {
  const h = hashOf(light());
  assert.equal(decide({}, tx(user('go'), bash('git status'), say(light())), LIVE, h), null);
});
// REGRESSION (2026-08-27): the gate accused its own author on its first live turn. The renderer
// used to stamp last_block_hash at RENDER time, so the first honest emission of freshly-written
// content compared equal to itself. The hash now records the last ACCEPTED block — written by
// the gate on allow — so brand-new content, which has never been accepted, must pass.
t('freshly written content with no prior accepted hash -> allow', () =>
  assert.equal(decide({}, workTurn(light()), LIVE, null), null));
t('content that genuinely moved since the last accepted block -> allow', () => {
  const previous = hashOf(light());
  const moved = [ID(), A, 'NOW   The gate caught a false positive in its own carried-copy check', X].join('\n');
  assert.equal(decide({}, workTurn(moved), LIVE, previous), null);
});

console.log('\n== fail-open postures ==');
t('git unavailable -> derived checks cannot accuse', () =>
  assert.equal(decide({}, workTurn(light(ID('wip/x', '0000000'))), { branch: null, sha: null, recentShas: [] }, null), null));
t('stop_hook_active -> allow', () =>
  assert.equal(decide({ stop_hook_active: true }, workTurn('nothing'), LIVE, null), null));
t('unparseable transcript -> allow', () => assert.equal(decide({}, 'not json\n{{{', LIVE, null), null));
t('empty transcript -> allow', () => assert.equal(decide({}, '', LIVE, null), null));
t('analyzeTurn tolerates junk entries', () => {
  const s = analyzeTurn(parseTranscript(tx('{}', 'null', user('go'), write('a.ts'))));
  assert.equal(s.fileWrites, 1);
});

console.log(`\n==== ${pass} passed, ${fail.length} failed ====`);
if (fail.length) process.exit(1);
