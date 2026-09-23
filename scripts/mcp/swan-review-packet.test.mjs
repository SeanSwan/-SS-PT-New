import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  PACKET_SCHEMA,
  canonicalJson,
  createReportEnvelope,
  createReviewPacket,
  sha256,
  validateReviewPacket,
  writeImmutablePacket,
} from './swan-review-packet.mjs';

test('review packet is deterministic for fixed timestamp and prompt', () => {
  const packet = createReviewPacket({
    root: 'C:\\repo', scope: { files: ['src/a.mjs'], diff: 'HEAD' }, prompt: 'review this',
    createdAt: '2026-09-12T12:34:56.789Z',
  });
  assert.equal(packet.schema, PACKET_SCHEMA);
  assert.equal(packet.packetId, 'swan-review-20260912123456789-cbac330eea07');
  assert.equal(packet.policy.meteredFallback, false);
  assert.equal(packet.input.promptSha256, sha256('review this'));
  assert.equal(validateReviewPacket(packet).valid, true);
});

test('writeImmutablePacket is idempotent and refuses different content', () => {
  const dir = mkdtempSync(join(tmpdir(), 'swan-review-packet-'));
  try {
    const packet = createReviewPacket({ prompt: 'review', createdAt: '2026-09-12T12:34:56.789Z' });
    const first = writeImmutablePacket(dir, packet);
    const second = writeImmutablePacket(dir, packet);
    assert.equal(first.path, second.path);
    assert.equal(readFileSync(first.path, 'utf8'), canonicalJson(packet));
    assert.throws(() => writeImmutablePacket(dir, { ...packet, status: 'complete' }), /immutable review packet collision/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('invalid packet policy is rejected and report envelope preserves null usage', () => {
  const packet = createReviewPacket({ prompt: 'review' });
  const invalid = { ...packet, policy: { ...packet.policy, meteredFallback: true } };
  assert.equal(validateReviewPacket(invalid).valid, false);
  const report = createReportEnvelope({ packetId: packet.packetId, provider: 'openai-codex', billing: 'chatgpt-subscription', text: 'done' });
  assert.equal(report.usage.inputTokens, null);
  assert.equal(report.usage.outputTokens, null);
  assert.equal(report.contentSha256, sha256('done'));
});
