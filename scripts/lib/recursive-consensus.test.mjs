/**
 * Tests for the bounded recursive consensus loop.
 * Run: node --test scripts/lib/recursive-consensus.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { runRecursiveConsensus } from './recursive-consensus.mjs';

const modelA = { name: 'A', model: 'model-a', provider: 'test', role: 'Proposer' };
const modelB = { name: 'B', model: 'model-b', provider: 'test', role: 'Reviewer' };

test('runRecursiveConsensus: one bounded cycle permits two turns plus one tie-break', async () => {
  const calls = [];
  const result = await runRecursiveConsensus({
    topic: 'bounded review',
    modelA,
    modelB,
    finalAuthority: 'A',
    initialPrompt: 'Review the packet.',
    maxRounds: 1,
    callModel: async (_provider, model, prompt) => {
      calls.push({ model, prompt });
      return { text: 'DISAGREE', inputTokens: 1, outputTokens: 1 };
    },
  });

  assert.equal(result.consensusReached, false);
  assert.equal(calls.length, 3);
  assert.deepEqual(calls.map((call) => call.model), ['model-a', 'model-b', 'model-a']);
  assert.match(calls.at(-1).prompt, /gone 1 rounds/);
});

test('runRecursiveConsensus: rejects an unsafe or malformed round ceiling', async () => {
  await assert.rejects(
    runRecursiveConsensus({
      topic: 'invalid bound',
      modelA,
      modelB,
      finalAuthority: 'A',
      initialPrompt: 'Review the packet.',
      maxRounds: 0,
      callModel: async () => ({ text: 'DISAGREE', inputTokens: 1, outputTokens: 1 }),
    }),
    /maxRounds must be an integer between 1 and 25/,
  );
});

test('runRecursiveConsensus: single-pass mode calls each debate seat exactly once', async () => {
  const calls = [];
  const result = await runRecursiveConsensus({
    topic: 'single-pass review',
    modelA,
    modelB,
    finalAuthority: 'A',
    initialPrompt: 'Review the packet.',
    singlePass: true,
    callModel: async (_provider, model) => {
      calls.push(model);
      return { text: `${model} review`, inputTokens: 1, outputTokens: 1 };
    },
  });

  assert.deepEqual(calls, ['model-a', 'model-b']);
  assert.equal(result.rounds.length, 2);
  assert.match(result.finalVerdict, /model-a review/);
  assert.match(result.finalVerdict, /model-b review/);
});
