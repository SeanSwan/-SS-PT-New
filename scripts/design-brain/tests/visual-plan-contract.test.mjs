/**
 * visual-plan-contract.test.mjs - S0 hostile-review regression locks.
 *
 * These tests protect the approved planning boundary before any visual-ledger
 * runtime exists. They intentionally test the protocol, build plan, and golden
 * fixture together so a future worker cannot silently reintroduce a reviewed
 * contradiction while implementing RED/GREEN slices.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(TEST_DIR, '..', '..', '..');
const read = (relativePath) => readFileSync(resolve(ROOT, relativePath), 'utf8');

const PLAN = read('docs/ai-workflow/AI-HANDOFF/SWAN-DESIGN-BRAIN-VISUAL-LEDGER-UPGRADE-PLAN-2026-07-25.md');
const PROTOCOL = read('docs/ai-workflow/design-brain/external-reference-mcp.md');
const README = read('scripts/design-brain/README.md');
const ROUTER = read('.claude/skills/swan-design-router/SKILL.md');
const GOLDEN = read('scripts/design-brain/tests/fixtures/visual-card-golden.svg');
const MDASH = String.fromCodePoint(0x2014);
const ARROW = String.fromCodePoint(0x2192);

test('P/S/D/X separates coarse probing, disabled specs, doctrine, and blocked corpus writes', () => {
  assert.match(PROTOCOL, /## Modes/);
  assert.match(PROTOCOL, /Legacy H\/T\/L letters and Inspect/);
  assert.match(PROTOCOL, /S - Spec[\s\S]*?enabled:false/);
  assert.match(PROTOCOL, /X - Source-corpus[\s\S]*?Blocked by default/);
  assert.match(PROTOCOL, /signed, expiring, revocable/);
  assert.match(README, /enabled:false/);
  assert.match(ROUTER, /P\/S\/D\/X/);
});test('Fable refusal backbone has its own RED 1.5 and GREEN 1.5 micro-slice', () => {
  const redOne = PLAN.indexOf(`### RED 1 ${MDASH} Contract shape`);
  const greenOne = PLAN.indexOf('### GREEN 1');
  const sliceOneFive = PLAN.indexOf(`### S1.5 ${MDASH} Refusal backbone`);
  const redOneFive = PLAN.indexOf('### RED 1.5');
  const greenOneFive = PLAN.indexOf('### GREEN 1.5');
  const redTwo = PLAN.indexOf('### RED 2');
  assert.ok(redOne >= 0 && redOne < greenOne);
  assert.ok(greenOne < sliceOneFive && sliceOneFive < redOneFive);
  assert.ok(redOneFive < greenOneFive && greenOneFive < redTwo);
  const redOneBlock = PLAN.slice(redOne, greenOne);
  const redOneFiveBlock = PLAN.slice(redOneFive, greenOneFive);
  assert.doesNotMatch(redOneBlock, /normalized-key|payload bounds|PII-pattern|lexicon gate/i);
  assert.match(redOneFiveBlock, /normalized-key/);
  assert.match(redOneFiveBlock, /payload/);
  assert.match(redOneFiveBlock, /PII/);
  assert.match(redOneFiveBlock, /lexicon/);
});

test('the exact forbidden credential construction is pinned without spelling it in source', () => {
  const forbiddenCredential = ['NASM', 'certified'].join('-');
  assert.equal(PLAN.includes(forbiddenCredential), false);
  assert.match(PLAN, /`NASM` \+ `-certified`/);
});

test('raw colors in rendered SVG are restricted to the canonical token allowlist', () => {
  assert.match(PLAN, /sole raw-color source for renderer source modules/i);
  assert.match(PLAN, /generated and fixture SVGs may contain only allowlisted token values/i);
  const allowed = new Set([
    '#002060', '#003080', '#0A0A0F', '#141419', '#1A1A24',
    '#4070C0', '#60C0F0', '#8B5CF6', '#E0ECF4', '#E5484D',
  ]);
  const actual = new Set(GOLDEN.match(/#[0-9A-Fa-f]{6}/g) ?? []);
  assert.deepEqual([...actual].filter((value) => !allowed.has(value)), []);
  assert.ok(actual.has('#E5484D'), 'golden fixture must include the canonical danger accent');
});

test('the ERROR cell uses danger semantics rather than the purple glow accent', () => {
  const errorCell = GOLDEN.match(/<g id="state-error">([\s\S]*?)<\/g>/)?.[1] ?? '';
  assert.match(errorCell, /#E5484D/);
  assert.doesNotMatch(errorCell, /#8B5CF6/);
});

test('mobile consumption never relies on reading a scaled-down evidence card', () => {
  assert.match(GOLDEN, /^<svg[^>]*\bwidth="100vw"/);
  assert.match(GOLDEN, /^<svg[^>]*\bheight="75vw"/);
  assert.doesNotMatch(GOLDEN, /^<svg[^>]*\bheight="\d+(?:\.\d+)?"/);
  assert.match(PLAN, /not legible evidence below 960 CSS pixels/i);
  assert.match(PLAN, /text summary/i);
  assert.match(PLAN, /open full-size card/i);
});

test('renderer input and readiness ordering are deterministic', () => {
  assert.match(PLAN, /\^\(agent\|role\):\[a-z0-9\]/);
  assert.match(PLAN, /responsive[^\n]*\{ width, behavior \}/);
  assert.ok(PLAN.includes(['DEFAULT', 'LOADING', 'EMPTY', 'SUCCESS', 'ERROR'].join(` ${ARROW} `)));
  assert.match(PLAN, /newest appended trial receipt controls readiness/i);
  assert.match(PLAN, /newer mixed, fail, revise, or reject receipt/i);
  assert.match(PLAN, /agents may not infer or author Sean's verdict/i);
});
