import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertAstraResellerDoubleArmed, astraResellerGateState, isAstraSubscriptionModel,
  ASTRA_GATE1_ENV, ASTRA_GATE2_ENV,
} from './astra-reseller-gate.mjs';
import { fetchForEgress } from './redact-egress.mjs';

const OR = 'https://openrouter.ai/api/v1/chat/completions';
const ZAI = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const both = { [ASTRA_GATE1_ENV]: '1', [ASTRA_GATE2_ENV]: '1' };
const g1only = { [ASTRA_GATE1_ENV]: '1' };
const body = (model) => JSON.stringify({ model });

test('an unarmed Astra call is stopped at gate 1 and names the free route', () => {
  assert.throws(
    () => assertAstraResellerDoubleArmed(OR, body('openai/gpt-6-astra-pro'), {}),
    /STOP 1 of 2.*consult-astra-subscription\.mjs/s,
  );
});

test('gate 1 alone is NOT enough — the operator is stopped a second time', () => {
  assert.throws(
    () => assertAstraResellerDoubleArmed(OR, body('openai/gpt-6-astra-pro'), g1only),
    /STOP 2 of 2/,
  );
});

test('both gates armed lets the call through', () => {
  assert.doesNotThrow(() => assertAstraResellerDoubleArmed(OR, body('openai/gpt-6-astra-pro'), both));
  assert.doesNotThrow(() => assertAstraResellerDoubleArmed(OR, body('openai/gpt-6-astra'), both));
});

test('gate 2 alone is not enough — order is enforced, not just the count', () => {
  assert.throws(
    () => assertAstraResellerDoubleArmed(OR, body('openai/gpt-6-astra'), { [ASTRA_GATE2_ENV]: '1' }),
    /STOP 1 of 2/,
  );
});

test('only an exact "1" arms a gate — "true", "yes" and "0" do not', () => {
  // Whitespace IS tolerated (the gate trims), so ' 1 ' is deliberately absent
  // from this list: it arms, and asserting otherwise would be a wrong test.
  for (const value of ['true', 'yes', '0', '', 'TRUE', '01', '1 1']) {
    assert.throws(
      () => assertAstraResellerDoubleArmed(OR, body('openai/gpt-6-astra'), { [ASTRA_GATE1_ENV]: value, [ASTRA_GATE2_ENV]: '1' }),
      /STOP 1 of 2/,
      `"${value}" must not arm gate 1`,
    );
  }
  assert.doesNotThrow(
    () => assertAstraResellerDoubleArmed(OR, body('openai/gpt-6-astra'), { [ASTRA_GATE1_ENV]: ' 1 ', [ASTRA_GATE2_ENV]: '1' }),
  );
});

test('case does not let an Astra model slip past the gate', () => {
  assert.throws(
    () => assertAstraResellerDoubleArmed(OR, body('OpenAI/GPT-6-Astra-Pro'), {}),
    /STOP 1 of 2/,
  );
});

test('non-Astra models and non-OpenRouter hosts are untouched', () => {
  assert.doesNotThrow(() => assertAstraResellerDoubleArmed(OR, body('x-ai/grok-4.6'), {}));
  assert.doesNotThrow(() => assertAstraResellerDoubleArmed(OR, body('anthropic/claude-fable-5'), {}));
  assert.doesNotThrow(() => assertAstraResellerDoubleArmed(ZAI, body('glm-5.3'), {}));
  assert.doesNotThrow(() => assertAstraResellerDoubleArmed('not a url', body('openai/gpt-6-astra'), {}));
});

test('a malformed or model-less body is not turned into a crash', () => {
  assert.doesNotThrow(() => assertAstraResellerDoubleArmed(OR, 'not json', {}));
  assert.doesNotThrow(() => assertAstraResellerDoubleArmed(OR, JSON.stringify({ messages: [] }), {}));
  assert.equal(astraResellerGateState(OR, 'not json', {}).applies, false);
});

test('the gate fires from fetchForEgress, not just when called directly', async () => {
  const prev = { ...process.env };
  delete process.env[ASTRA_GATE1_ENV];
  delete process.env[ASTRA_GATE2_ENV];
  let called = false;
  try {
    await assert.rejects(
      () => fetchForEgress(OR, { body: body('openai/gpt-6-astra-pro') }, {
        quiet: true,
        fetchImpl: async () => { called = true; return new Response('{}'); },
      }),
      /STOP 1 of 2/,
    );
    assert.equal(called, false, 'the request must never reach the network');
  } finally {
    Object.assign(process.env, prev);
  }
});

test('isAstraSubscriptionModel only claims the two known Astra seats', () => {
  assert.equal(isAstraSubscriptionModel('openai/gpt-6-astra'), true);
  assert.equal(isAstraSubscriptionModel('openai/gpt-6-astra-pro'), true);
  assert.equal(isAstraSubscriptionModel('openai/gpt-5.6-sol-pro'), false);
  assert.equal(isAstraSubscriptionModel(''), false);
  assert.equal(isAstraSubscriptionModel(null), false);
});
