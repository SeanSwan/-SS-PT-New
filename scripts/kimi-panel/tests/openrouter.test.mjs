/**
 * OpenRouter boundary tests: single attempt, provider price ceiling, privacy routing, usage cost.
 * Run: node --test scripts/kimi-panel/tests/openrouter.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { callOpenRouter } from '../openrouter.mjs';

const seat = {
  id: 'test-seat', model: 'lab/model', title: 'Test seat', stage: 'fanout',
  priceInPerM: 1, priceOutPerM: 2, outputTokens: 1000,
  temperature: 0.2, timeoutMs: 1000, supportsEffort: false, supportsJson: true,
};

test('one HTTP failure is returned without a paid retry', async () => {
  let calls = 0;
  await assert.rejects(() => callOpenRouter({
    seat, prompt: 'packet', maxTokens: 1000, env: { OPENROUTER_API_KEY: 'test-key' },
    fetchImpl: async () => { calls += 1; return { ok: false, status: 503, text: async () => 'down' }; },
  }), /503/);
  assert.equal(calls, 1);
});

test('request pins no fallback, deny-data routing, and a server-enforced max price', async () => {
  let body;
  let headers;
  const result = await callOpenRouter({
    seat, prompt: 'packet', maxTokens: 1000, env: { OPENROUTER_API_KEY: 'test-key' },
    fetchImpl: async (_url, init) => {
      headers = init.headers;
      body = JSON.parse(init.body);
      return { ok: true, json: async () => ({
        choices: [{ finish_reason: 'stop', message: { content: '{"findings":[]}' } }],
        usage: { prompt_tokens: 10, completion_tokens: 20, cost: 0.0042 },
      }) };
    },
  });
  assert.deepEqual(body.provider.max_price, { prompt: 1, completion: 2, request: 0 });
  assert.equal(body.provider.allow_fallbacks, false);
  assert.equal(body.provider.data_collection, 'deny');
  assert.equal(body.provider.require_parameters, true);
  assert.deepEqual(body.response_format, { type: 'json_object' });
  assert.equal(body.max_tokens, 1000);
  assert.equal(headers['HTTP-Referer'], undefined, 'product-neutral runtime leaked a product URL');
  assert.equal(headers['X-Title'], 'Kimi Panel Runtime');
  assert.equal(result.cost, 0.0042, 'OpenRouter usage.cost is authoritative');
});

test('a prompt-constrained model omits unsupported structured-output routing', async () => {
  let body;
  await callOpenRouter({
    seat: { ...seat, supportsJson: false }, prompt: 'packet', maxTokens: 1000,
    env: { OPENROUTER_API_KEY: 'test-key' },
    fetchImpl: async (_url, init) => {
      body = JSON.parse(init.body);
      return { ok: true, json: async () => ({
        choices: [{ finish_reason: 'stop', message: { content: '{"findings":[]}' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, cost: 0.0001 },
      }) };
    },
  });
  assert.equal(body.response_format, undefined);
  assert.equal(body.provider.require_parameters, undefined);
  assert.equal(body.provider.data_collection, 'deny');
});

test('missing API key fails before fetch', async () => {
  let calls = 0;
  await assert.rejects(() => callOpenRouter({
    seat, prompt: 'packet', maxTokens: 1000, env: {},
    fetchImpl: async () => { calls += 1; },
  }), /API key/i);
  assert.equal(calls, 0);
});
