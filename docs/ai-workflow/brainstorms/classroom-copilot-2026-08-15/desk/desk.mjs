/**
 * The Desk — deterministic gate.
 * ==============================
 * The no-model floor of the six-stage pipeline published in `the-desk.html`.
 * No LLM, no network, no dependencies, no clipboard, no filesystem.
 *
 * WHAT THIS IS, EXACTLY — read before trusting a number it produces.
 * This is the DETERMINISTIC FLOOR, not the whole pipeline. The reviewed design
 * puts a local classifier at stages 3 and 4; this file is the layer underneath it,
 * the one that still has to hold when the model is absent, slow, evicted, or wrong.
 * Both reviewers required that floor by name ("the verdict survives a model failure",
 * "a deterministic keyword floor"). A novel paraphrase that dodges every term in
 * `lexicon.mjs` is caught by the model layer or by her own eye — not by this file.
 * Reporting this file's block recall as the system's block recall would be a lie.
 *
 * Contract: check(text, roster) -> Verdict
 *   Verdict = {
 *     verdict: 'GENERIC' | 'NAMED_ORDINARY' | 'REFUSED',
 *     outbound: string | null,      // ALWAYS null when REFUSED
 *     stage: 1..6,                  // which stage decided
 *     reason: string,               // plain language, for the card she reads
 *     className: string | null,     // which sensitive class fired
 *     substitutions: [{ from, to }],
 *     breach: string | null,        // a real name survived into outbound — pipeline fault
 *   }
 *
 * Two invariants, asserted at the end of every call and enforced by the harness:
 *   I1  REFUSED implies outbound === null. A refusal must never produce copyable text.
 *   I2  outbound never contains a roster name, nickname, carer name, or canary.
 *       If it does, the verdict is forced to REFUSED and `breach` is set — an
 *       inbound/outbound leak is an incident, not something to quietly clean up.
 *
 * Allow is conjunctive: every stage must pass. Deny is disjunctive: any stage stops it.
 * Anything thrown resolves to REFUSED — uncertainty always blocks.
 */

import {
  UNCONDITIONAL, CONDITIONAL, CARER, RECORD_MARKERS,
  DEFINITE_REFERENT, FIRST_PERSON_COHORT, POSSESSIVE_CARER,
  INDEFINITE_REFERENT, NARRATIVE, GENERIC_CUE, HUMAN_REFERENT, SINGULARITY,
} from './lexicon.mjs';
import {
  nameVariants, matchRoster, substitute, leakCheck, rosterCollisions, withPlaceholders,
} from './names.mjs';

// Re-exported so callers have one import for the gate and its roster helpers.
export { rosterCollisions, withPlaceholders };

/**
 * Clause-level binding for CONDITIONAL terms. Whole-text proximity over-fires:
 * "his mum collected him. Someone was sick in the hall." is two unrelated facts.
 *
 * Sentence terminators and newlines ONLY. This also split on "but", "then" and
 * "and then", which cut the carer away from the circumstance whenever the carer was
 * the subject: "his mum then went to hospital" passed while "his mum went to
 * hospital" refused. Inserting the word "then" was a working bypass, and one she
 * could stumble into by writing naturally. A period is a real boundary between
 * facts; a conjunction usually is not.
 */
function clauses(text) {
  return text.split(/(?<=[.!?])\s+|\n+/).filter(Boolean);
}

/** Stage 1 — record markers. A hit means she is pasting a record, not asking. */
function stage1(text) {
  for (const [label, pattern] of RECORD_MARKERS) {
    if (pattern.test(text)) return label;
  }
  return null;
}

/** Stages 4 and 6 share this: is a sensitive circumstance present in this text? */
function sensitiveClass(text) {
  for (const [label, pattern] of UNCONDITIONAL) {
    if (pattern.test(text)) return label;
  }
  for (const clause of clauses(text)) {
    if (!CARER.test(clause)) continue;
    for (const [label, pattern] of CONDITIONAL) {
      if (pattern.test(clause)) return label;
    }
  }
  return null;
}

/**
 * Stage 3 — does this predicate something about ONE child?
 * Returns the SIGNAL that fired, not just a boolean, because stage 6 needs to know
 * whether the referent was a name (removable) or a description (not).
 */
function stage3(text, rosterHits) {
  if (rosterHits.length) return 'named';
  if (DEFINITE_REFERENT.test(text)) return 'definite';
  if (POSSESSIVE_CARER.test(text)) return 'carer';
  if (FIRST_PERSON_COHORT.test(text)) return 'cohort';
  // Indefinite is generic UNLESS she is narrating something that actually happened —
  // and an explicit request for class-level guidance beats the narrative marker,
  // because "in general" is her saying outright that no real child is in scope.
  if (INDEFINITE_REFERENT.test(text) && NARRATIVE.test(text) && !GENERIC_CUE.test(text)) {
    return 'narrated';
  }
  return null;
}

/** Stage 6 — does the de-named text still narrow the roster? */
function stage6(text) {
  const stillSensitive = sensitiveClass(text);
  if (stillSensitive) return { reason: `it still describes ${stillSensitive}`, className: stillSensitive };
  for (const [reason, pattern] of SINGULARITY) {
    if (pattern.test(text)) return { reason, className: 'singular description' };
  }
  return null;
}

const refuse = (stage, reason, className = null) => ({
  verdict: 'REFUSED', outbound: null, stage, reason, className, substitutions: [], breach: null,
});

export function check(text, roster = [], canaries = []) {
  try {
    // Stage 0 — degraded input. Neither of these throws, so the catch below never
    // sees them, and both were returning GENERIC with the text passed through.
    //
    // The roster guard is the important one. Without a roster the gate cannot know
    // whether a word is a child's name, so every stage that follows is guessing —
    // and "Priya painted today" was being cleared as GENERIC because no name could
    // be matched. A control that fails silently open when its data is missing is
    // worse than no control, because the interface still says "safe to send".
    if (typeof text !== 'string') {
      return refuse(0, 'the note could not be read — nothing was copied', 'input');
    }
    if (!Array.isArray(roster) || roster.length === 0) {
      return refuse(0, 'the roster is not loaded, so names cannot be checked — '
        + 'the cloud lanes stay shut until it is', 'roster unavailable');
    }
    // An entry with no usable name means the roster is incomplete, which means there
    // is at least one child whose name this gate cannot recognise. That is the same
    // condition as no roster at all, and it gets the same answer. Discovered when a
    // defensive filter on blank fields accidentally removed a fail-closed path that
    // had only ever worked because malformed input happened to throw.
    if (roster.some((c) => !c || typeof c.name !== 'string' || !c.name.trim())) {
      return refuse(0, 'one child on the roster has no name saved, so their name '
        + 'cannot be checked for — finish the roster first', 'roster incomplete');
    }
    // A non-array `canaries` spreads into single characters, which silently turns the
    // last-resort leak check into nonsense while still reporting a clean pass.
    if (!Array.isArray(canaries)) {
      return refuse(0, 'the leak check could not be set up — nothing was copied', 'canaries invalid');
    }

    const marker = stage1(text);
    if (marker) {
      return refuse(1, `it contains ${marker} — delete that and check again`, 'record marker');
    }

    const variants = nameVariants(roster);
    const hits = matchRoster(text, variants);
    const specific = stage3(text, hits);
    const circumstance = sensitiveClass(text);

    if (!specific) {
      // The published pipeline lets a "not specific" verdict pass straight to the
      // generic lane, because it puts a local model at stages 3 and 4 — a model
      // reads "he has a hearing aid" as being about one child. A rules-only referent
      // detector cannot, and the failure is not graceful: stage 4 never runs, so the
      // circumstance is never examined and the sentence passes SILENTLY.
      //
      // So the floor refuses to pass sensitive vocabulary it cannot attribute. An
      // explicit request for class-level guidance still passes, because that is her
      // saying outright that no real child is in scope — and it is the escape hatch
      // the refusal card offers, which must never itself be refused.
      // Note what does NOT appear in this condition: a generic-cue escape. It was
      // here, and it was a two-word bypass — "in general, he has a hearing aid"
      // passed, as did "as a rule my little boy with the feeding tube". That is the
      // evasion Kimi K3 predicted the tool would teach her, reachable by accident.
      //
      // Nothing legitimate needed it. The class-level questions this rule must not
      // refuse ("what should a practitioner know about referral routes", "our
      // safeguarding policy needs updating") carry no singular human referent at
      // all, so HUMAN_REFERENT already lets them through on its own. The cue still
      // does real work in stage 3, where it distinguishes a class-level question
      // from a narrated day; it earned nothing here except a way around the gate.
      if (circumstance && HUMAN_REFERENT.test(text)) {
        return refuse(4, `this mentions ${circumstance}, and I cannot tell whether it is `
          + 'about a particular child — ask it as a general question, or use the '
          + 'private lane', circumstance);
      }
      const breach = leakCheck(text, roster, canaries);
      if (breach) return { ...refuse(3, 'a roster name survived into generic text', 'pipeline fault'), breach };
      return {
        verdict: 'GENERIC', outbound: text, stage: 3,
        reason: 'no child is mentioned — safe to send as written',
        className: null, substitutions: [], breach: null,
      };
    }

    if (circumstance) {
      return refuse(4, `in a room of twelve, ${circumstance} describes exactly one child — `
        + 'taking the name out would not help', circumstance);
    }

    const { out, substitutions } = substitute(text, hits);

    // A definite description with nothing to substitute is the referent AND the
    // identifier at once. "the quiet one still is not joining in at group time" has
    // no name to remove, so stage 5 changed nothing and the sentence left this
    // machine still pointing at exactly one child. Only `definite` is treated this
    // way: "in my room we do snack at ten" is a place, and "his mum asked about the
    // trip" is a family — neither singles a child out on its own.
    if (specific === 'definite' && substitutions.length === 0) {
      return refuse(6, 'it describes one child rather than naming them, so there is '
        + 'nothing to take out — the description is what identifies them',
      'singular description');
    }

    const survives = stage6(out);
    if (survives) return refuse(6, `even with the name removed, ${survives.reason}`, survives.className);

    const breach = leakCheck(out, roster, canaries);
    if (breach) {
      return { ...refuse(6, 'a name survived substitution', 'pipeline fault'), breach };
    }

    return {
      verdict: 'NAMED_ORDINARY', outbound: out, stage: 6,
      reason: substitutions.length === 1 ? '1 name replaced' : `${substitutions.length} names replaced`,
      className: null, substitutions, breach: null,
    };
  } catch (err) {
    // Fail-closed. An error is not a pass.
    return refuse(0, `the check could not complete (${err.message}) — nothing was copied`, 'error');
  }
}
