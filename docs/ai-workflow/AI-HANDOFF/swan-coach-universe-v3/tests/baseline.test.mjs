/** SCU audit baseline: dependency-free calls to existing runtime functions.
 * No app boot, DB, network, provider call, .env load, or production writes.
 * This is bounded behavior evidence, not complete approval-lane verification.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const packet = fileURLToPath(new URL('../', import.meta.url));
const runtime = (p) => import(new URL(p, new URL('../../../../../', import.meta.url)));
process.env.OPERATION_SIGNING_KEY = 'synthetic-planning-test-key-not-for-deployment-20260904';
const signing = await runtime('backend/services/ai/operationSigning.mjs');
const digest = await runtime('backend/services/ai/renderDigest.mjs');
const { resolveVoiceConfirmationTier: tier } = await runtime('backend/services/ai/voiceConfirmationTier.mjs');
const op = {
  id: 'synthetic-operation', type: 'DELETE', commandType: 'delete_post',
  endpoint: '/synthetic', params: { postId: 9301 }, createdBy: 9101,
  description: 'Synthetic preview', requiresPhysicalConfirm: true,
  clientId: 9201, expiresAt: '2030-01-01T00:00:00.000Z',
  affectedRecords: [{ id: 9301 }], affectedCount: 1,
};
test('B01 destructive expiry is signature-bound', () => {
  const signed = { ...op, signature: signing.signOperation(op) };
  assert.equal(signing.verifySignature(signed), true);
  assert.equal(signing.verifySignature({ ...signed, expiresAt: '2031-01-01T00:00:00.000Z' }), false);
});
test('B02 non-destructive expiry is signature-bound', () => {
  const pending = { ...op, kind: 'pending_confirmed' };
  assert.notEqual(signing.signPendingConfirmation(pending),
    signing.signPendingConfirmation({ ...pending, expiresAt: '2031-01-01T00:00:00.000Z' }));
});
test('B03 changed target or preview changes signature', () => {
  assert.notEqual(signing.signOperation(op), signing.signOperation({ ...op, clientId: 9202 }));
  assert.notEqual(signing.signOperation(op), signing.signOperation({ ...op, description: 'Different act' }));
});
test('B04 digest preserves JSON wire parity for undefined properties', () => {
  const source = { ...op, params: { postId: 9301, optional: undefined } };
  assert.equal(digest.renderDigestOf(source), digest.renderDigestOf(JSON.parse(JSON.stringify(source))));
  assert.notEqual(digest.renderDigestOf(source), digest.renderDigestOf({ ...op, clientId: 9202 }));
});
test('B05 malformed digest is rejected', () => {
  const good = digest.renderDigestOf(op);
  assert.equal(digest.digestMatches(good, good), true);
  for (const bad of ['', 'z'.repeat(64), good.slice(1), null]) {
    assert.equal(digest.digestMatches(good, bad), false);
  }
});
const command = { type: 'cancel_session', destructive: true, roleRequired: ['admin', 'trainer'] };
const context = { actorRole: 'trainer', lockedClientId: 9201, targetClientId: 9202 };
test('B06 voice and unknown crossing require physical confirmation', () => {
  assert.equal(tier(command, {}, { ...context, inputMode: 'voice' }).physical, true);
  assert.equal(tier(command, {}, { ...context, inputMode: null }).physical, true);
});
test('B07 typed crossing differs from voice at the existing tier seam', () => {
  assert.equal(tier(command, {}, { ...context, inputMode: 'text' }).physical, false);
});
test('B08 unauthorized role is refused, not negotiable confirmation', () => {
  assert.equal(tier(command, {}, { ...context, actorRole: 'client' }).tier, 'refusal');
});
test('D01 every packet Markdown document stays within 300 lines', () => {
  for (const f of readdirSync(packet).filter((p) => p.endsWith('.md'))) {
    assert.ok(readFileSync(path.join(packet, f), 'utf8').split('\n').length <= 300, f);
  }
});
test('D02 requirement IDs have a traceability row', () => {
  const blueprint = readFileSync(path.join(packet, '02-blueprint.md'), 'utf8');
  const matrix = readFileSync(path.join(packet, '07-tests.md'), 'utf8');
  const requirements = [...new Set(blueprint.match(/R\d{2}/g))];
  assert.equal(requirements.length, 13);
  for (const id of requirements) assert.ok(matrix.includes(`| ${id} |`), id);
});
test('D03 all 48 acceptance IDs and 12 build cards are documented', () => {
  const matrix = readFileSync(path.join(packet, '07-tests.md'), 'utf8');
  for (let i = 1; i <= 48; i++) assert.ok(matrix.includes(`| T${String(i).padStart(2, '0')} |`));
  const cards = ['08-foundation-cards.md', '09-experience-cards.md']
    .map((p) => readFileSync(path.join(packet, p), 'utf8')).join('\n');
  for (let i = 0; i <= 11; i++) assert.ok(cards.includes(`## S${i} —`));
});
test('D04 source baseline and no-build boundary are explicit', () => {
  const index = readFileSync(path.join(packet, 'README.md'), 'utf8');
  assert.ok(index.includes('bfc7a789869384e48116c5f0f091913865fdc575'));
  assert.ok(index.includes('implementation_authorized: false'));
  assert.ok(root.endsWith(path.sep));
});
