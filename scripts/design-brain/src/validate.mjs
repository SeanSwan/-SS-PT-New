/**
 * validate.mjs — dependency-free validators enforcing the receipt/1 and claim/1 contracts.
 * ========================================================================================
 * ajv is not present in this repo's root and the engine must stay zero-dependency for the
 * cold-client install, so the JSON Schemas in ../schemas/ are the documented contract and this
 * module enforces the same rules by hand. A record that fails is REFUSED with every error named —
 * silent coercion is how corrupt records acquire authority.
 *
 * Denied fields are a hard fail: screenshots, HTML, tokens, account/customer data must never enter
 * the corpus (ToS + Rule 8 hygiene).
 *
 * @module design-brain/validate
 */

const DENIED_FIELDS = [
  'screenshot', 'image', 'html', 'pageCopy', 'cookie', 'token', 'oauthUrl', 'connectorUrl',
  'accountEmail', 'customerData',
];

const REF_TYPES = new Set(['screen', 'flow', 'section']);
const PLATFORMS = new Set(['ios', 'android', 'web']);
const STATUSES = new Set(['proposed', 'accepted', 'rejected', 'trial', 'merged']);
const LEVELS = new Set(['low', 'medium', 'high']);

const isStr = (v, min = 1) => typeof v === 'string' && v.trim().length >= min;
const isIso = (v) => typeof v === 'string' && !Number.isNaN(new Date(v).getTime());

function deniedFieldErrors(obj) {
  const errs = [];
  for (const k of Object.keys(obj)) {
    if (DENIED_FIELDS.includes(k)) errs.push(`denied field present: ${k}`);
  }
  return errs;
}

/** Validate a receipt/1 object. Returns { ok, errors[] }. */
export function validateReceipt(r) {
  const errors = [];
  if (typeof r !== 'object' || r == null) return { ok: false, errors: ['not an object'] };
  errors.push(...deniedFieldErrors(r));
  if (!isStr(r.receiptId) || !/^RCP-[A-Za-z0-9-]{4,}$/.test(r.receiptId)) errors.push('receiptId must match RCP-…');
  if (!isStr(r.domainId)) errors.push('domainId required');
  if (!isStr(r.product, 2)) errors.push('product required');
  if (!REF_TYPES.has(r.refType)) errors.push('refType must be screen|flow|section');
  if (!isStr(r.surface, 3)) errors.push('surface required (min 3 chars)');
  if (!PLATFORMS.has(r.platform)) errors.push('platform must be ios|android|web');
  if (r.stepCount != null && (!Number.isInteger(r.stepCount) || r.stepCount < 1 || r.stepCount > 50)) {
    errors.push('stepCount must be an integer 1–50');
  }
  // The 40-char floor is the anti-vacuous-receipt rule: "used clear hierarchy" does not clear it.
  if (!isStr(r.hierarchyNotes, 40)) errors.push('hierarchyNotes must be substantive (≥40 chars)');
  if (!Array.isArray(r.principleCandidates) || r.principleCandidates.length < 1
      || !r.principleCandidates.every((p) => isStr(p, 15))) {
    errors.push('principleCandidates: ≥1 entries, each ≥15 chars');
  }
  if (!isStr(r.inspectorActorId, 3)) errors.push('inspectorActorId required');
  if (!isIso(r.openedAtUtc)) errors.push('openedAtUtc must be a valid timestamp');
  return { ok: errors.length === 0, errors };
}

/** Validate a claim/1 object. Returns { ok, errors[] }. */
export function validateClaim(c) {
  const errors = [];
  if (typeof c !== 'object' || c == null) return { ok: false, errors: ['not an object'] };
  errors.push(...deniedFieldErrors(c));
  if (!isStr(c.claimId) || !/^CLM-[A-Za-z0-9-]{4,}$/.test(c.claimId)) errors.push('claimId must match CLM-…');
  if (!isStr(c.domainId)) errors.push('domainId required');
  if (!isStr(c.principle, 20)) errors.push('principle must be substantive (≥20 chars)');
  if (!isStr(c.workflowPhase)) errors.push('workflowPhase required');
  if (!isStr(c.userRole)) errors.push('userRole required');
  if (!Array.isArray(c.products) || c.products.length < 1) errors.push('products: ≥1 required');
  else if (new Set(c.products).size !== c.products.length) errors.push('products must be unique');
  if (!Array.isArray(c.receiptRefs) || c.receiptRefs.length < 1) errors.push('receiptRefs: ≥1 required');
  if (typeof c.confidence !== 'object' || c.confidence == null
      || !LEVELS.has(c.confidence.level) || !isStr(c.confidence.basis)) {
    errors.push('confidence {level: low|medium|high, basis} required');
  }
  if (!STATUSES.has(c.status)) errors.push('status must be proposed|accepted|rejected|trial|merged');
  if (c.status === 'merged' && !isStr(c.mergedInto)) errors.push('merged claims need mergedInto');
  if (!isIso(c.createdUtc)) errors.push('createdUtc must be a valid timestamp');
  return { ok: errors.length === 0, errors };
}

/** Mechanical confidence from unique product count. Never model judgement. */
export function confidenceFor(products) {
  const n = new Set(products).size;
  if (n >= 4) return { level: 'high', basis: `${n} independent products` };
  if (n >= 2) return { level: 'medium', basis: `${n} independent products` };
  return { level: 'low', basis: 'single source — capped LOW until corroborated' };
}
