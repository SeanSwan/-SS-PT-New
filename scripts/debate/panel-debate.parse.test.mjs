import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./panel-debate.mjs', import.meta.url), 'utf8');
const match = source.match(/function parseVerdict\(text\) \{[\s\S]*?\n\}\n\nconst seatOutPath/u);

test('parses a complete reviewer verdict without throwing', () => {
  assert.ok(match, 'parseVerdict function must remain locatable');
  const parseVerdict = new Function(`${match[0].replace(/\n\nconst seatOutPath$/u, '')}; return parseVerdict;`)();
  const input = [
    '=== VERDICT ===',
    'status: CONSENSUS',
    'confidence: 89',
    'findings: F1=MAJOR: packet evidence is incomplete',
    'rebuttals: (none)',
    'open: Q1=add source excerpts',
    'consensus_block: Add the missing evidence appendix.',
    '=== END-VERDICT ===',
  ].join('\n');
  const verdict = parseVerdict(input);

  assert.equal(verdict.status, 'CONSENSUS');
  assert.equal(verdict.confidence, 89);
  assert.deepEqual(verdict.findings, ['F1=MAJOR: packet evidence is incomplete']);
  assert.equal(verdict.block, 'Add the missing evidence appendix.');
});

test('bounds a silent seat so quorum can resolve a round', () => {
  assert.match(source, /--seat-timeout-sec/u);
  assert.match(source, /seatTimeoutMs/u);
  assert.doesNotMatch(source, /hung >1800s/u);
});

test('derives the debate subject from the packet instead of hard-coding another artifact', () => {
  assert.match(source, /const packetTitle = packet\.match\(\/\^#\\s\+\(\.\+\)\$\/mu\)/u);
  assert.doesNotMatch(source, /shadow-database seeder code packet/u);
  assert.match(source, /packaged SS-PT subject titled/u);
});

test('isolates output state and rejects stale state from a different packet', () => {
  assert.match(source, /arg\('--out-dir', dirname\(packetPath\)\)/u);
  assert.match(source, /packetFingerprint/u);
  assert.match(source, /state\.packetFingerprint !== packetFingerprint/u);
});
