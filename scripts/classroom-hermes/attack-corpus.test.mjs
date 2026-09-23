/** Synthetic hostile corpus for the pre-broker egress contract. */
import test from 'node:test';
import assert from 'node:assert/strict';

import { buildHostileCorpus } from './attack-corpus.mjs';
import { validateExternalEnvelope } from './contracts.mjs';

test('all 50 hostile payloads fail closed', () => {
  const corpus = buildHostileCorpus();
  assert.equal(corpus.length, 50);
  const escaped = corpus.filter(({ payload }) => validateExternalEnvelope(payload).ok);
  assert.deepEqual(escaped, []);
});

test('corpus covers every required attack family', () => {
  const families = new Set(buildHostileCorpus().map((entry) => entry.family));
  assert.deepEqual([...families].sort(), [
    'classification-bypass',
    'encoding-and-homoglyph',
    'free-text-smuggling',
    'nested-and-extra-fields',
    'source-and-query-abuse',
  ]);
});

