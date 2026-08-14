/**
 * Contract tests for the product-neutral Kimi Panel roster and zero-call preflight.
 * Run: node --test scripts/kimi-panel/tests/config.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CHEAP_PANEL_MODELS, BLIND_PANEL_SEATS, GEMINI_SEAT, HY3_MODEL, HY3_FALLBACK_SEAT,
  MAX_OUTPUT_TOKENS, buildPreflight, estimateWorstCase,
} from '../config.mjs';
import { sha256 } from '../../context-gateway/src/receiptV1.mjs';

const EXPECTED = [
  'deepseek/deepseek-v4-flash',
  'qwen/qwen3.5-flash-02-23',
  'meta-llama/llama-4-scout',
  'z-ai/glm-4.7-flash',
  'nvidia/nemotron-3-super-120b-a12b',
  'mistralai/mistral-nemo',
  'bytedance-seed/seed-1.6-flash',
  'openai/gpt-oss-20b',
  'tencent/hy3-preview',
];

test('pins one blind reviewer per lab and keeps HY3 in the dedicated design seat', () => {
  assert.deepEqual(CHEAP_PANEL_MODELS.map((seat) => seat.model), EXPECTED);
  assert.equal(new Set(CHEAP_PANEL_MODELS.map((seat) => seat.lab)).size, 9);
  const hy3 = CHEAP_PANEL_MODELS.find((seat) => seat.model === HY3_MODEL);
  assert.equal(hy3.specialty, 'design');
  assert.match(hy3.remit, /visual|interaction|motion/i);
  assert.equal(hy3.supportsJson, false, 'HY3 preview does not advertise structured output');
  assert.equal(hy3.supportsEffort, true);
  assert.ok(hy3.priceInPerM >= 0.063);
  assert.equal(HY3_FALLBACK_SEAT.model, 'tencent/hy3');
  assert.equal(HY3_FALLBACK_SEAT.supportsJson, true);
  assert.ok(HY3_FALLBACK_SEAT.priceInPerM >= 0.132);
  assert.ok(HY3_FALLBACK_SEAT.priceOutPerM >= 0.528);
});

test('privacy-safe paid routes and verified price ceilings do not fail closed below live prices', () => {
  const nemotron = CHEAP_PANEL_MODELS.find((seat) => seat.id === 'nemotron');
  const seed = CHEAP_PANEL_MODELS.find((seat) => seat.id === 'seed');
  const deepseek = CHEAP_PANEL_MODELS.find((seat) => seat.id === 'deepseek');
  assert.doesNotMatch(nemotron.model, /:free$/, 'deny-data routing cannot rely on the free route');
  assert.ok(nemotron.priceInPerM >= 0.085 && nemotron.priceOutPerM >= 0.4);
  assert.ok(seed.priceInPerM >= 0.075 && seed.priceOutPerM >= 0.3);
  assert.ok(deepseek.priceInPerM >= 0.14 && deepseek.priceOutPerM >= 0.28);
  assert.ok(CHEAP_PANEL_MODELS.filter((seat) => seat.id !== 'hy3').every((seat) => seat.supportsJson));
  assert.equal(GEMINI_SEAT.supportsJson, true);
  assert.ok(GEMINI_SEAT.priceInPerM >= 0.375 && GEMINI_SEAT.priceOutPerM >= 1.875);
});

test('Gemini is a separate tenth blind panel member, not a replacement for HY3', () => {
  assert.equal(BLIND_PANEL_SEATS.length, 10);
  assert.ok(BLIND_PANEL_SEATS.includes(GEMINI_SEAT));
  assert.ok(BLIND_PANEL_SEATS.some((seat) => seat.model === HY3_MODEL));
  assert.equal(GEMINI_SEAT.model, 'google/gemini-3.7-flash');
});

test('preflight reserves thirteen logical seats plus one conditional HY3 fallback', () => {
  const packet = '# Visualizer review\nNo private data.';
  const preflight = buildPreflight({ packet, capUsd: 5, maxTokens: MAX_OUTPUT_TOKENS });
  assert.equal(preflight.packetSha256, sha256(packet));
  assert.equal(preflight.logicalSeatCount, 13,
    'Opus first + ten blind panel seats + Kimi adjudication + Opus verification');
  assert.equal(preflight.maxMeteredCallCount, 14,
    'the preview failure path reserves one conditional full-HY3 attempt');
  assert.equal(preflight.opusStageCount, 2);
  assert.equal(preflight.modelCallsExecuted, 0);
  assert.equal(preflight.maxOutputTokens, 60_000);
  assert.equal(preflight.sharedCapUsd, 5);
  assert.equal(preflight.roster.length, 14);
  assert.equal(preflight.roster.filter((entry) => entry.model === 'anthropic/claude-opus-5').length, 2);
  assert.ok(preflight.roster.every((entry) => entry.maxPricePerMillion));
  assert.ok(preflight.totalWorstCaseUsd > 0 && preflight.totalWorstCaseUsd <= 5);
});

test('preflight rejects output ceilings above 60k and non-positive shared caps', () => {
  assert.throws(() => buildPreflight({ packet: 'x', capUsd: 5, maxTokens: 60_001 }), /60,000/);
  assert.throws(() => buildPreflight({ packet: 'x', capUsd: 0, maxTokens: 60_000 }), /cap/i);
});

test('preflight fails closed when the conservative total exceeds the shared cap', () => {
  const p = buildPreflight({ packet: 'bounded packet', capUsd: 0.01, maxTokens: 60_000 });
  assert.equal(p.allowed, false);
  assert.match(p.blockReason, /shared cap/i);
});

test('cost reservation treats each prompt byte as a possible input token', () => {
  const seat = { priceInPerM: 1, priceOutPerM: 0 };
  assert.equal(estimateWorstCase(seat, 1_000_000, 0), 1,
    'the hard-cap estimate must not depend on an optimistic bytes-per-token ratio');
});

test('remaining project budget can reserve the full roster with the bounded 8k run ceiling', () => {
  const preflight = buildPreflight({
    packet: '# Bounded visualizer design review\nOriginal code evidence.',
    capUsd: 2.9973202727,
    maxTokens: 8_000,
  });
  assert.equal(preflight.logicalSeatCount, 13);
  assert.equal(preflight.maxMeteredCallCount, 14);
  assert.equal(preflight.allowed, true);
  assert.ok(preflight.totalWorstCaseUsd <= 2.9973202727);
});
