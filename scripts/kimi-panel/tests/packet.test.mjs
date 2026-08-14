/**
 * Outbound packet boundary tests for the Kimi/HY3 design-ceiling panel.
 * Run: node --test scripts/kimi-panel/tests/packet.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { preparePacket } from '../packet.mjs';

test('packet preparation redacts inline PII and secrets before hashing or egress', () => {
  const root = mkdtempSync(join(tmpdir(), 'kimi-panel-'));
  const path = join(root, 'visualizer-review.md');
  const fake = ['sk-', 'or-v1-', 'abcdefghijklmnopqrstuvwxyz0123'].join('');
  writeFileSync(path, `Contact person@example.com\nkey=${fake}\nvisual review`);
  const packet = preparePacket({ root, documentPath: path });
  assert.ok(!packet.text.includes('person@example.com'));
  assert.ok(!packet.text.includes(fake));
  assert.ok(packet.redactions >= 2);
  assert.match(packet.sha256, /^[a-f0-9]{64}$/);
});

test('design panel refuses sensitive or secret-bearing document paths', () => {
  const root = mkdtempSync(join(tmpdir(), 'kimi-panel-'));
  for (const name of ['auth-review.md', '.env']) {
    const path = join(root, name);
    writeFileSync(path, 'not read');
    assert.throws(() => preparePacket({ root, documentPath: path }), /refused|sensitive/i);
  }
});
