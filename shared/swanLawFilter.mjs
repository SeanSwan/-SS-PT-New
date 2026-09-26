/**
 * swanLawFilter.mjs — taste law enforcement for generated-image prompts.
 *
 * SCOPE: this guards the TEXT of a prompt before it reaches an image/video
 * provider. It is NOT a CSS validator — `frontend/src/adapters/style-lens-swan/
 * contract/designValueGuard.ts` already owns runtime style values and stays the
 * authority there. Different domain, deliberately separate.
 *
 * WHY IT BLOCKS RATHER THAN STRIPS: silently removing an offending phrase
 * teaches the operator nothing and hides a taste failure behind a clean-looking
 * result. A blocked compile names the slot and the law, so the direction gets
 * fixed instead of laundered.
 *
 * WHAT THE LAWS ARE lives next door in `swanLawPatterns.mjs` (DATA); this file is
 * the RUNNER (BEHAVIOUR). Split at the 300-line cap, same DATA/BEHAVIOUR seam
 * `swanVocabulary.mjs` takes from `swanPromptCompiler.mjs`. The patterns are
 * imported for LOCAL use AND re-exported — `export ... from` alone creates no
 * local binding, which `moduleSmoke.test.mjs` exists to catch (bitten 3×).
 *
 * Dependency-free on purpose: importable by the backend service, the CLI, and the
 * MCP server without dragging anything along.
 */

import { PATTERNS, KILL_LIST, KILL_LIST_TEXT, KILL_LIST_PROSE, LAW_NAMES } from './swanLawPatterns.mjs';

export { KILL_LIST, KILL_LIST_TEXT, KILL_LIST_PROSE, LAW_NAMES };

const {
  RETIRED_HEX, RETIRED_NAMED, CREATURE_I18N, CREATURE_ACTION,
  CREATURE, OCCLUDER_OK, CREATURE_IDIOM, CREATURE_DETAIL,
  GOLD, GOLD_ALLOWED, GOLD_IDIOM,
  BANNED_FACETS, YOGA, BAD_CREDENTIAL,
} = PATTERNS;

/** A single law violation. `slot` is the 12-slot field that carried it. */
export class LawViolation {
  constructor(law, slot, detail) {
    this.law = law;
    this.slot = slot;
    this.detail = detail;
  }
}

/**
 * Normalize before matching. Raw-text regexes are defeated by zero-width
 * characters, fullwidth forms, and decomposed diacritics. NFKC folds fullwidth
 * to ASCII; \p{Cf} strips zero-width/format controls. Verified bypasses before
 * this existed: "iridescent<ZWSP> gradient", fullwidth "ｉｒｉｄｅｓｃｅｎｔ".
 */
function normalize(value) {
  return String(value)
    .normalize('NFKC')
    .replace(/\p{Cf}/gu, '')
    // Collapse single-letter spacing evasion ("i r i d e s c e n t") only when a
    // run of 4+ single letters appears; ordinary prose is untouched.
    .replace(/\b(?:\p{L}\s){3,}\p{L}\b/gu, (m) => m.replace(/\s+/g, ''));
}

/**
 * Run every law against a resolved slot map.
 *
 * @param {Record<string,string>} slots  the 12-slot map (partial is fine)
 * @param {string[]} [facets]            taxonomy facets applied
 * @returns {{passed: boolean, violations: LawViolation[], checks: {law:string,passed:boolean}[]}}
 */
export function applyLaws(slots = {}, facets = []) {
  const violations = [];
  // The `negative` slot is EXEMPT by design: its whole job is to NAME the
  // banned things so the provider avoids them. Scanning it would make every
  // lawful compile self-reject on its own kill-list — which is exactly what
  // happened the first time this ran against the compiler.
  // Safe to exempt: a term in `negative` is an instruction to AVOID it, so a
  // creature or gradient appearing there is the desired behaviour, not a bypass.
  const entries = Object.entries(slots)
    .filter(([k]) => k !== 'negative')
    .filter(([, v]) => typeof v === 'string' && v.length)
    .map(([k, v]) => [k, normalize(v)]);
  const joined = entries.map(([, v]) => v).join('   ');

  // Normalized once, used by LAW 3's carry-check and by LAW 10 below. Non-string
  // values normalize to '' rather than to "null"/"undefined" — a slot holding a
  // non-string carries no list, whatever it holds.
  const negativeNormalized = typeof slots.negative === 'string' ? normalize(slots.negative) : '';

  // LAW 3 — kill-list
  for (const item of KILL_LIST) {
    for (const [slot, value] of entries) {
      if (item.re.test(value)) violations.push(new LawViolation('LAW3-kill-list', slot, item.why));
    }
  }

  /**
   * LAW 3 — kill-list CARRIED. The second condition, and the reason this check
   * had a name it did not earn.
   *
   * The loop above scans POSITIVE slots only. Nothing anywhere asserted that the
   * kill-list was still THERE — and `resolveSlots` applies `brief.slotOverrides`
   * LAST (`swanPromptCompiler.mjs`), after the kill-list is set, so an override
   * can delete it. Measured before this fix: a compile with
   * `slotOverrides: { negative: '' }` returned OK with all six lawChecks green,
   * INCLUDING this one. A green `LAW3-kill-list` that does not mean "the
   * kill-list is enforced" is the same defect class as a refusal that does not
   * refuse — and as a count that is not a count.
   *
   * WHY "at least one family" AND NOT "all six": two landed hostile-review
   * regressions (swanLawFilter.test.mjs:143-152 and :203-212) deliberately assert
   * that a PARTIAL or REPLACED negative slot still passes, because naming banned
   * aesthetics in that slot is its entire job. Demanding the full canonical list
   * would mean rewriting those tests to match the code. One family is the honest
   * line: a negative slot naming NO kill-list family is not a kill-list, it is a
   * deleted law wearing the slot's name.
   *
   * WHY `hasOwn` AND NOT TRUTHINESS: an ABSENT `negative` key is a partial call,
   * not a verdict. `scripts/forge.mjs` calls `assertLawful({ subject: change }, [])`
   * in production, the corpus test calls `applyLaws({ [slot]: text })`, and this
   * suite's own `clean` fixture carries no `negative` key at all. Flagging
   * absence would break all three and would be wrong: `resolveSlots` always fills
   * this slot, so only something that WROTE it empty can produce a blank one.
   *
   * RESIDUAL, NAMED RATHER THAN IMPLIED: this does not prove the slot carries the
   * FULL canonical kill-list. An override can still replace the prose with a
   * shorter non-empty list naming one family. Closing that belongs at the
   * override BOUNDARY — which keys may be overridden at all — not in the law
   * filter. `scripts/astra/surface/api.mjs` refuses `negative` as an override key
   * for exactly this reason.
   */
  if (Object.hasOwn(slots, 'negative')
      && !KILL_LIST.some((item) => item.re.test(negativeNormalized))) {
    violations.push(new LawViolation('LAW3-kill-list', 'negative',
      'the negative slot is present but names no kill-list family — the kill-list was '
      + 'deleted rather than composed. Remove the override that emptied it.'));
  }

  // LAW 4 — optics, not creatures
  for (const [slot, value] of entries) {
    const withoutIdioms = value.replace(CREATURE_IDIOM, ' ');
    if (CREATURE.test(withoutIdioms) || CREATURE_I18N.test(withoutIdioms)) {
      if (!OCCLUDER_OK.test(value)) {
        violations.push(new LawViolation(
          'LAW4-optics-not-creatures', slot,
          'literal creature form — permitted only as a dark occluder in a light field',
        ));
      } else if (CREATURE_DETAIL.test(value)) {
        // The occluder exemption is a SHAPE allowance, not a rendering licence.
        violations.push(new LawViolation(
          'LAW4-optics-not-creatures', slot,
          'occluder framing present but the creature is being RENDERED (feathers/eyes/photorealistic). '
          + 'An occluder is a dark shape blocking light — remove the anatomical detail.',
        ));
      } else if (CREATURE_ACTION.test(value)) {
        // A lawful phrase elsewhere in the slot is not a shield. If the creature
        // is ACTING, it is being depicted — "a dark occluder in a caustic field —
        // and a smiling swan paddling in the foreground" passed before this.
        violations.push(new LawViolation(
          'LAW4-optics-not-creatures', slot,
          'occluder framing present but the creature is ACTING (paddling/flying/smiling). '
          + 'The exemption covers a static light-blocking shape, not a depicted animal.',
        ));
      }
    }
  }

  // LAW 2 — gold allowlist
  for (const [slot, value] of entries) {
    if (GOLD.test(value.replace(GOLD_IDIOM, ' ')) && !GOLD_ALLOWED.test(value)) {
      violations.push(new LawViolation(
        'LAW2-gold-allowlist', slot,
        'gold outside its allowlist (PR numeral + delta, <=1px filigree, focus ring, one badge)',
      ));
    }
  }

  // Retired palette — scan every slot, including var() fallbacks
  for (const [slot, value] of entries) {
    if (RETIRED_HEX.some((re) => re.test(value)) || RETIRED_NAMED.test(value)) {
      violations.push(new LawViolation('LAW9-retired-palette', slot,
        'retired Galaxy-Swan value (by hex or by name)'));
    }
  }

  // LAW 10 — content law
  for (const [slot, value] of entries) {
    if (YOGA.test(value)) {
      violations.push(new LawViolation('LAW10-content', slot, 'use "stretching"/"flexibility", never yoga/meditation'));
    }
    if (BAD_CREDENTIAL.test(value)) {
      violations.push(new LawViolation('LAW10-content', slot, 'forbidden credential claim'));
    }
  }

  // LAW 10 applies to the `negative` slot too — it is exempt from TASTE law,
  // not from CONTENT law. Naming a banned aesthetic in `negative` is the point;
  // naming content-law-violating text there is still a stored-record and
  // provider-payload liability, because a verified provider receives that field
  // verbatim and a GenerationRecord persists it.
  // NOTE: this enforces only the content law Swan actually defines
  // (yoga/meditation, the joined credential form). Broader safety
  // classification (illegal or harmful imagery) is a separate concern that
  // belongs to the provider adapter layer, not this taste filter — flagged, not
  // silently assumed handled.
  if (negativeNormalized) {
    if (YOGA.test(negativeNormalized)) {
      violations.push(new LawViolation('LAW10-content', 'negative',
        'content-law term in the negative slot — exempt from taste law, not content law'));
    }
    if (BAD_CREDENTIAL.test(negativeNormalized)) {
      violations.push(new LawViolation('LAW10-content', 'negative', 'forbidden credential claim in negative slot'));
    }
  }

  // Banned facets
  for (const f of facets) {
    const leaf = String(f).split('>').pop().trim().toLowerCase();
    if (BANNED_FACETS.has(leaf)) {
      violations.push(new LawViolation('LAW3-banned-facet', 'facets', `facet "${f}" is banned for Swan surfaces`));
    }
  }

  void joined; // reserved for future cross-slot checks; kept explicit, not silently unused

  return {
    passed: violations.length === 0,
    violations,
    // From LAW_NAMES — the ONE definition. See its comment above: this line held
    // a second hand-kept copy until it was caught, which is how a law added later
    // gets enforced by the loops and omitted from `checks`.
    checks: LAW_NAMES.map((law) => ({ law, passed: !violations.some((v) => v.law === law) })),
  };
}

/** Throwing wrapper for the compile path. Never strips, always names the slot. */
export function assertLawful(slots, facets) {
  const r = applyLaws(slots, facets);
  if (!r.passed) {
    const first = r.violations[0];
    const err = new Error(`E_LAW_VIOLATION: [${first.law}] slot "${first.slot}" — ${first.detail}`);
    err.code = 'E_LAW_VIOLATION';
    err.violations = r.violations;
    throw err;
  }
  return r;
}
