/**
 * transcript-settle.test.mjs — coverage for the SWA-194 flush-race fix.
 * Run: node scripts/hooks/lib/transcript-settle.test.mjs
 *
 * Two failure directions, both expensive, so both are pinned:
 *   settle too eagerly  -> a genuinely non-compliant closeout slips through and the gate
 *                          stops enforcing anything
 *   settle not at all   -> the original bug: compliant closeouts blocked, the agent rewrites
 *                          and retries, and learns the gate cries wolf
 *
 * `closingMessageLanded` gets the most cases because the FIRST version of this fix used the
 * wrong signal — "does the turn contain assistant text" — which is true long before the
 * closeout is written, so the settle silently never fired. That bug passed a syntax check,
 * passed review-by-reading, and was only caught by asserting on a real transcript.
 */
import assert from 'node:assert/strict';
import { readSettled, settleNote, closingMessageLanded, SETTLE_ATTEMPTS } from './transcript-settle.mjs';

let pass = 0;
const fail = [];
const t = (name, fn) => {
  try { fn(); pass += 1; console.log(`  PASS  ${name}`); }
  catch (e) { fail.push(name); console.log(`  FAIL  ${name}\n        ${e.message}`); }
};

const line = (o) => JSON.stringify(o);
const asstText = (s) => line({ type: 'assistant', message: { content: [{ type: 'text', text: s }] } });
const asstTool = () => line({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: {} }] } });
const attachment = () => line({ type: 'attachment', content: 'x' });
const bridge = () => line({ type: 'bridge-session', id: 'x' });

// ── closingMessageLanded ────────────────────────────────────────────────────────
t('last entry is assistant text → landed', () => {
  assert.equal(closingMessageLanded([asstTool(), asstText('## Plain English\nhi')].join('\n')), true);
});

t('last entry is an attachment → NOT landed (the real pre-flush shape)', () => {
  assert.equal(closingMessageLanded([asstText('narration'), attachment()].join('\n')), false);
});

t('last entry is a bridge-session record → NOT landed (the other observed shape)', () => {
  assert.equal(closingMessageLanded([asstText('narration'), bridge()].join('\n')), false);
});

t('last entry is a tool_use → NOT landed (model still working)', () => {
  assert.equal(closingMessageLanded([asstText('narration'), asstTool()].join('\n')), false);
});

t('mid-turn narration alone does NOT count as landed — the bug the first fix had', () => {
  // Narration exists, so "has any assistant text" would be true here. It must not be enough.
  const raw = [asstText('🔉 working on it'), asstTool(), attachment()].join('\n');
  assert.equal(closingMessageLanded(raw), false);
});

t('assistant entry with an EMPTY text block → NOT landed', () => {
  assert.equal(closingMessageLanded([asstTool(), asstText('   ')].join('\n')), false);
});

t('string-form assistant content is handled', () => {
  assert.equal(closingMessageLanded(line({ type: 'assistant', message: { content: 'done' } })), true);
});

t('empty transcript → NOT landed, no throw', () => {
  assert.equal(closingMessageLanded(''), false);
});

t('unparseable final line → NOT landed, no throw', () => {
  assert.equal(closingMessageLanded([asstText('x'), '{not json'].join('\n')), false);
});

// ── readSettled ─────────────────────────────────────────────────────────────────
const never = () => false;   // never ambiguous
const always = () => true;   // always ambiguous

t('unambiguous first read → no re-read, no delay', () => {
  let reads = 0;
  const r = readSettled('p', never, () => { reads += 1; return 'x'; }, { sleep: () => {} });
  assert.equal(reads, 1);
  assert.equal(r.attempts, 0);
  assert.equal(r.rescued, false);
});

t('ambiguous then resolves → re-reads once and reports rescued', () => {
  let n = 0;
  const amb = (raw) => raw === 'pre';
  const r = readSettled('p', amb, () => (++n === 1 ? 'pre' : 'post'), { sleep: () => {} });
  assert.equal(r.attempts, 1);
  assert.equal(r.raw, 'post');
  assert.equal(r.rescued, true);
});

t('still ambiguous after the cap → gives up and returns the last read', () => {
  let n = 0;
  const r = readSettled('p', always, () => { n += 1; return 'pre'; }, { sleep: () => {} });
  assert.equal(r.attempts, SETTLE_ATTEMPTS);
  assert.equal(n, SETTLE_ATTEMPTS + 1, 'one initial read plus one per attempt');
  assert.equal(r.rescued, false, 'must NOT claim rescue when still ambiguous');
});

t('unreadable transcript → null, no throw, no retries', () => {
  const r = readSettled('p', always, () => null, { sleep: () => {} });
  assert.equal(r.raw, null);
  assert.equal(r.attempts, 0);
});

t('file disappears mid-settle → keeps the last good read', () => {
  let n = 0;
  const r = readSettled('p', always, () => (++n === 1 ? 'first' : null), { sleep: () => {} });
  assert.equal(r.raw, 'first');
});

t('the delay is actually awaited between reads', () => {
  const slept = [];
  let n = 0;
  readSettled('p', always, () => { n += 1; return 'pre'; }, { sleep: (ms) => slept.push(ms) });
  assert.equal(slept.length, SETTLE_ATTEMPTS);
  assert.ok(slept.every((ms) => ms > 0), 'a zero delay would busy-loop and settle nothing');
});

// ── settleNote ──────────────────────────────────────────────────────────────────
t('note is silent unless a settle actually rescued a read', () => {
  assert.equal(settleNote({ rescued: false, attempts: 2 }, 'g'), null);
  assert.equal(settleNote(null, 'g'), null);
});

t('note names the gate and the attempt count when it did rescue', () => {
  const n = settleNote({ rescued: true, attempts: 1 }, 'dual-tier-gate');
  assert.match(n, /dual-tier-gate/);
  assert.match(n, /1 re-read/);
  assert.match(n, /SWA-194/);
});

console.log(`\ntranscript-settle: ${pass} passed, ${fail.length} failed`);
if (fail.length) process.exit(1);
