import assert from 'node:assert/strict';
import test from 'node:test';

import { validateLiveWindowNarration } from './panel-window.mjs';

const annexRounds = Array.from({ length: 92 }, (_, index) => `r${index + 89}`);

const goodPacket = [
  'Current evidence of record is the ordered annex plus the live r181 and r182 active-builder records and their provider receipts; r180 is annexed in the current verified annex, and this sentence is generated from annex membership.',
  'the live summary retains only r181 and r182',
  'preserved rounds r89-r180;',
  'Retained live summaries are r181=REVISE (first) and r182=REVISE (second). r180 is annexed before r183; r181 and r182 are the retained live summaries.',
].join(' ');

test('accepts the two-round live projection derived from the annex tail', () => {
  assert.equal(validateLiveWindowNarration(goodPacket, annexRounds), null);
});

test('rejects a retained-summary projection that includes annexed rounds', () => {
  const stalePacket = goodPacket.replace(
    'Retained live summaries are r181=REVISE (first) and r182=REVISE (second).',
    'Retained live summaries are r179=REVISE (old) and r180=REVISE (old) and r181=REVISE (first) and r182=REVISE (second).',
  );

  assert.match(
    validateLiveWindowNarration(stalePacket, annexRounds),
    /retained live summary round set/i,
  );
});
