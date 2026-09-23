/** Hash-bound hostile-review packet builder tests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { buildReviewPacket } from './build-review-packet.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');

test('review packet embeds exact implementation files with SHA-256 receipts', () => {
  const packet = buildReviewPacket(repoRoot);
  assert.equal(packet.fileCount >= 20, true);
  assert.equal(packet.text.includes('BEGIN EXACT FILE: scripts/classroom-hermes/contracts.mjs'), true);
  assert.equal(packet.text.includes('BEGIN EXACT FILE: docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/mac-prep/profile/SOUL.md'), true);
  assert.equal(packet.text.includes('SHA-256:'), true);
  assert.equal(packet.text.includes('CANARY_STUDENT_ALPHA'), true);
  assert.equal(/sk-or-v1-[A-Za-z0-9]{20,}/u.test(packet.text), false);
  assert.equal(/OPENROUTER_API_KEY=[A-Za-z0-9_-]{20,}/u.test(packet.text), false);
});
