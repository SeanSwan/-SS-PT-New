/**
 * orient-contract.test.mjs — the round-trip proof.
 * Run: node scripts/lib/orient-contract.test.mjs
 *
 * The assertion that matters: WHAT `scripts/orient.mjs` ACTUALLY RENDERS is what
 * `scripts/hooks/orient-gate.mjs` ACTUALLY ACCEPTS. Every other suite checks one side of the
 * contract against a hand-written fixture, and hand-written fixtures are exactly how a writer
 * and a reader drift apart while both their suites stay green. This one runs the real renderer
 * and feeds its real bytes to the real gate.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { parseOrient, validateShape, LIGHT_FIELDS, FULL_FIELDS, ORIENT_WINDOW_LINES, BUDGET, VACUOUS_RE, PROOF_TOKEN_RE } from './orient-contract.mjs';
import { decide, readGitFacts } from '../hooks/orient-gate.mjs';

let pass = 0;
const fail = [];
const t = (name, fn) => {
  try { fn(); pass += 1; console.log(`  PASS  ${name}`); }
  catch (e) { fail.push(name); console.log(`  FAIL  ${name}\n        ${e.message}`); }
};

// Pin the pid: several agents keep ledgers in this shared tree, so an unpinned read resolves
// to "no ledger" and this suite would quietly stop exercising the populated path it exists for.
const render = (...a) =>
  execFileSync('node', ['scripts/orient.mjs', '--pid', 'SS-REPORT', ...a], { encoding: 'utf8' }).trim();

const turn = (text, withCommit) => [
  JSON.stringify({ type: 'user', message: { content: 'go' } }),
  JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Write', input: { file_path: 'a.ts' } }] } }),
  withCommit
    ? JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { command: 'git commit -m x' } }] } })
    : JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Write', input: { file_path: 'b.ts' } }] } }),
  JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text }] } }),
].join('\n');

console.log('== round trip: what the renderer emits, the gate must accept ==');
for (const [label, args, commit] of [['LIGHT', [], false], ['FULL', ['--full'], true]]) {
  const block = render(...args);

  t(`${label} parses and validates clean`, () => {
    const claim = parseOrient(block);
    assert.ok(claim, `parseOrient returned null for:\n${block}`);
    assert.equal(claim.size, label === 'FULL' ? 'F' : 'L');
    assert.deepEqual(validateShape(claim), [], 'renderer emitted a block its own contract rejects');
  });

  t(`${label} reports the live branch and sha`, () => {
    const live = readGitFacts();
    const claim = parseOrient(block);
    if (live.branch) assert.equal(claim.branch, live.branch);
    if (live.sha) assert.equal(claim.sha, live.sha);
  });

  t(`${label} satisfies the Stop gate on its matching turn`, () => {
    assert.equal(decide({}, turn(block, commit), undefined, null), null,
      `gate rejected its own renderer's ${label} output`);
  });

  t(`${label} satisfies the gate when fenced, as it appears in chat`, () => {
    assert.equal(decide({}, turn('```\n' + block + '\n```\n\nprose.', commit), undefined, null), null);
  });

  t(`${label} fits the opening window`, () => {
    const n = block.split('\n').length;
    assert.ok(n <= ORIENT_WINDOW_LINES, `${label} is ${n} lines, window is ${ORIENT_WINDOW_LINES}`);
  });
}

console.log('\n== the renderer cannot silently drop or reorder a required field ==');
t('LIGHT carries exactly the light fields, in order', () => {
  assert.deepEqual(render().split('\n').slice(1).map((l) => l.split(/\s/)[0]), LIGHT_FIELDS);
});
t('FULL carries exactly the full fields, in order', () => {
  assert.deepEqual(render('--full').split('\n').slice(1).map((l) => l.split(/\s/)[0]), FULL_FIELDS);
});

console.log('\n== the renderer cannot emit content its own gate calls theater ==');
t('no rendered field is vacuous', () => {
  const claim = parseOrient(render('--full'));
  for (const [k, v] of Object.entries(claim.fields)) {
    assert.ok(!VACUOUS_RE.test(v.trim()), `${k} rendered as the placeholder "${v}"`);
  }
});
t('every rendered field is inside its budget', () => {
  const claim = parseOrient(render('--full'));
  for (const [k, v] of Object.entries(claim.fields)) {
    const [min, max] = BUDGET[k];
    assert.ok(v.length >= min && v.length <= max, `${k} is ${v.length} chars, budget is ${min}-${max}`);
  }
});
t('rendered PROOF carries a checkable token', () => {
  assert.match(parseOrient(render('--full')).fields.PROOF, PROOF_TOKEN_RE);
});

console.log(`\n==== ${pass} passed, ${fail.length} failed ====`);
if (fail.length) process.exit(1);
