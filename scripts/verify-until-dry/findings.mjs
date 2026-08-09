/**
 * @file findings.mjs
 * @description Evidence-bound lifecycle for hostile-review findings.
 */
const SEVERITIES = new Set(['critical', 'high', 'medium', 'low']);
const DISPOSITIONS = new Set(['FIXED', 'NONREPRODUCIBLE', 'OWNER_EXEMPTION']);
const HASH = /^[a-f0-9]{64}$/;

function assertHash(value, label) {
  if (!HASH.test(String(value ?? ''))) throw new Error(`${label} must be a SHA-256 hash`);
}

function independentActor(finding, actor) {
  return actor && actor !== 'builder' && actor !== finding.author;
}

export function createFinding({ id, author, severity, claim }) {
  if (!id || !author || !claim) throw new Error('Finding id, author, and claim are required');
  if (!SEVERITIES.has(severity)) throw new Error(`Unknown finding severity: ${severity}`);
  return Object.freeze({ id, author, severity, claim, status: 'PROPOSED', history: Object.freeze([]) });
}

export function transitionFinding(finding, transition) {
  if (!finding || !transition?.action) throw new Error('Finding transition is required');
  if (transition.action === 'validate') {
    if (finding.status !== 'PROPOSED') throw new Error('Only proposed findings can be validated');
    if (!independentActor(finding, transition.actor)) throw new Error('Finding validation requires an independent reviewer');
    assertHash(transition.evidenceHash, 'Validation evidence hash');
    return Object.freeze({
      ...finding,
      status: 'VALIDATED',
      validation: Object.freeze({ actor: transition.actor, evidenceHash: transition.evidenceHash }),
      history: Object.freeze([...finding.history, Object.freeze({ action: 'validate', ...transition })]),
    });
  }

  if (transition.action === 'close') {
    if (finding.status !== 'VALIDATED') throw new Error('Only validated findings can be closed');
    if (!independentActor(finding, transition.actor)) throw new Error('Finding closure requires an independent reviewer');
    if (!DISPOSITIONS.has(transition.disposition)) throw new Error('Finding closure disposition is invalid');
    assertHash(transition.evidenceHash, 'Closure evidence hash');
    if (transition.disposition === 'OWNER_EXEMPTION') {
      assertHash(transition.ownerApprovalHash, 'Owner approval hash');
    }
    return Object.freeze({
      ...finding,
      status: 'CLOSED',
      disposition: transition.disposition,
      closure: Object.freeze({
        actor: transition.actor,
        evidenceHash: transition.evidenceHash,
        ownerApprovalHash: transition.ownerApprovalHash ?? null,
      }),
      history: Object.freeze([...finding.history, Object.freeze({ action: 'close', ...transition })]),
    });
  }
  throw new Error(`Unknown finding transition: ${transition.action}`);
}
