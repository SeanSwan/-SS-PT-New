/**
 * licenceTerms.mjs — the CLOSED vocabulary of a licence position, as DATA.
 *
 * ── WHY FOUR STRINGS GET THEIR OWN MODULE ───────────────────────────────────
 * Two modules need the same answer and must not be able to disagree about it:
 *
 *   specShape.mjs    "is this a row we are willing to LOAD at all?"   — at import
 *   licenceGate.mjs  "may this row be RUN commercially?"              — at request time
 *
 * If the vocabulary lived in `licenceGate.mjs`, the validator would import the module it
 * is protecting — the coupling `specShape.mjs` already refuses to accept for money ("a
 * validator that depends on the module it is protecting cannot reject a row when that
 * module is the thing that is broken"). If it lived in `specShape.mjs`, the judgement
 * would depend on the validator. Neither direction is acceptable.
 *
 * A shared data module is the shape this project already uses for exactly this problem:
 * `provenanceTags.mjs` exists so `catalogue.mjs` and `catalogueHosted.mjs` can agree on
 * three tags without an import cycle. This is the same move for a different vocabulary.
 *
 * ── THE DEFECT THIS FILE CLOSES (round 14) ──────────────────────────────────
 * `commercialUse` was READ as a closed vocabulary and STORED as an open string. The gate
 * recognised exactly one restrictive value (`'requires-grant'`) and treated the whole rest
 * of the string space as permission — including `'prohibited'`, `'unknown'`,
 * `'unverified'`, and the space left by a missing field entirely.
 *
 * The consequence was not hypothetical. `catalogueHosted.mjs` instructs the operator to
 * clear the hosted refusal by setting `commercialUse` "to what they actually say" and
 * dropping `evidence`. Terms that FORBID commercial use are as common as terms that permit
 * it, and following that instruction with a prohibitory reading moved the row from REFUSED
 * to PERMITTED. The documented way to clear the flag was the documented way to open the
 * hole — which is the worst shape a gate can have, because the operator is doing what the
 * code told them to do.
 *
 * So the vocabulary is enumerated here, and **an unrecognised value is not a yes**.
 */

/**
 * The four positions a licence may take on commercial use. There is no fifth, and adding
 * one is a deliberate act rather than a string an author happens to type.
 */
export const COMMERCIAL_USE = Object.freeze({
  /** Commercial use is permitted, subject only to any territory exclusion. */
  PERMITTED: 'permitted',

  /**
   * Commercial use needs a written grant — CONDITIONAL on the territory list.
   *
   * This is not a worldwide bar and must not be read as one. The H3 licence restricts
   * RUNNING THE WEIGHTS in an excluded territory; the same model runs commercially
   * outside it with no grant at all. Round 11's first draft read the two fields as a
   * conjunction and required the grant everywhere; the registry suite caught it, and
   * `hostile-round14-probe.mjs` now asserts the correct reading explicitly so that
   * nobody "fixes" it back into a bar.
   */
  REQUIRES_GRANT: 'requires-grant',

  /** The terms forbid commercial use. No grant can change this; only other terms can. */
  PROHIBITED: 'prohibited',

  /** Nobody has read the terms. NOT a synonym for `permitted` — see `evidenceUnretrieved`. */
  UNVERIFIED: 'unverified',
});

/** Every recognised value, in the order the validator's error message lists them. */
export const COMMERCIAL_USE_VALUES = Object.freeze(Object.values(COMMERCIAL_USE));

/**
 * Membership, tested by OWN property.
 *
 * `COMMERCIAL_USE['constructor']` and `['__proto__']` resolve through the prototype chain
 * on any plain object literal, so `if (VOCAB[value])` would read a prototype member as a
 * recognised position — the same mistake `registry.capabilities` already documents for
 * provider ids, in a place where the failure direction is permissive rather than a wrong
 * error code. `Object.hasOwn` is the honest test.
 */
const RECOGNISED = Object.freeze(
  Object.fromEntries(COMMERCIAL_USE_VALUES.map(v => [v, true])),
);

/** @returns {boolean} true when `value` is one of the four enumerated positions. */
export function isKnownCommercialUse(value) {
  return typeof value === 'string' && Object.hasOwn(RECOGNISED, value);
}

/** A licence record is a plain object. A string, an array, null and undefined are not. */
export function isLicenceObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * THE EVIDENCE FLAG — "nobody has read these terms".
 *
 * ── THIS IS A FLAG, NOT A VOCABULARY ────────────────────────────────────────
 * The previous guard was `licence.evidence === 'unretrieved'` — an exact string match on a
 * field nothing validated. Not the catalogue, not `assertSpecShape`, not the registry. So
 * the entire fail-closed guarantee for the hosted lane rested on one string literal
 * matching by luck, and every plausible near-miss — `'pending'`, `'claim'`,
 * `'not-retrieved'`, a typo, a different case, stray whitespace — read as PERMITTED.
 *
 * The honest reading is the one the field already means in prose: a row that carries an
 * evidence marker is telling you its terms have not been established. That is true of the
 * marker's PRESENCE, not of one spelling of its value, so presence is what is tested.
 *
 * To clear it: remove the field. That is what `catalogueHosted.mjs` already instructs, and
 * it is now the only thing that clears it — which is the point, because the instruction and
 * the implementation now agree.
 *
 * NOT to be confused with the wire format. `routesCatalog.mjs` renders
 * `licence.evidence ?? 'retrieved'`, so a row with no flag is REPORTED to a caller as
 * `'retrieved'`. That default is a rendering decision about a response body, not a stored
 * value, and it never reaches this function.
 *
 * @returns {boolean} true when the row's terms have not been read.
 */
export function evidenceUnretrieved(licence) {
  if (!isLicenceObject(licence)) return false;
  const flag = licence.evidence;
  if (flag === undefined || flag === null) return false;
  return String(flag).trim() !== '';
}

/**
 * The territory exclusion list, or `null` when it cannot be read as one.
 *
 * `(licence.excludedTerritories || []).includes(territory)` on a STRING is
 * `String.prototype.includes` — a SUBSTRING test, and it mis-reads in BOTH directions:
 *
 *   `'CANADA'.includes('CA')`  is TRUE   — an exclusion on a territory never named;
 *   `'US'.includes('CA')`      is FALSE  — which reads as NO EXCLUSION AT ALL.
 *
 * The second is the fail-open direction, and it is the one an author reaches by writing the
 * field the obvious wrong way. Neither is decidable from the value, so the answer is to say
 * the list is unreadable rather than to guess what it meant.
 *
 * An ABSENT list is `[]`, matching the behaviour it has always had — the validator makes
 * absence impossible for a catalogue row, so this is reachable only from a synthetic
 * licence, and no caller's behaviour changes.
 *
 * @returns {string[] | null}
 */
export function exclusionList(licence) {
  if (!isLicenceObject(licence)) return null;
  const list = licence.excludedTerritories;
  if (list === undefined || list === null) return [];
  return Array.isArray(list) ? list : null;
}
