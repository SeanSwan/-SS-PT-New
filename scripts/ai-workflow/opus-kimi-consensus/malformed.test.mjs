/** Malformed model output must fail closed with evidence preserved. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { REQUIRED_PACKET_SECTIONS } from './constants.mjs';
import { runConsensusDebate } from './protocol.mjs';

const packet = [
  ...REQUIRED_PACKET_SECTIONS.map((name) => `## ${name}\nBinding detail.`),
  '```mermaid\nflowchart LR\nA --> B\n```',
  '```text\n| wireframe |\n```',
].join('\n\n');
const valid = `<<<CONSENSUS_JSON>>>${JSON.stringify({ status: 'revise', consensus_contract: packet, open_issues: ['gap'] })}<<<END_CONSENSUS_JSON>>>`;

test('malformed second-brain envelope returns protocol_error and preserves raw turn', async () => {
  let calls = 0;
  const result = await runConsensusDebate({
    task: 'Review this',
    swanContext: 'doctrine',
    callBrain: async () => (++calls === 1 ? valid : 'malformed Kimi response'),
  });
  assert.equal(result.status, 'protocol_error');
  assert.equal(result.turns.length, 2);
  assert.equal(result.turns[1].raw, 'malformed Kimi response');
  assert.equal(result.builderPacket, null);
  assert.match(result.error, /CONSENSUS_JSON/);
});
