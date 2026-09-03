/**
 * closeout-gate.test.mjs — contract tests for the unified closeout Stop gate.
 * Ports every scenario the three predecessor suites protected (hermes-closeout-gate,
 * linear-sync-gate, dual-tier-gate) and adds the property this gate exists for:
 * ONE block naming EVERY missing item, and per-check shadow honoring.
 *
 * Run: node --test scripts/hooks/closeout-gate.test.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { analyzeTurn, decide, memoMissingMistakes, parseTranscript, runChecks } from './closeout-gate.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const settings = JSON.parse(readFileSync(join(REPO_ROOT, '.claude/settings.json'), 'utf8'));
const stopHooks = settings.hooks?.Stop?.flatMap((group) => group.hooks ?? []) ?? [];

const line = (obj) => JSON.stringify(obj);
const userText = (text) => line({ type: 'user', message: { content: [{ type: 'text', text }] } });
const toolUse = (name, input) =>
  line({ type: 'assistant', message: { content: [{ type: 'tool_use', name, input }] } });
const say = (text) => line({ type: 'assistant', message: { content: [{ type: 'text', text }] } });
const tx = (...lines) => lines.join('\n');

const MEMO = '.ai-workflow/hermes-inbox/pending/20260826T000000Z-vs-claude-x.md';
const GOOD_MEMO = () => '## Mistakes I made\n- x -> caught by y -> rule z';
const FULL_CLOSEOUT = [
  '## Plain English',
  'We merged three gates into one.',
  '## Technical',
  `Memo: ${MEMO}`,
  'LINEAR: SWA-23',
].join('\n');

const build = (...tail) => tx(userText('do the work'), toolUse('Edit', { file_path: 'src/a.ts' }), toolUse('Edit', { file_path: 'src/b.ts' }), ...tail);
const reasonOf = (raw, deps) => decide({}, raw, { readFile: GOOD_MEMO, ...deps }).reason;

// ── Registration ────────────────────────────────────────────────────────────
test('registered exactly once as a command Stop hook; the three predecessors are NOT registered', () => {
  assert.equal(stopHooks.filter((h) => h.type === 'prompt').length, 0);
  const mine = stopHooks.filter((h) => h.type === 'command' && /closeout-gate\.mjs/.test(String(h.command ?? '')));
  assert.equal(mine.length, 1);
  assert.equal(mine[0].timeout, 30);
  for (const old of ['hermes-closeout-gate', 'linear-sync-gate', 'dual-tier-gate']) {
    assert.equal(
      stopHooks.filter((h) => String(h.command ?? '').includes(`${old}.mjs`)).length, 0,
      `${old} must be unregistered — it is superseded by closeout-gate`,
    );
  }
});

// ── The property this gate exists for ───────────────────────────────────────
test('THE POINT: a build turn with nothing satisfied gets ONE block naming all three items', () => {
  const r = reasonOf(build(say('Implemented and verified.')));
  assert.match(r, /3 items missing/);
  assert.match(r, /1\. Hermes memo/);
  assert.match(r, /2\. Linear board sync/);
  assert.match(r, /3\. Dual-tier summary/);
  assert.match(r, /ONE reply/);
});

test('a fully compliant single closeout passes with no block', () => {
  assert.equal(reasonOf(build(toolUse('Write', { file_path: MEMO }), say(FULL_CLOSEOUT))), null);
});

test('partial compliance lists only what is still missing, renumbered', () => {
  const r = reasonOf(build(toolUse('Write', { file_path: MEMO }), say('## Plain English\nok\n## Technical\nfiles')));
  assert.match(r, /1 item missing/);
  assert.match(r, /1\. Linear board sync/);
  assert.doesNotMatch(r, /Hermes memo —/);
  assert.doesNotMatch(r, /Dual-tier/);
});

test('a shadowed check is dropped from the block; an all-shadowed turn is allowed', () => {
  const shadowTwo = (id) => id !== 'linear-sync-gate';
  const r = decide({}, build(say('done')), { readFile: GOOD_MEMO, isShadowed: shadowTwo });
  assert.match(r.reason, /1 item missing/);
  assert.match(r.reason, /Linear board sync/);
  assert.equal(r.checks.filter((c) => c.shadowed).length, 2);
  const all = decide({}, build(say('done')), { readFile: GOOD_MEMO, isShadowed: () => true });
  assert.equal(all.reason, null);
  assert.equal(all.checks.filter((c) => c.missing).length, 3, 'shadowed checks still report would-block');
});

test('a throwing isShadowed makes the check BLOCK (never silently disable)', () => {
  const r = decide({}, build(say('done')), { readFile: GOOD_MEMO, isShadowed: () => { throw new Error('boom'); } });
  assert.match(r.reason, /3 items missing/);
});

// ── Substantiality (one definition for every check) ─────────────────────────
test('one file write is below threshold — silent', () => {
  assert.equal(reasonOf(tx(userText('tweak'), toolUse('Edit', { file_path: 'src/a.ts' }), say('done'))), null);
});

test('a git commit alone is build-shaped', () => {
  assert.match(reasonOf(tx(userText('ship'), toolUse('Bash', { command: 'git commit -m x' }))), /3 items/);
});

test('git -C <worktree> commit/push is build-shaped', () => {
  for (const command of ['git -C C:/tmp/wt commit -m "x"', 'git -C "C:/tmp/w t" push origin HEAD:review']) {
    assert.match(reasonOf(tx(userText('go'), toolUse('Bash', { command }))), /items missing/, command);
  }
});

test('memo / packet / memory writes do not count toward substantiality', () => {
  const raw = tx(userText('note'), toolUse('Write', { file_path: MEMO }), toolUse('Write', { file_path: 'memory/y.md' }), toolUse('Write', { file_path: 'docs/ai-workflow/hermes-learning-packets/z.md' }));
  assert.equal(reasonOf(raw), null);
});

test('trivial conversational turn passes silently', () => {
  assert.equal(reasonOf(tx(userText('what is 2+2?'), say('4'))), null);
});

test('stop_hook_active short-circuits even on a non-compliant turn', () => {
  assert.equal(decide({ stop_hook_active: true }, build(say('nope')), { readFile: GOOD_MEMO }).reason, null);
});

test('only the CURRENT turn counts', () => {
  const raw = tx(userText('t1'), toolUse('Write', { file_path: 'a.ts' }), toolUse('Write', { file_path: 'b.ts' }), userText('t2: what time is it?'), say('late'));
  assert.equal(reasonOf(raw), null);
  assert.equal(analyzeTurn(parseTranscript(raw)).fileWrites, 0);
});

test('a hook-feedback line does not reset the window (parity bug)', () => {
  const raw = tx(build(toolUse('Write', { file_path: MEMO }), say(FULL_CLOSEOUT)), userText('Stop hook feedback:\nCloseout incomplete...'));
  const s = analyzeTurn(parseTranscript(raw));
  assert.equal(s.fileWrites, 2);
  assert.equal(reasonOf(raw), null);
});

test('malformed transcript lines are tolerated', () => {
  assert.equal(reasonOf(tx('not-json{{{', userText('hi'), 'also-bad', say('hello'))), null);
  assert.equal(reasonOf(''), null);
});

// ── Hermes check ────────────────────────────────────────────────────────────
test('memo cited in the closing text (not written this turn) satisfies the Hermes check', () => {
  const r = reasonOf(build(say(`## Plain English\nx\n## Technical\nMemo at ${MEMO}\nLINEAR: N/A — no issue`)));
  assert.equal(r, null);
});

test('memo cited in string-form assistant content counts', () => {
  const strAssistant = line({ type: 'assistant', message: { content: `## Plain English\nx\n## Technical\nLINEAR: N/A — x. Memo: ${MEMO}` } });
  assert.equal(reasonOf(tx(userText('go'), toolUse('Bash', { command: 'git commit -m x' }), strAssistant)), null);
});

test('memo WITHOUT a mistakes section is reported, memo WITH one passes, unreadable fails open', () => {
  const raw = build(toolUse('Write', { file_path: MEMO }), say(FULL_CLOSEOUT));
  assert.match(reasonOf(raw, { readFile: () => '## What I did' }), /missing its "## Mistakes I made"/);
  assert.equal(reasonOf(raw, { readFile: () => '## Mistakes I made — none surfaced this task' }), null);
  assert.equal(reasonOf(raw, { readFile: () => { throw new Error('ENOENT'); } }), null);
});

test('lookalike mistakes headings do not satisfy; legitimate variants do', () => {
  for (const t of ['## Mistakes-adjacent notes', '## Mistaken assumptions', 'prose Mistakes I made no heading', 'Some ## Mistakes I made']) {
    assert.equal(memoMissingMistakes(['bad.md'], () => t), 'bad.md', t);
  }
  for (const t of ['## Mistakes I made\n- x', '## mistakes i made', '   ## Mistakes I made', '##Mistakes I made', '#### Mistakes I made']) {
    assert.equal(memoMissingMistakes(['ok.md'], () => t), null, t);
  }
});

// ── Linear check ────────────────────────────────────────────────────────────
const linearOnly = (closeout) => {
  const raw = build(toolUse('Write', { file_path: MEMO }), say(`## Plain English\nx\n## Technical\n${closeout}`));
  return reasonOf(raw);
};

test('a bare SWA mention is citing, not syncing', () => {
  assert.match(linearOnly('Related context lives in SWA-111.'), /Linear board sync/);
});

test('explicit LINEAR: SWA-<n> passes, with emphasis / notes / lowercase', () => {
  for (const c of ['LINEAR: SWA-144 (updated)', '**LINEAR:** SWA-144', 'linear: swa-144']) assert.equal(linearOnly(c), null, c);
});

test('LINEAR: + prose + incidental citation does NOT pass', () => {
  for (const c of ['LINEAR: none — but SWA-9 exists', 'LINEAR: pending, see SWA-5 later']) assert.match(linearOnly(c), /Linear board sync/, c);
});

test('LINEAR: N/A — reason passes', () => {
  assert.equal(linearOnly('LINEAR: N/A — typo fix, maps to no issue'), null);
});

test('an actual board write passes with no marker; a read does not', () => {
  const base = (tool) => build(toolUse('Write', { file_path: MEMO }), toolUse(tool, { id: 'SWA-144' }), say('## Plain English\nx\n## Technical\ny'));
  assert.equal(reasonOf(base('mcp__linear-server__save_issue')), null);
  assert.match(reasonOf(base('mcp__linear-server__get_issue')), /Linear board sync/);
});

// ── Dual-tier check ─────────────────────────────────────────────────────────
const dualOnly = (closing) => reasonOf(build(toolUse('Write', { file_path: MEMO }), say(closing)));

test('technical-only or plain-only closing is reported', () => {
  assert.match(dualOnly('## Technical\nfiles\nLINEAR: SWA-1'), /Dual-tier summary/);
  assert.match(dualOnly('## Plain English\nwords\nLINEAR: SWA-1'), /Dual-tier summary/);
});

test('technical before plain-English is reported as an ordering problem', () => {
  assert.match(dualOnly('## Technical\nstuff\nLINEAR: SWA-1\n## Plain English\nwords'), /TECHNICAL comes first/);
});

test('bold headings and "Summary" variants are accepted; prose mentions are not', () => {
  assert.equal(dualOnly('**Plain English**\nw\n**Technical**\nLINEAR: SWA-1'), null);
  assert.equal(dualOnly('## Plain-English Summary\nw\n## Technical Summary\nLINEAR: SWA-1'), null);
  assert.match(dualOnly('I will write a plain english summary and a technical one later. LINEAR: SWA-1'), /Dual-tier/);
});

test('DUAL-TIER: N/A passes the dual-tier check', () => {
  assert.equal(dualOnly('DUAL-TIER: N/A — trivial\nLINEAR: SWA-1'), null);
});

test('only the CLOSING message counts for markers', () => {
  const raw = tx(userText('go'), toolUse('Write', { file_path: 'a.ts' }), say(FULL_CLOSEOUT), toolUse('Write', { file_path: 'b.ts' }), say('and pushed.'));
  assert.match(reasonOf(raw), /Linear board sync/);
  assert.match(reasonOf(raw), /Dual-tier/);
});

test('runChecks reports the three predecessor ids in order', () => {
  const ids = runChecks(analyzeTurn(parseTranscript(build(say('x')))), GOOD_MEMO).map((c) => c.id);
  assert.deepEqual(ids, ['hermes-closeout-gate', 'linear-sync-gate', 'dual-tier-gate']);
});
