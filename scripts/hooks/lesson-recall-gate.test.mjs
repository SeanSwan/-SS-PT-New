/**
 * Tests for lesson-recall-gate.mjs
 *
 * node:test + node:assert to match every sibling hook test in this directory — a vitest
 * file here would be invisible to `node --test scripts/hooks/`, which is how these are run.
 *
 * The gate exists because two of five mistakes in one audit pass were repeats of lessons
 * recorded earlier in that SAME audit. So the load-bearing test is not "does it run" — it is
 * "would it have caught the real repeat that actually happened."
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  readTurn,
  isBuildShaped,
  findDuplicatedConstants,
  findSingleLayerGuards,
  collectSessionLessons,
  buildBlockReason,
  defaultGrep,
  declaresSameValue,
} from './lesson-recall-gate.mjs';

const dir = mkdtempSync(path.join(tmpdir(), 'lesson-recall-'));
process.on('exit', () => rmSync(dir, { recursive: true, force: true }));

const file = (name, body) => {
  const full = path.join(dir, name);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, body, 'utf8');
  return full;
};

const turn = (blocks) => [{ message: { role: 'assistant', content: blocks } }];

// ── turn shape ──────────────────────────────────────────────────────────────
test('reads written files and the closing text', () => {
  const { written, closingText } = readTurn(turn([
    { type: 'tool_use', name: 'Edit', input: { file_path: '/a/b.mjs' } },
    { type: 'text', text: 'done' },
  ]));
  assert.deepEqual(written, ['/a/b.mjs']);
  assert.equal(closingText, 'done');
});

test('a docs-only turn is NOT build-shaped — the gate must stay out of the way', () => {
  assert.equal(isBuildShaped(['/repo/README.md', '/repo/notes.txt']), false);
});

test('a code write IS build-shaped', () => {
  assert.equal(isBuildShaped(['/repo/routes/cart.mjs']), true);
});

// ── Shape 2 — THE DUPLICATED VALUE (blocking) ───────────────────────────────
test('CATCHES THE REAL REPEAT: MAX_CART_ITEM_QUANTITY declared in a second place', () => {
  // The actual mistake, reproduced. During the audit the ceiling was declared inside
  // cartRoutes only; enforcing it at checkout would have required a second copy.
  const routes = file('routes/cartRoutes.mjs', 'const MAX_CART_ITEM_QUANTITY = 99;\n');
  const helpers = file('utils/cartHelpers.mjs', 'export const MAX_CART_ITEM_QUANTITY = 99;\n');

  const hits = findDuplicatedConstants([routes], dir, (name) =>
    (name === 'MAX_CART_ITEM_QUANTITY' ? [helpers] : []));

  assert.equal(hits.length, 1);
  assert.equal(hits[0].name, 'MAX_CART_ITEM_QUANTITY');
  assert.equal(hits[0].literal, '99');
  assert.equal(hits[0].alsoIn[0], helpers);
});

test('names BOTH locations in the block message, so the fix is obvious', () => {
  const reason = buildBlockReason([{
    name: 'MAX_CART_ITEM_QUANTITY',
    literal: '99',
    declaredIn: '/repo/routes/cartRoutes.mjs',
    alsoIn: ['/repo/utils/cartHelpers.mjs'],
  }]);
  assert.ok(reason.includes('routes/cartRoutes.mjs'));
  assert.ok(reason.includes('utils/cartHelpers.mjs'));
  assert.ok(reason.includes('LESSON-RECALL: N/A'));
});

test('does NOT fire when the constant exists only where it was declared', () => {
  const only = file('utils/solo.mjs', 'export const SOLO_LIMIT = 5;\n');
  assert.equal(findDuplicatedConstants([only], dir, () => [only]).length, 0);
});

test('ignores lowercase/local identifiers — only SHOUT_CASE constants count', () => {
  const f = file('utils/local.mjs', 'const maxThing = 99;\n');
  assert.equal(findDuplicatedConstants([f], dir, () => ['/elsewhere.mjs']).length, 0);
});

test('catches a duplicated STRING literal too, not just numbers', () => {
  // The sibling must be a REAL file now: verification reads it to confirm it actually
  // DECLARES the same value, rather than merely mentioning the name.
  const a = file('a/codes.mjs', "const ERR_CODE = 'PRICE_ACCESS_REQUIRED';\n");
  const b = file('b/codes.mjs', "export const ERR_CODE = 'PRICE_ACCESS_REQUIRED';\n");
  assert.equal(findDuplicatedConstants([a], dir, () => [b]).length, 1);
});

test('ignores non-code files entirely', () => {
  const md = file('doc.md', 'const MAX_CART_ITEM_QUANTITY = 99;\n');
  assert.equal(findDuplicatedConstants([md], dir, () => ['/elsewhere.mjs']).length, 0);
});

// ── Shape 1 — THE HALF-FIXED RULE (advisory) ────────────────────────────────
test('flags a refusal added in exactly ONE file', () => {
  const guard = file('routes/one.mjs', 'res.status(422).json({ ok: false });\n');
  assert.equal(findSingleLayerGuards([guard]), guard);
});

test('stays quiet when the rule was enforced in several files', () => {
  const a = file('routes/a.mjs', 'res.status(409).json({});\n');
  const b = file('routes/b.mjs', 'throw new Error("nope");\n');
  assert.equal(findSingleLayerGuards([a, b]), null);
});

test('does not count test files as an enforcement layer', () => {
  const spec = file('routes/x.test.mjs', 'res.status(422).json({});\n');
  assert.equal(findSingleLayerGuards([spec]), null);
});

// ── recall — surfacing the session's own lessons ────────────────────────────
test('extracts bolded lesson lines from memos and recent commit subjects', () => {
  const memo = file('memos/m.md', [
    '## Transferable lessons',
    '- **Fixing one layer of a two-layer rule leaves the gap open.** more text',
    '- **Do not reuse a status code for two meanings.** more text',
  ].join('\n'));

  const lessons = collectSessionLessons(dir, () => [memo],
    () => ['fix(money): close two real gaps', 'chore: unrelated']);

  assert.ok(lessons.includes('Fixing one layer of a two-layer rule leaves the gap open.'));
  assert.ok(lessons.includes('Do not reuse a status code for two meanings.'));
  assert.ok(lessons.includes('fix(money): close two real gaps'));
  assert.ok(!lessons.includes('chore: unrelated'));
});

test('survives an unreadable memo without throwing — the gate must fail open', () => {
  assert.doesNotThrow(() => collectSessionLessons(dir, () => ['/nope/missing.md'], () => []));
});

// ── the REAL grep, not the injected one ─────────────────────────────────────
// The first version of defaultGrep used a \b...\b pattern, which git grep's BASIC regex
// engine rejects. Every lookup threw, the catch returned [], and the gate was a silent
// no-op — while every test above stayed green, because they inject a fake grep. That is
// the same false-confidence shape this gate exists to prevent, committed inside the gate
// itself. These pin the real implementation so the regression cannot return.
test('REAL grep finds a symbol that genuinely exists in this repo', () => {
  const hits = defaultGrep('MAX_CART_ITEM_QUANTITY', process.cwd());
  assert.ok(hits.length > 0, 'expected the real git grep to find the known symbol');
  assert.ok(hits.some((h) => h.includes('cartHelpers')));
});

// The needles below are ASSEMBLED AT RUNTIME on purpose. Written as plain literals they
// appear in this very file, and once this file is committed `git grep` finds them here —
// so the tests passed while the file was untracked and failed the moment it was tracked.
// A test that only passes before it is committed is not a test.
test('REAL grep returns empty (not a throw) for a symbol that does not exist', () => {
  const needle = ['ZZZ', 'NO', 'SUCH', 'SYMBOL'].join('_');
  assert.deepEqual(defaultGrep(needle, process.cwd()), []);
});

test('REAL grep matches whole words only — a prefix must not count as a hit', () => {
  // The needle is a strict PREFIX of the real cart-ceiling constant, which does exist in
  // the repo. Spelling that prefix out in this comment would make git grep find it HERE
  // and fail the test — the comment-trap this repo has been bitten by before, and which
  // bit this very test on its first run. Hence the runtime join and the vague wording.
  const prefix = ['MAX', 'CART'].join('_');
  assert.deepEqual(defaultGrep(prefix, process.cwd()), []);
});

// ── false-positive guards (hostile review, 2026-08-04) ──────────────────────
// The first version grepped for a MENTION of the name, which blocked three everyday
// patterns. A blocking hook that fires on normal work gets switched off, and a
// switched-off hook protects nothing — the exact failure this gate's own skill warns
// about, shipped inside the gate.
test('a TEST file mirroring a production constant does not BLOCK', () => {
  const spec = file('mirror.test.mjs', 'const SHARED_CAP_VALUE = 99;\n');
  const prod = file('prod-cap.mjs', 'export const SHARED_CAP_VALUE = 99;\n');
  assert.equal(findDuplicatedConstants([spec], dir, () => [prod]).length, 0);
});

test('a production file is NOT matched against a duplicate living in a test', () => {
  const prod = file('prod2.mjs', 'const OTHER_CAP_VALUE = 7;\n');
  const spec = file('other.test.mjs', 'const OTHER_CAP_VALUE = 7;\n');
  assert.equal(findDuplicatedConstants([prod], dir, () => [spec]).length, 0);
});

test('same NAME but a DIFFERENT value is a name collision, not a duplicated value', () => {
  const a = file('collide-a.mjs', 'const COLLIDING_NAME = 500;\n');
  const b = file('collide-b.mjs', "const COLLIDING_NAME = 'something else';\n");
  assert.equal(findDuplicatedConstants([a], dir, () => [b]).length, 0);
});

test('a mere MENTION elsewhere is not a duplicate — only a real declaration counts', () => {
  const a = file('decl.mjs', 'const MENTIONED_VALUE = 12;\n');
  const user = file('uses-it.mjs', "import { MENTIONED_VALUE } from './decl.mjs';\nconsole.log(MENTIONED_VALUE);\n");
  assert.equal(findDuplicatedConstants([a], dir, () => [user]).length, 0);
});

test('but a genuine second DECLARATION of the same name AND value still blocks', () => {
  const a = file('dup-a.mjs', 'const TRUE_DUPLICATE = 31;\n');
  const b = file('dup-b.mjs', 'export const TRUE_DUPLICATE = 31;\n');
  assert.equal(findDuplicatedConstants([a], dir, () => [b]).length, 1);
});

test('declaresSameValue requires the value to match, not just the name', () => {
  const f = file('dsv.mjs', 'export const DSV_NAME = 5;\n');
  assert.equal(declaresSameValue(f, 'DSV_NAME', '5'), true);
  assert.equal(declaresSameValue(f, 'DSV_NAME', '6'), false);
  assert.equal(declaresSameValue('/nope/missing.mjs', 'DSV_NAME', '5'), false);
});
