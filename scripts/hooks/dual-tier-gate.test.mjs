/**
 * dual-tier-gate.test.mjs — coverage for the Rule 57 Stop gate.
 * Run: node scripts/hooks/dual-tier-gate.test.mjs
 */
import assert from 'node:assert/strict';
import { decide, analyzeTurn, parseTranscript } from './dual-tier-gate.mjs';

let pass = 0;
const fail = [];
const t = (name, fn) => {
  try { fn(); pass += 1; console.log(`  PASS  ${name}`); }
  catch (e) { fail.push(name); console.log(`  FAIL  ${name}\n        ${e.message}`); }
};

const user = (text) => JSON.stringify({ type: 'user', message: { content: text } });
const write = (path) => JSON.stringify({
  type: 'assistant',
  message: { content: [{ type: 'tool_use', name: 'Write', input: { file_path: path } }] },
});
const bash = (command) => JSON.stringify({
  type: 'assistant',
  message: { content: [{ type: 'tool_use', name: 'Bash', input: { command } }] },
});
const say = (text) => JSON.stringify({
  type: 'assistant', message: { content: [{ type: 'text', text }] },
});
const tx = (...lines) => lines.join('\n');

const BOTH = '## Plain English\nWe fixed the thing.\n\n## Technical\nsrc/a.ts, 12/12 tests.';
const TECH_ONLY = '## Technical\nsrc/a.ts changed, 12/12 tests pass.';
const PLAIN_ONLY = '## Plain English\nWe fixed the thing.';

console.log('== build-shaped turns must carry both tiers ==');
t('two file writes + technical only -> BLOCK', () => {
  const r = decide({}, tx(user('go'), write('src/a.ts'), write('src/b.ts'), say(TECH_ONLY)));
  assert.match(String(r), /no plain-English section/);
});
t('two file writes + both tiers -> allow', () => {
  assert.equal(decide({}, tx(user('go'), write('src/a.ts'), write('src/b.ts'), say(BOTH))), null);
});
t('git commit + technical only -> BLOCK', () => {
  const r = decide({}, tx(user('go'), bash('git commit -m x'), say(TECH_ONLY)));
  assert.match(String(r), /plain-English/);
});
t('plain only (no technical) -> BLOCK', () => {
  const r = decide({}, tx(user('go'), write('a.ts'), write('b.ts'), say(PLAIN_ONLY)));
  assert.match(String(r), /plain-English/);
});

console.log('\n== ordering: plain-English must lead ==');
t('technical before plain -> BLOCK with order reason', () => {
  const r = decide({}, tx(user('go'), write('a.ts'), write('b.ts'),
    say('## Technical\nstuff\n\n## Plain English\nwords')));
  assert.match(String(r), /TECHNICAL comes before/);
});

console.log('\n== non-build turns are untouched ==');
t('one file write only -> allow', () => {
  assert.equal(decide({}, tx(user('go'), write('src/a.ts'), say('done'))), null);
});
t('no writes at all -> allow', () => {
  assert.equal(decide({}, tx(user('question?'), say('an answer'))), null);
});
t('emission-only writes do not count as build', () => {
  assert.equal(decide({}, tx(user('go'),
    write('.ai-workflow/hermes-inbox/pending/x.md'),
    write('.ai-workflow/hermes-inbox/pending/y.md'), say('ok'))), null);
});

console.log('\n== escape hatch + no-loop guard ==');
t('DUAL-TIER: N/A -> allow', () => {
  assert.equal(decide({}, tx(user('go'), write('a.ts'), write('b.ts'),
    say('DUAL-TIER: N/A — trivial typo fix'))), null);
});
t('stop_hook_active -> allow (one enforcement per turn)', () => {
  assert.equal(decide({ stop_hook_active: true },
    tx(user('go'), write('a.ts'), write('b.ts'), say(TECH_ONLY))), null);
});

console.log('\n== headings must be headings, not prose mentions ==');
t('prose mention does not waive the gate', () => {
  const r = decide({}, tx(user('go'), write('a.ts'), write('b.ts'),
    say('I will write a plain english summary and a technical one later.')));
  assert.match(String(r), /plain-English/);
});
t('bold headings are accepted', () => {
  assert.equal(decide({}, tx(user('go'), write('a.ts'), write('b.ts'),
    say('**Plain English**\nwords\n\n**Technical**\nfiles'))), null);
});
t('"Plain-English Summary" / "Technical Summary" accepted', () => {
  assert.equal(decide({}, tx(user('go'), write('a.ts'), write('b.ts'),
    say('## Plain-English Summary\nwords\n\n## Technical Summary\nfiles'))), null);
});

console.log('\n== only the CLOSING message counts ==');
t('mid-turn summary then bare final message -> BLOCK', () => {
  const r = decide({}, tx(user('go'), write('a.ts'), say(BOTH), write('b.ts'), say('and pushed.')));
  assert.match(String(r), /plain-English/);
});

console.log('\n== malformed input fails open ==');
t('unparseable transcript -> allow', () => {
  assert.equal(decide({}, 'not json at all\n{{{'), null);
});
t('empty transcript -> allow', () => {
  assert.equal(decide({}, ''), null);
});
t('analyzeTurn tolerates junk entries', () => {
  const s = analyzeTurn(parseTranscript(tx('{}', 'null', user('go'), write('a.ts'))));
  assert.equal(s.fileWrites, 1);
});

console.log(`\n==== ${pass} passed, ${fail.length} failed ====`);
if (fail.length) process.exit(1);
