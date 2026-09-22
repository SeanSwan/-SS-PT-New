/**
 * licenceGate.mjs — the licence JUDGEMENT, extracted from `registry.mjs` for rule 4.
 *
 * ── WHY THIS IS A SEPARATE DECISION ─────────────────────────────────────────
 * Resolving a provider is a LOOKUP. Deciding whether a licence permits the intended use is a
 * JUDGEMENT, and it is the one judgement in this lane whose failure mode is legal rather than
 * financial. Keeping them in one file meant the judgement could only be changed by editing
 * the lookup.
 *
 * It RETURNS a refusal descriptor rather than throwing, so the error vocabulary stays in
 * `registry.mjs` and this module has no opinion about which class carries it.
 *
 * ── WHAT THE RESTRICTION ACTUALLY SAYS ──────────────────────────────────────
 * The H3 licence restricts RUNNING THE WEIGHTS in an excluded territory for commercial
 * purposes. It is NOT a restriction on the generated output, and it is NOT a worldwide bar:
 * the same model runs commercially outside the excluded territory with no grant at all. That
 * is asserted by the registry suite ("permits the same model outside the excluded
 * territory") and stated in the catalogue row's own comment, so this file must not
 * over-restrict either.
 *
 * A round-11 draft read the two fields as a single conjunction and required the grant
 * EVERYWHERE. That closed the hole below and broke the specification — the registry suite
 * caught it, which is what that suite is for. The real defect was not the conjunction; it was
 * that `territory` was supplied by the CALLER. See `territories` below.
 *
 * ── THE DIRECTION THIS GATE FAILS (round 14) ────────────────────────────────
 * Every guard here can only REFUSE, so anything the guards do not recognise falls through to
 * PERMITTED — and a probe that tests refusals cannot see that. Round 13 found the mirror
 * image in the ceilings (a guard that refuses too much looks like fail-closed in review);
 * this is the same blind spot pointed the other way.
 *
 * The gate therefore reads `commercialUse` as a CLOSED vocabulary and refuses anything
 * outside it, including a missing field. The vocabulary itself lives in `licenceTerms.mjs`
 * so that `specShape.mjs` — which rejects a bad row at import — and this file, which refuses
 * it at request time, cannot drift apart. An unreadable position is an UNKNOWN one, and
 * unknown is not permissive; that is the whole rule, applied once per field this file reads.
 */

import {
  COMMERCIAL_USE, COMMERCIAL_USE_VALUES, isKnownCommercialUse,
  isLicenceObject, evidenceUnretrieved, exclusionList,
} from './licenceTerms.mjs';

/** The one message shape for "we cannot read a position, so we are not treating it as a yes". */
const unknownPosition = (id, detail) => ({
  code: 'E_LICENCE_POSITION_UNKNOWN',
  message: `"${id}" has no readable commercial-use position — ${detail} An unreadable position is `
    + 'an UNKNOWN one, and unknown is not permissive. Record the terms as an object carrying '
    + `\`commercialUse\` (one of ${COMMERCIAL_USE_VALUES.join(', ')}) and \`excludedTerritories\` `
    + '(an array). Non-commercial use is unaffected.',
});

/**
 * @returns {{code: string, message: string} | null} the refusal, or null if the use is permitted.
 */
export function licenceRefusal({ id, licence, commercial, territory, grants }) {
  // NON-COMMERCIAL USE IS UNAFFECTED — and "non-commercial" is a CLAIM, so only the
  // boolean `false` makes it.
  //
  // This was `if (!commercial) return null`, which reads TRUTHINESS: `0`, `''`, `null`,
  // `NaN` and `undefined` all took the non-commercial branch and skipped the entire
  // judgement below. The rule this file applies to `commercialUse` is that a value the gate
  // does not recognise is not a yes; the field that decides whether the gate RUNS AT ALL
  // deserves the same rule. Both HTTP boundaries already read
  // `params.commercial !== false`, so only the boolean `false` reaches here in practice —
  // and `hostile-round15-probe.mjs` asserts that coupling, so relaxing either boundary to a
  // truthiness test fails the probe rather than quietly opening this gate.
  //
  // Stated as an early return rather than implied by three `commercial &&` guards, so that
  // everything below is unambiguously about commercial use, and so that no guard added
  // later can accidentally acquire a non-commercial scope.
  if (commercial === false) return null;

  // A LICENCE THAT IS NOT A RECORD IS NOT A PERMISSION.
  // `assertSpecShape` required `licence` to be present and rejected only `undefined`, so
  // `licence: 'Apache-2.0'` was a legal catalogue row. This function then read `.evidence`
  // and `.commercialUse` off a STRING — both `undefined` — and every guard fell through to
  // PERMITTED. That is the bare-value trap the cost fields are already protected from, in
  // the one field whose failure mode is legal instead of financial.
  if (!isLicenceObject(licence)) {
    return unknownPosition(id, `it is ${licence === null ? 'null' : typeof licence}, not a licence record.`);
  }

  // AN UNRETRIEVED POSITION IS NOT A PERMISSIVE ONE. A row can be present, priced and
  // technically runnable while its commercial-use terms have never been read — the first
  // version of the hosted rows asserted `commercialUse: 'permitted'` by analogy with another
  // vendor, which is a plausible guess and not evidence. Refusing here is cheap and legible;
  // discovering it after a paid run is neither.
  //
  // NOTHING REACHES PAST THIS: not a territory, and not a grant. You cannot be granted terms
  // that nobody has read.
  //
  // The test is the flag's PRESENCE, not one spelling of its value. The old test was
  // `=== 'unretrieved'` on a field nothing validated, so the guarantee rested on a literal
  // matching by luck; `'pending'`, `'claim'`, a typo or a different case all read as a yes.
  // See `licenceTerms.evidenceUnretrieved`.
  if (evidenceUnretrieved(licence)) {
    return {
      code: 'E_LICENCE_EVIDENCE_MISSING',
      message: `"${id}" has no retrieved licence terms, so its commercial-use position is UNKNOWN — `
        + "and unknown is not permissive. Retrieve the vendor's commercial-use and territory terms, "
        + 'record what they actually say in the catalogue row, and drop the evidence flag. '
        + 'Non-commercial use is unaffected.',
    };
  }

  // THE POSITION MUST BE ONE WE RECOGNISE.
  //
  // This is the round-14 defect. `'requires-grant'` was the only restrictive value the gate
  // knew, so every other string — `'prohibited'`, `'unknown'`, `'unverified'`, `'No'`, the
  // empty space left by a missing field — was read as PERMITTED. The live consequence:
  // `catalogueHosted.mjs` tells the operator to clear the hosted refusal by setting
  // `commercialUse` "to what they actually say" and dropping `evidence`, and terms that
  // forbid commercial use are as common as terms that permit it. Following that instruction
  // with a prohibitory reading moved the row from REFUSED to PERMITTED.
  const position = licence.commercialUse;
  if (!isKnownCommercialUse(position)) {
    return unknownPosition(id,
      `it declares commercialUse=${JSON.stringify(position === undefined ? null : position)}, `
      + 'which is not a position this gate recognises.');
  }
  if (position === COMMERCIAL_USE.PROHIBITED) {
    return {
      code: 'E_LICENCE_PROHIBITED',
      message: `"${id}" forbids commercial use of the model. No grant can change this — only `
        + 'different terms can, so there is nothing to apply for. Non-commercial use is unaffected.',
    };
  }
  if (position === COMMERCIAL_USE.UNVERIFIED) {
    return {
      code: 'E_LICENCE_UNVERIFIED',
      message: `"${id}" records its commercial-use position as unverified, which is UNKNOWN — and `
        + 'unknown is not permissive. Retrieve the terms, record what they actually say, and set '
        + `\`commercialUse\` to ${COMMERCIAL_USE.PERMITTED}, ${COMMERCIAL_USE.REQUIRES_GRANT} or `
        + `${COMMERCIAL_USE.PROHIBITED}. Non-commercial use is unaffected.`,
    };
  }

  // THE EXCLUSION LIST MUST BE READABLE AS A LIST. `'CANADA'` substring-matches `'CA'` and so
  // invents an exclusion; `'US'` does not substring-match `'CA'` and so reads as NO exclusion
  // at all. The second direction is fail-open, and it is what an author reaches by writing the
  // field the obvious wrong way. Neither is decidable from the value.
  const excluded = exclusionList(licence);
  if (excluded === null) {
    return unknownPosition(id,
      `it declares excludedTerritories as ${JSON.stringify(licence.excludedTerritories)}, which is `
      + 'not a list, so its territory exclusion cannot be evaluated — and "cannot be evaluated" '
      + 'must not resolve to "no exclusion".');
  }

  const territoryExcluded = excluded.includes(territory);

  // A TERRITORY EXCLUSION IS CLEARED BY A GRANT, whichever shape the row has.
  //
  // Two messages rather than one, because they ask the operator for different things: a
  // `requires-grant` row needs the licence application, while a row that otherwise permits
  // commercial use needs only the written exception. Round 11 noted that no catalogue row had
  // the second shape yet, which is exactly why it is written down — the previous gate made the
  // exclusion unreachable for such a row, so the first one added would have shipped ungated.
  if (territoryExcluded && !grants.has(id)) {
    if (position === COMMERCIAL_USE.REQUIRES_GRANT) {
      return {
        code: 'E_LICENCE_GRANT_REQUIRED',
        message: `"${id}" needs a written commercial grant to RUN in ${territory}. `
          + 'Note this restricts running the model, NOT the ownership or use of video it produces. '
          + `Request template: ${licence.grantRequestDoc || 'none on file'}. `
          + `Once granted, add "${id}" to SWAN_VIDEO_LICENCE_GRANTS.`,
      };
    }
    return {
      code: 'E_LICENCE_GRANT_REQUIRED',
      message: `"${id}" is excluded from ${territory} for commercial use. Add "${id}" to `
        + 'SWAN_VIDEO_LICENCE_GRANTS once you hold a written exception.',
    };
  }

  return null;
}

/**
 * THE TERRITORY THAT DECIDES A LICENCE QUESTION IS THE OPERATOR'S.
 *
 * The licence restricts where the WEIGHTS RUN, and a request cannot move the machine. Reading
 * it from the request let the caller declare its own jurisdiction and so switch the exclusion
 * off — measured over HTTP with no grant on file: `commercial: true, territory: "US"` → 403
 * `E_LICENCE_GRANT_REQUIRED`, while the IDENTICAL request with `territory: "CA"` → 201 and a
 * quote. **A licence gate a caller can self-certify past is not a gate.**
 *
 * `requested` is still accepted, and is honoured in the one direction that cannot weaken the
 * gate: a request that names a DIFFERENT territory is evaluated too, and any refusal wins.
 * That is the same rule `max_cost_usd` follows against the server's allowance — a caller may
 * narrow, never widen. It also means an operator who genuinely serves more than one
 * jurisdiction gets the stricter of the two rather than the one they hoped for.
 *
 * @returns {string[]} one or two territories to test; the first refusal among them wins.
 */
export function territories(operatorTerritory, requested) {
  const operator = String(operatorTerritory || '').trim() || 'US';
  const asked = String(requested ?? '').trim();
  return asked && asked !== operator ? [operator, asked] : [operator];
}
