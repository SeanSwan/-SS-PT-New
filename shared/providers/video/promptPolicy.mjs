/**
 * promptPolicy.mjs — the content guardrail that runs before a prompt reaches a model.
 *
 * ── THE COMMITMENT THIS SATISFIES ───────────────────────────────────────────
 * The 2026-08-16 licensing request promised "a policy filter runs on every prompt
 * before submission; no depiction of identifiable real people without consent, no
 * minors, no deceptive or impersonating content."
 *
 * ── WHAT THIS IS NOT ────────────────────────────────────────────────────────
 * It is NOT `swanLawFilter.mjs`. That file enforces BRAND law — retired palette
 * hexes, the kill-list, optics-not-creatures. Different concern entirely, and
 * treating a brand filter as a safety control would have been the easy, wrong
 * shortcut: it would let "a policy filter runs on every prompt" be technically
 * true while checking nothing the licensor was told about.
 *
 * It is also NOT a guarantee, and the boundary is MEASURED rather than assumed.
 * An adversarial pass against this file found that letter-spacing ("c h i l d")
 * and digit substitution ("ch1ld") defeat it. Undoing those reliably means
 * accepting false positives on ordinary text, so they are left undefeated and
 * disclosed: this filter's job is stated intent, and control 6 — a human reviews
 * every asset before publication or delivery — is the backstop for disguised intent.
 *
 * What it DOES catch is the far likelier case: someone typing "a youngster" or
 * "my son" or "a 7th grader" with no intent to evade anything and getting a
 * synthetic minor. Every one of those phrasings was missed by the first version.
 *
 * ── WHY TWO SEVERITIES ──────────────────────────────────────────────────────
 * A filter that only blocks is a filter people route around. Some patterns are
 * unambiguous (a synthetic child); some are merely suspicious (a capitalised full
 * name, as likely a coach's own name as a celebrity's). Blocking the second class
 * in a personal-training product produces constant false refusals and trains the
 * operator to switch the filter off — strictly worse than flagging.
 *
 *   BLOCK  refuse the run outright
 *   FLAG   allow, but mark the asset as needing explicit human acknowledgement
 */

class PolicyViolation {
  constructor(severity, rule, detail) {
    this.severity = severity;   // 'block' | 'flag'
    this.rule = rule;
    this.detail = detail;
  }
}

/**
 * MINORS — hard block, no exceptions.
 *
 * SwanStudios legitimately trains youth, so this targets SYNTHETIC DEPICTION rather
 * than the words themselves. A coach writing "youth bootcamp" in a program never
 * reaches this file; a prompt asking a model to RENDER a young person does. No
 * legitimate use of a video generator here needs a synthetic minor, so there is no
 * carve-out worth the risk.
 */
const MINOR_PATTERNS = [
  { re: /\b(child|children|kid|kids|toddler|infant|baby|babies)\b/i, why: 'depiction of a child' },
  { re: /\b(teen|teens|teenager|teenaged|adolescent|minor|minors|preteen|pre-teen|tween)\b/i, why: 'depiction of a minor' },
  { re: /\b(boy|girl|schoolboy|schoolgirl|student|pupil)\b/i, why: 'possible depiction of a minor' },
  // Naive synonyms. NOT adversarial evasion — someone types "a youngster" with no
  // intent to route around anything, and the output is the same synthetic minor.
  { re: /\b(youngster|youngsters|juvenile|youth|youths|junior|juniors)\b/i, why: 'youth depiction' },
  { re: /\b(son|daughter|grandson|granddaughter|nephew|niece)\b/i, why: 'family reference to a young person' },
  { re: /\b(\d{1,2})[\s-]*(?:year|yr)s?[\s-]*old\b/i, why: 'explicit age', ageCheck: true },
  // Ages written as words went straight through the numeric check above.
  { re: /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen)[\s-]*(?:year|yr)s?[\s-]*old\b/i, why: 'stated age under 18, written in words' },
  { re: /\b\d{1,2}(?:st|nd|rd|th)[\s-]*graders?\b/i, why: 'school grade' },
  { re: /\bgrade[\s-]*\d{1,2}\b/i, why: 'school grade' },
  { re: /\b(elementary|middle school|high school|kindergarten|preschool|playground|recess|daycare|nursery)\b/i, why: 'school-age context' },
];

/** IMPERSONATION / SYNTHETIC LIKENESS — hard block. */
const IMPERSONATION_PATTERNS = [
  { re: /\b(deepfake|deep fake|face[\s-]?swap|faceswap)\b/i, why: 'synthetic likeness technique' },
  { re: /\b(impersonat\w*|pretending to be|posing as|disguised as)\b/i, why: 'impersonation' },
  { re: /\b(celebrity|celebrities|famous (?:actor|actress|athlete|singer|politician))\b/i, why: 'celebrity depiction' },
  // "make it look exactly like <Proper Name>" carries the whole intent without any of
  // the words above. The name is not the signal — the instruction to replicate is.
  { re: /\b(?:looks? (?:exactly )?like|identical to|a copy of|replicate|in the likeness of|modell?ed (?:on|after))\s+(?:a\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/, why: 'instruction to replicate a specific person' },
];

/** DECEPTION — hard block. Content whose purpose is to be mistaken for real. */
const DECEPTION_PATTERNS = [
  { re: /\b(fake|forged|counterfeit)\s+(news|report|document|certificate|id|licen[sc]e|passport|receipt|invoice)\b/i, why: 'forged document or record' },
  { re: /\b(breaking news|news (?:report|anchor|broadcast)|press conference)\b/i, why: 'simulated news framing' },
  // Naming a real outlet is a stronger signal than the generic words above.
  { re: /\b(cnn|bbc|fox news|msnbc|reuters|associated press|nbc news|abc news|cbs news|sky news)\b/i, why: 'real news outlet' },
  { re: /\b(police|government|official|federal|court)\s+(?:notice|order|statement|announcement|seal)\b/i, why: 'simulated official communication' },
  { re: /\b(medical|clinical|scientific)\s+(?:proof|evidence|study results?)\b/i, why: 'fabricated evidence claim' },
];

/**
 * REAL PEOPLE — flag, not block.
 *
 * A capitalised full name in a fitness prompt is far more often a trainer or a client
 * than a public figure. Blocking would refuse constantly and get the filter switched
 * off; flagging routes it to the human review that already exists.
 */
const REAL_PERSON_HINT = /\b(?:photo|video|footage|portrait|image|likeness) of ([A-Z][a-z]+ [A-Z][a-z]+)\b/;
const FULL_NAME_HINT = /\b([A-Z][a-z]{2,} [A-Z][a-z]{2,})\b/;

/** Capitalised phrases that are places or brands, not people. */
const NAME_FALSE_POSITIVE_GUARD = /\b(New York|Los Angeles|San Diego|United States|Swan Studios|SwanStudios|Personal Training|Golden Hour|Blue Hour)\b/;

function readBlockedNames(env) {
  return String(env.SWAN_VIDEO_BLOCKED_NAMES || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

/**
 * Fold away the cheap evasions, and only the cheap ones.
 *
 * NFKC maps common homoglyphs onto their ASCII forms; zero-width characters are
 * removed outright. Both are free. Letter-spacing and digit substitution are
 * deliberately NOT undone — see the docblock.
 */
export function normalisePrompt(input) {
  return String(input ?? '')
    .normalize('NFKC')
    .replace(/[​-‍﻿]/g, '');
}

/**
 * Evaluate a prompt.
 *
 * @returns {{allowed:boolean, violations:PolicyViolation[], flags:PolicyViolation[]}}
 */
export function evaluatePrompt(prompt, env = process.env) {
  const text = normalisePrompt(prompt);
  const violations = [];
  const flags = [];

  const scan = (patterns, rule) => {
    for (const p of patterns) {
      const m = text.match(p.re);
      if (!m) continue;
      if (p.ageCheck) {
        // Only an age UNDER 18 is a violation. "45 year old client" is this product's
        // core audience and must pass cleanly.
        const age = Number(m[1]);
        if (!Number.isFinite(age) || age >= 18) continue;
        violations.push(new PolicyViolation('block', rule, `stated age ${age} is under 18`));
        continue;
      }
      violations.push(new PolicyViolation('block', rule, `${p.why} ("${m[0]}")`));
    }
  };

  scan(MINOR_PATTERNS, 'minors');
  scan(IMPERSONATION_PATTERNS, 'impersonation');
  scan(DECEPTION_PATTERNS, 'deception');

  for (const name of readBlockedNames(env)) {
    if (text.toLowerCase().includes(name)) {
      violations.push(new PolicyViolation('block', 'blocked-name',
        'a name on SWAN_VIDEO_BLOCKED_NAMES appears in the prompt'));
    }
  }

  const explicit = text.match(REAL_PERSON_HINT);
  if (explicit) {
    flags.push(new PolicyViolation('flag', 'real-person',
      `prompt asks for a depiction of a named individual ("${explicit[1]}") — confirm consent before publishing`));
  } else if (!NAME_FALSE_POSITIVE_GUARD.test(text)) {
    const nameish = text.match(FULL_NAME_HINT);
    if (nameish) {
      flags.push(new PolicyViolation('flag', 'possible-real-person',
        `"${nameish[1]}" looks like a person's name — confirm it is not an identifiable individual`));
    }
  }

  return { allowed: violations.length === 0, violations, flags };
}

/**
 * Throwing wrapper for the generate path. Names EVERY violation, not just the first —
 * a caller who fixes one refusal only to hit the next has learned nothing about the rule.
 */
export function assertPromptAllowed(prompt, env = process.env) {
  const result = evaluatePrompt(prompt, env);
  if (!result.allowed) {
    const err = new Error(
      'Prompt refused by content policy: '
      + result.violations.map(v => `[${v.rule}] ${v.detail}`).join('; '),
    );
    err.code = 'E_POLICY_REFUSED';
    err.violations = result.violations;
    throw err;
  }
  return result;
}

export { PolicyViolation, MINOR_PATTERNS, IMPERSONATION_PATTERNS, DECEPTION_PATTERNS };
