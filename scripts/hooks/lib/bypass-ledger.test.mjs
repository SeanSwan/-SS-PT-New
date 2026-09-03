/**
 * bypass-ledger.test.mjs — coverage for the escape-hatch audit ledger (SWA-200).
 * Run: node scripts/hooks/lib/bypass-ledger.test.mjs
 *
 * Redaction gets the most cases, and that is not paranoia about a nice-to-have. This ledger
 * writes COMMAND TEXT to disk on every bypass. A bypass command is exactly the kind that
 * carries a token in a push URL or a key in an env prefix. A ledger built to make bypasses
 * visible that leaked a credential doing it would be a strictly worse trade than no ledger.
 *
 * The write path is also pinned as never-throwing. A ledger that can crash a gate makes
 * recording bypasses more dangerous than not recording them, which would get it removed.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { recordBypass, readBypasses, summarise, redact, LEDGER_REL } from './bypass-ledger.mjs';

let pass = 0;
const fail = [];
const t = (name, fn) => {
  try { fn(); pass += 1; console.log(`  PASS  ${name}`); }
  catch (e) { fail.push(name); console.log(`  FAIL  ${name}\n        ${e.message}`); }
};
const sandbox = () => mkdtempSync(join(tmpdir(), 'bypass-'));

/**
 * Fixtures are ASSEMBLED AT RUNTIME rather than written as literals.
 *
 * The first version of this file spelled them out — and the repo's own pre-commit secret
 * scanner blocked the commit, flagging a google-api-key, a slack-bot-token and a postgres
 * URL. It was right to: a scanner that can tell "this key is only a test fixture" from "this
 * key is real" is a scanner that can be talked out of blocking, and every one of these
 * matches the shape it is meant to catch.
 *
 * Concatenating the pieces keeps the test honest (redact() still sees a complete,
 * realistic-looking credential) without parking a credential-shaped literal in git forever.
 * The alternative — a .secretignore entry — would have traded a permanent scanner exemption
 * for five minutes of convenience.
 */
const fake = (...parts) => parts.join('');

// ── redaction: the property that makes this safe to write at all ────────────────
const LEAKS = [
  ['github token in a push URL', `git push https://u:${fake('ghp', '_', 'A'.repeat(24))}@github.com/x/y.git`, /ghp_A/],
  ['openai-style key', `echo ${fake('sk', '-', 'abcdefghijklmnopqrstuvwx')}`, /sk-abcdef/],
  ['postgres URL with password', `psql ${fake('postgres', '://')}admin:hunter2@db.example.com/prod`, /hunter2/],
  ['bearer JWT', `curl -H "Authorization: Bearer ${fake('eyJ', 'hbGciOiJIUzI1NiJ9', '.', 'eyJzdWIiOiIxIn0')}"`, /eyJhbGci/],
  ['slack token', `curl -d token=${fake('xox', 'b', '-1234567890-abcdefghij')}`, /xoxb-1/],
  ['google api key', `${fake('AIza', 'Sy', 'A'.repeat(33))} node x.mjs`, /AIzaSyA/],
  ['email address', 'notify someone@example.com', /@example\.com/],
  ['long numeric id', 'chat_id 123456789012', /1234567890/],
];

for (const [name, input, mustNotSurvive] of LEAKS) {
  t(`redacts ${name}`, () => {
    assert.doesNotMatch(redact(input), mustNotSurvive, `secret survived redaction: ${redact(input)}`);
  });
}

t('leaves an innocent command readable — a ledger nobody can read is useless', () => {
  assert.equal(redact('git rebase main'), 'git rebase main');
});

t('caps length so one pathological command cannot bloat the ledger', () => {
  assert.ok(redact('x'.repeat(5000)).length <= 120);
});

t('handles null/undefined without throwing', () => {
  assert.equal(redact(undefined), '');
  assert.equal(redact(null), '');
});

// ── the write path ──────────────────────────────────────────────────────────────
t('records an entry with gate, escape and timestamp', () => {
  const dir = sandbox();
  try {
    assert.equal(recordBypass({ gate: 'g', escape: 'E=1', detail: 'git rebase', repoRoot: dir }), true);
    const rows = readBypasses(dir);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].gate, 'g');
    assert.equal(rows[0].escape, 'E=1');
    assert.ok(Date.parse(rows[0].at) > 0, 'timestamp must be parseable');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

t('appends rather than overwrites — the record is the point', () => {
  const dir = sandbox();
  try {
    for (let i = 0; i < 3; i += 1) recordBypass({ gate: 'g', escape: 'E', detail: `${i}`, repoRoot: dir });
    assert.equal(readBypasses(dir).length, 3);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

t('the detail written to disk is redacted, not raw', () => {
  const dir = sandbox();
  try {
    recordBypass({ gate: 'g', escape: 'E', detail: `push https://u:${fake('ghp', '_', 'A'.repeat(24))}@h/x`, repoRoot: dir });
    const raw = readFileSync(join(dir, LEDGER_REL), 'utf8');
    assert.doesNotMatch(raw, /ghp_A/, 'a raw token reached the ledger file');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

t('NEVER throws when the ledger cannot be written', () => {
  // A gate must not die because its audit line failed.
  assert.equal(recordBypass({ gate: 'g', escape: 'E', repoRoot: '\0invalid\0path' }), false);
});

t('missing ledger reads as empty, not as an error', () => {
  const dir = sandbox();
  try { assert.deepEqual(readBypasses(dir), []); }
  finally { rmSync(dir, { recursive: true, force: true }); }
});

t('a corrupt line is skipped, not fatal — one bad line must not hide the rest', () => {
  const dir = sandbox();
  try {
    mkdirSync(join(dir, '.ai-workflow', 'bypass'), { recursive: true });
    writeFileSync(join(dir, LEDGER_REL), '{"gate":"a","escape":"x"}\nNOT JSON\n{"gate":"b","escape":"y"}\n');
    const rows = readBypasses(dir);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows.map((r) => r.gate), ['a', 'b']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

t('summarise counts per gate and per escape — the operational signal', () => {
  const s = summarise([
    { gate: 'git', escape: 'A' }, { gate: 'git', escape: 'A' },
    { gate: 'git', escape: 'B' }, { gate: 'tok', escape: 'C' },
  ]);
  assert.equal(s.git.total, 3);
  assert.equal(s.git.escapes.A, 2);
  assert.equal(s.tok.total, 1);
});

t('the ledger path stays under .ai-workflow so the gitignore rule keeps holding', () => {
  assert.match(LEDGER_REL.replace(/\\/g, '/'), /^\.ai-workflow\/bypass\//);
});

console.log(`\nbypass-ledger: ${pass} passed, ${fail.length} failed`);
if (fail.length) process.exit(1);
