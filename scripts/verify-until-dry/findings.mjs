/**
 * @file findings.mjs
 * @description Evidence-bound lifecycle for hostile-review findings.
 */
import { canonicalJson, sha256 } from './ledger.mjs';

const SEVERITIES = new Set(['critical', 'high', 'medium', 'low']);
const DISPOSITIONS = new Set(['FIXED', 'NONREPRODUCIBLE', 'OWNER_EXEMPTION']);
const HASH = /^[a-f0-9]{64}$/;

export function normalizeComparableText(value) {
  return typeof value === 'string'
    ? value.normalize('NFKC')
      .replace(/\u001B(?:\[[0-?]*[ -/]*[@-~]|[@-_])/gu, '')
      .replace(/\s+/gu, ' ')
      .replace(/[\p{Cc}\p{Cf}]/gu, '')
      .trim()
      .toLocaleLowerCase('en-US')
    : '';
}

export function hasUnsafeComparableCharacters(value) {
  return typeof value !== 'string' ||
    /[\p{Cf}\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u.test(value);
}

export function canonicalizeFailureSignature(value) {
  if (typeof value !== 'string' || /[\p{Cc}\p{Cf}]/u.test(value)) return null;
  const normalized = normalizeComparableText(value);
  if (normalized.length < 8 || !/[\p{L}\p{N}]/u.test(normalized)) return null;
  return normalized;
}

export function findingIdentityHash(finding) {
  const failureSignature = canonicalizeFailureSignature(finding?.failureSignature);
  if (!finding?.id || !finding.author || !finding.claim ||
      !SEVERITIES.has(finding.severity) || !failureSignature) return null;
  return sha256(canonicalJson({
    id: finding.id, author: finding.author, severity: finding.severity,
    claim: finding.claim, failureSignature,
  }));
}

function assertHash(value, label) {
  if (!HASH.test(String(value ?? ''))) throw new Error(`${label} must be a SHA-256 hash`);
}

function independentActor(finding, actor) {
  return actor && actor !== 'builder' && actor !== finding.author;
}

export function createFinding({ id, author, severity, claim, failureSignature }) {
  const canonicalSignature = canonicalizeFailureSignature(failureSignature);
  if (!id || !author || !claim || !canonicalSignature) {
    throw new Error('Finding id, author, claim, and failure signature are required');
  }
  if (!SEVERITIES.has(severity)) throw new Error(`Unknown finding severity: ${severity}`);
  return Object.freeze({ id, author, severity, claim, failureSignature: canonicalSignature,
    status: 'PROPOSED', history: Object.freeze([]) });
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

export function hasCanonicalFindingClosure(finding) {
  if (!findingIdentityHash(finding) ||
      canonicalizeFailureSignature(finding.failureSignature) !== finding.failureSignature ||
      finding.status !== 'CLOSED' || !DISPOSITIONS.has(finding.disposition) ||
      !independentActor(finding, finding.validation?.actor) ||
      !HASH.test(String(finding.validation?.evidenceHash ?? '')) ||
      !independentActor(finding, finding.closure?.actor) ||
      !HASH.test(String(finding.closure?.evidenceHash ?? '')) ||
      !Array.isArray(finding.history) || finding.history.length !== 2) return false;
  if (finding.disposition === 'OWNER_EXEMPTION' &&
      !HASH.test(String(finding.closure.ownerApprovalHash ?? ''))) return false;
  const [validation, closure] = finding.history;
  return validation?.action === 'validate' &&
    validation.actor === finding.validation.actor &&
    validation.evidenceHash === finding.validation.evidenceHash &&
    closure?.action === 'close' && closure.actor === finding.closure.actor &&
    closure.disposition === finding.disposition &&
    closure.evidenceHash === finding.closure.evidenceHash &&
    (closure.ownerApprovalHash ?? null) === (finding.closure.ownerApprovalHash ?? null);
}
