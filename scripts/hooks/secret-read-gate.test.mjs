/**
 * secret-read-gate.test.mjs — coverage for the Rule 59 read-side gate.
 * Run: node scripts/hooks/secret-read-gate.test.mjs
 *
 * The gate's whole value is one distinction: a read that surfaces a VALUE versus a read
 * that only establishes PRESENCE. Rule 59 endorses the second explicitly, so both
 * failure directions are expensive — blocking presence checks makes the gate an
 * obstacle that gets switched off (Rule 34), and allowing a content read reproduces the
 * 2026-05-04 incident it exists to prevent. Every case below pins one side of that line.
 *
 * Two real bugs were caught by this matrix while writing it, both of which had the gate
 * silently reporting ALLOW on the exact incident shape:
 *   1. `^`/`$` anchors failed mid-string, so `cat .env` and a path+glob joined with a
 *      space both slipped through.
 *   2. A template literal ate the regex backslashes: `\.` became "any char" and `\w`
 *      became a literal "w", so `.env.production` never matched.
 * Neither was visible without asserting on outcomes. Hence a table, not a smoke test.
 */
import assert from 'node:assert/strict';
import { decide } from './secret-read-gate.mjs';

let pass = 0;
const fail = [];
const t = (name, fn) => {
  try { fn(); pass += 1; console.log(`  PASS  ${name}`); }
  catch (e) { fail.push(name); console.log(`  FAIL  ${name}\n        ${e.message}`); }
};

const grep = (tool_input) => ({ tool_name: 'Grep', tool_input });
const read = (file_path) => ({ tool_name: 'Read', tool_input: { file_path } });
const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });

const BLOCKS = [
  ['Grep output_mode content on .env', grep({ pattern: 'K', path: '.env', output_mode: 'content' })],
  ['Grep with -C context on .env', grep({ pattern: 'K', path: '.env', '-C': 3 })],
  ['Grep content via glob on .env.production', grep({ pattern: 'K', glob: '.env.production', output_mode: 'content' })],
  ['Read .env', read('C:/x/.env')],
  ['Read .env.production', read('.env.production')],
  ['Read an SSH private key', read('/home/u/.ssh/id_rsa')],
  ['Read a .pem', read('certs/server.pem')],
  ['cat .env', bash('cat .env')],
  ['head -20 .env.local', bash('head -20 .env.local')],
  ['printenv', bash('printenv')],
  ['bare env', bash('env')],
  ['bare set', bash('set')],
  ['echo $OPENAI_API_KEY', bash('echo $OPENAI_API_KEY')],
  ['echo ${DATABASE_URL}', bash('echo ${DATABASE_URL}')],
];

const ALLOWS = [
  ['Grep files_with_matches on .env (presence only)', grep({ pattern: 'K', path: '.env', output_mode: 'files_with_matches' })],
  ['Grep count on .env (presence only)', grep({ pattern: 'K', path: '.env', output_mode: 'count' })],
  ['Grep content on ordinary source', grep({ pattern: 'foo', path: 'frontend/src', output_mode: 'content' })],
  ['Grep content on .env.example (committed placeholder)', grep({ pattern: 'K', path: '.env.example', output_mode: 'content' })],
  ['Read .env.example', read('.env.example')],
  ['Read .env.sample', read('.env.sample')],
  ['Read an ordinary file', read('src/index.ts')],
  ['Read .environment.ts (name merely starts with .env)', read('src/.environment.ts')],
  ['cat .env.example', bash('cat .env.example')],
  ['grep -c on .env (count, not content)', bash('grep -c "^KEY=" .env')],
  ['awk printing only a length', bash('awk -F= \'/^KEY=/{print "found, "length($2)" chars"}\' .env')],
  ['export K=$(grep ...) with no echo — Rule 59 endorses this', bash('export KEY=$(grep "^KEY=" .env | cut -d= -f2) && node s.mjs')],
  ['presence + length check', bash('[ -n "$KEY" ] && echo "set, ${#KEY} chars"')],
  ['cat an ordinary file', bash('cat README.md')],
  ['ls -la .env (metadata, not contents)', bash('ls -la .env')],
  ['npm run env:check', bash('npm run env:check')],
  ['a non-covered tool', { tool_name: 'Write', tool_input: { file_path: '.env' } }],
];

for (const [name, input] of BLOCKS) {
  t(`BLOCK  ${name}`, () => {
    const r = decide(input);
    assert.ok(r, 'expected a block reason, got null');
    assert.match(r, /Rule 59/);
  });
}
for (const [name, input] of ALLOWS) {
  t(`allow  ${name}`, () => {
    assert.equal(decide(input), null, 'expected null (allow)');
  });
}

t('block reason names a concrete alternative, not just a refusal', () => {
  const r = decide(grep({ pattern: 'K', path: '.env', output_mode: 'content' }));
  assert.match(r, /Do this instead/);
  assert.match(r, /files_with_matches|count/);
});

t('block reason tells the agent what to do if a value leaks anyway', () => {
  const r = decide(read('.env'));
  assert.match(r, /STOP and tell Sean/i);
});

console.log(`\nsecret-read-gate: ${pass} passed, ${fail.length} failed`);
if (fail.length) process.exit(1);
