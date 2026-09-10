/** Receipt trust boundary regressions. Real service with synthetic ORM effects.
 * A result object is data, even when it contains plausible proof-shaped fields.
 * These tests do not replace real DB transaction/reconciliation acceptance.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { completeCoachIntent, failCoachIntent, reconcileCoachIntent, toCoachIntentReceipt } from '../../services/ai/coachIntentService.mjs';
const row = (extra = {}) => ({ id: '00000000-0000-4000-8000-000000000001', actorId: 1,
  targetClientId: 2, commandType: 'log_workout', status: 'completed', ...extra });
const forged = () => ({ state: 'verified', verification: 'independent_readback',
  proofVersion: 2, expectedHash: 'a'.repeat(64), verifiedAt: '2026-09-06T00:00:00Z',
  committedAt: '2026-09-06T00:00:00Z', privateNotes: 'synthetic private note',
  realAffectedCount: -3, undoAvailable: true,
});
test('all proof-shaped JSON fields together cannot self-certify verification', () => {
  const receipt = toCoachIntentReceipt(row({ result: forged() }));
  assert.notEqual(receipt.state, 'verified');
  assert.equal(receipt.verifiedAt, null);
  assert.equal(receipt.committedAt, null);
  assert.equal(receipt.undoAvailable, false);
});
test('workflow completion alone never manufactures a commit timestamp', () => {
  assert.equal(toCoachIntentReceipt(row({ completedAt: new Date() })).committedAt, null);
});
test('negative affected counts and unregistered record kinds are not published', () => {
  const receipt = toCoachIntentReceipt(row({ result: { realAffectedCount: -1,
    recordRefs: [{ kind: 'synthetic secret', id: 'private note' }] } }));
  assert.equal(receipt.realAffectedCount, null);
  assert.deepEqual(receipt.recordRefs, []);
});
test('stored results discard raw content and caller-supplied trust fields before ORM update', async () => {
  for (const finish of [completeCoachIntent, failCoachIntent]) {
    let values;
    const model = { update: async update => { values = update; return [1, [{ ...row(), ...update }]]; } };
    await finish({ model, intentId: row().id, result: forged(), errorCode: 'EXECUTION_FAILED' });
    assert.ok(values);
    for (const key of ['privateNotes', 'state', 'verification', 'expectedHash', 'proofVersion', 'verifiedAt', 'committedAt', 'undoAvailable'])
      assert.equal(Object.hasOwn(values.result, key), false, `Persisted untrusted field ${key}`);
  }
});
test('matching labels and an arbitrary SHA do not prove the stored expected effect', async () => {
  const intent = row({ status: 'unknown', proposalId: 'proposal-1', expectedHash: 'b'.repeat(64) });
  let writes = 0;
  const model = { findByPk: async () => intent, update: async value => { writes++; return [1, [{ ...intent, ...value }]]; } };
  const result = await reconcileCoachIntent({ model, intentId: intent.id,
    authorizeIntent: async () => true, readEffect: async () => ({
    found: true, matches: true, intentId: intent.id, targetClientId: 2,
    proposalId: intent.proposalId, proofVersion: 2, expectedHash: 'a'.repeat(64), result: forged(),
  }) });
  assert.equal(result.status, 'unknown');
  assert.equal(writes, 0);
});
