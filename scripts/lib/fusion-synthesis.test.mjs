/**
 * Tests for the Fusion Synthesis Judge module.
 * Run: node --test scripts/lib/fusion-synthesis.test.mjs
 *
 * Uses the Node built-in test runner — no vitest/jest dependency, so it runs in
 * the bare scripts environment exactly like the orchestrator does.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSynthesisPrompt,
  parseSynthesisSections,
  runFusionSynthesis,
  formatSynthesisMarkdown,
  MIN_PANEL,
} from './fusion-synthesis.mjs';

const ANALYSTS = [
  { name: 'Security', model: 'nvidia/nemotron-3-nano', status: 'SUCCESS', text: 'Auth looks solid. Rate-limit the login route.' },
  { name: 'UX', model: 'google/gemini-2.5-flash', status: 'SUCCESS', text: 'The CTA is buried. Promote progress charts above the fold.' },
  { name: 'Perf', model: 'arcee-ai/trinity-large', status: 'SUCCESS', text: 'Lazy-load the chart gallery to cut bundle size.' },
];

// A representative judge response in the exact contract format.
const JUDGE_OUTPUT = `## Consensus Points
All analysts want a leaner, faster first paint.

## Contradictions
None material. Security and Perf do not conflict.

## Partial Coverage
Only UX raised information hierarchy.

## Unique Insights
Perf (Trinity) alone flagged lazy-loading the chart gallery.

## Blind Spots
No analyst addressed offline/empty states for the charts.

## Fused Recommendation
Rate-limit login, promote progress charts above the fold, and lazy-load the gallery.`;

test('buildSynthesisPrompt lists every analyst and forbids participation', () => {
  const prompt = buildSynthesisPrompt({ analysts: ANALYSTS, context: 'SwanStudios', topic: 'Code review' });
  assert.match(prompt, /Analyst 1: Security/);
  assert.match(prompt, /Analyst 2: UX/);
  assert.match(prompt, /Analyst 3: Perf/);
  assert.match(prompt, /NOT a participant/);
  assert.match(prompt, /## Blind Spots/);
  assert.match(prompt, /Code review/);
  assert.match(prompt, /SwanStudios/);
});

test('parseSynthesisSections extracts all six sections', () => {
  const s = parseSynthesisSections(JUDGE_OUTPUT);
  assert.match(s.consensus, /leaner, faster/);
  assert.match(s.contradictions, /None material/);
  assert.match(s.partialCoverage, /information hierarchy/);
  assert.match(s.uniqueInsights, /lazy-loading the chart gallery/);
  assert.match(s.blindSpots, /offline\/empty states/);
  assert.match(s.fusedRecommendation, /Rate-limit login/);
});

test('parseSynthesisSections returns stable empty shape for junk input', () => {
  const s = parseSynthesisSections('no headings here at all');
  for (const key of ['consensus', 'contradictions', 'partialCoverage', 'uniqueInsights', 'blindSpots', 'fusedRecommendation']) {
    assert.equal(s[key], '');
  }
});

test('runFusionSynthesis returns null when fewer than MIN_PANEL analysts succeed', async () => {
  let called = false;
  const out = await runFusionSynthesis({
    analystResults: [ANALYSTS[0]], // only 1 success
    callModel: async () => { called = true; return { text: 'x' }; },
    judgeModel: 'anthropic/claude-sonnet-4.6',
  });
  assert.equal(out, null);
  assert.equal(called, false, 'judge must not be called when the panel is too small');
  assert.ok(MIN_PANEL >= 2);
});

test('runFusionSynthesis only feeds SUCCESS analysts to the judge', async () => {
  let seenPrompt = '';
  const mixed = [
    ...ANALYSTS,
    { name: 'Broken', model: 'x/y', status: 'ERROR', text: 'Error: timeout' },
    { name: 'Empty', model: 'x/z', status: 'SUCCESS', text: '   ' },
  ];
  const out = await runFusionSynthesis({
    analystResults: mixed,
    callModel: async (_model, prompt) => { seenPrompt = prompt; return { text: JUDGE_OUTPUT, inputTokens: 1000, outputTokens: 500 }; },
    judgeModel: 'anthropic/claude-sonnet-4.6',
    priceInputPerM: 3.0,
    priceOutputPerM: 15.0,
  });
  assert.equal(out.status, 'SUCCESS');
  assert.equal(out.analystCount, 3, 'ERROR + whitespace-only analysts must be excluded');
  assert.doesNotMatch(seenPrompt, /Broken/);
  assert.doesNotMatch(seenPrompt, /Error: timeout/);
  // cost = 1000/1e6*3 + 500/1e6*15 = 0.003 + 0.0075 = 0.0105
  assert.ok(Math.abs(out.costUSD - 0.0105) < 1e-9);
  assert.match(out.sections.uniqueInsights, /lazy-loading/);
});

test('runFusionSynthesis returns an ERROR result (does not throw) when the judge call fails', async () => {
  const out = await runFusionSynthesis({
    analystResults: ANALYSTS,
    callModel: async () => { throw new Error('OpenRouter 429: rate limited'); },
    judgeModel: 'anthropic/claude-sonnet-4.6',
  });
  assert.equal(out.status, 'ERROR');
  assert.match(out.text, /rate limited/);
  assert.equal(out.costUSD, 0);
});

test('runFusionSynthesis fail-closes on a disallowed (Chinese-provider) judge model', async () => {
  await assert.rejects(
    () => runFusionSynthesis({
      analystResults: ANALYSTS,
      callModel: async () => ({ text: 'x' }),
      judgeModel: 'deepseek/deepseek-v3.2',
    }),
    /disallowed provider/,
  );
});

test('runFusionSynthesis requires a judge model and a callModel', async () => {
  await assert.rejects(
    () => runFusionSynthesis({ analystResults: ANALYSTS, callModel: async () => ({}), judgeModel: '' }),
    /judgeModel is required/,
  );
  await assert.rejects(
    () => runFusionSynthesis({ analystResults: ANALYSTS, callModel: null, judgeModel: 'anthropic/claude-sonnet-4.6' }),
    /callModel must be a function/,
  );
});

test('formatSynthesisMarkdown wraps a SUCCESS result and degrades gracefully', () => {
  const md = formatSynthesisMarkdown({
    status: 'SUCCESS', judgeModel: 'anthropic/claude-sonnet-4.6', analystCount: 3, text: JUDGE_OUTPUT,
  });
  assert.match(md, /# Fusion Synthesis — Judge Verdict/);
  assert.match(md, /all 3 parallel analyst outputs/);
  assert.match(md, /Fused Recommendation/);

  const none = formatSynthesisMarkdown(null);
  assert.match(none, /did not produce a result/);
});
