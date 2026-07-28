/** Fail-closed debate behavior. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { REQUIRED_PACKET_SECTIONS } from './constants.mjs';
import { runConsensusDebate } from './protocol.mjs';

const packet = [
  '# Packet',
  ...REQUIRED_PACKET_SECTIONS.map((name) => `## ${name}\nBinding detail.`),
  '```mermaid\nflowchart LR\nA --> B\n```',
  '```text\n| wireframe |\n```',
].join('\n\n');

const revision = `<<<CONSENSUS_JSON>>>${JSON.stringify({
  status: 'revise', consensus_contract: packet, open_issues: ['one gap'],
})}<<<END_CONSENSUS_JSON>>>`;

test('spend cap stops without throwing and preserves completed turns', async () => {
  let calls = 0;
  const result = await runConsensusDebate({
    task: 'Review this',
    swanContext: 'doctrine',
    callBrain: async () => {
      calls += 1;
      if (calls === 2) throw new Error('spend cap $3.00 blocks kimi');
      return revision;
    },
  });
  assert.equal(result.status, 'spend_cap');
  assert.equal(result.turns.length, 1);
  assert.equal(result.builderPacket, null);
  assert.match(result.error, /spend cap/);
});
