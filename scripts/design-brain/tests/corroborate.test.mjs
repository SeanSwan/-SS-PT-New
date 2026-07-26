/** Corroboration is fail-closed until signed monotonic lifecycle authority exists. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCorroboration, corroborateBatch } from '../src/corroborate.mjs';
import { confidenceFor } from '../src/validate.mjs';
const claim = (status, over = {}) => ({ claimId: status === 'accepted' ? 'CLM-accepted' : 'CLM-proposed', domainId: 'D01', principle: 'Keep the primary action beside the evidence it advances', workflowPhase: 'progress', userRole: 'client', products: status === 'accepted' ? ['A'] : ['B'], receiptRefs: status === 'accepted' ? ['RCP-a'] : ['RCP-b'], exceptions: [], contradictions: [], swanTranslation: {}, confidence: confidenceFor(status === 'accepted' ? ['A'] : ['B']), singleSource: true, status, createdUtc: '2026-07-26T00:00:00Z', ...over });
test('direct lifecycle mutation is disabled', () => assert.throws(() => applyCorroboration(), (error) => error.code === 'E_CORROBORATION_DISABLED'));
test('automatic lexical match emits a blocked audit event and no claim append', () => {
  const result = corroborateBatch({ proposed: [claim('proposed')], accepted: [claim('accepted')], pendingProposed: [], receiptsById: new Map([['RCP-b', { receiptId: 'RCP-b', domainId: 'D01' }]]), tuning: { auto: { S: 0, O: 0, margin: 0, minTokens: 0 }, mergeBand: { low: 0 }, weights: { jaccard: 1, overlap: 0, trigram: 0 }, stopwords: new Set() }, negationCues: [], runId: 'RUN-disabled', nowIso: '2026-07-26T00:00:00Z', seenEventIds: new Set() });
  assert.equal(result.claimAppends.length, 0);
  assert.ok(result.events.some((event) => event.kind === 'corroboration-blocked'));
});