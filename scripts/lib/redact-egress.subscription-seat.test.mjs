import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertNotResoldSubscriptionSeat, fetchForEgress } from './redact-egress.mjs';

const OR = 'https://openrouter.ai/api/v1/chat/completions';
const ZAI = 'https://api.z.ai/api/paas/v4/chat/completions';

test('refuses a z-ai model routed through OpenRouter', () => {
  assert.throws(
    () => assertNotResoldSubscriptionSeat(OR, JSON.stringify({ model: 'z-ai/glm-5.3-flash' })),
    /REFUSED.*consult-glm\.mjs/s
  );
  assert.throws(
    () => assertNotResoldSubscriptionSeat(OR, JSON.stringify({ model: 'z-ai/glm-5.3' })),
    /REFUSED/
  );
});

test('case does not let a z-ai model slip past', () => {
  assert.throws(
    () => assertNotResoldSubscriptionSeat(OR, JSON.stringify({ model: 'Z-AI/GLM-5.3-Flash' })),
    /REFUSED/
  );
});

test('allows every other seat through OpenRouter', () => {
  for (const model of ['x-ai/grok-4.6', 'moonshotai/kimi-k3', 'anthropic/claude-fable-5', 'openai/gpt-5.6-sol']) {
    assert.doesNotThrow(() => assertNotResoldSubscriptionSeat(OR, JSON.stringify({ model })));
  }
});

test('allows glm direct to Z.ai — the whole point is that this path stays open', () => {
  assert.doesNotThrow(() => assertNotResoldSubscriptionSeat(ZAI, JSON.stringify({ model: 'glm-5.3-flash' })));
  assert.doesNotThrow(() => assertNotResoldSubscriptionSeat(ZAI, JSON.stringify({ model: 'glm-5.3' })));
});

test('a malformed or model-less body is not turned into a crash', () => {
  assert.doesNotThrow(() => assertNotResoldSubscriptionSeat(OR, 'not json'));
  assert.doesNotThrow(() => assertNotResoldSubscriptionSeat(OR, JSON.stringify({ messages: [] })));
  assert.doesNotThrow(() => assertNotResoldSubscriptionSeat('not a url', JSON.stringify({ model: 'z-ai/glm-5.3' })));
});

test('the guard actually fires from fetchForEgress, not just when called directly', async () => {
  let called = false;
  await assert.rejects(
    () => fetchForEgress(OR, { body: JSON.stringify({ model: 'z-ai/glm-5.3-flash' }) }, {
      quiet: true,
      fetchImpl: async () => { called = true; return new Response('{}'); }
    }),
    /REFUSED/
  );
  assert.equal(called, false, 'the request must never reach the network');
});
