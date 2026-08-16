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
 * shortcut: it would have let a "policy filter runs on every prompt" claim be
 * technically true while checking nothing the licensor was told about.
 *
 * It is also NOT a guarantee. A text filter catches stated intent, not disguised
 * intent, and anyone determined to phrase around it will. Control 6 — a human
 * reviews every asset before it is published or delivered — is the real backstop,
 * and this is the cheap first line that stops the obvious and the accidental.
 *
 * ── WHY TWO SEVERITIES ──────────────────────────────────────────────────────
 * A filter that only blocks is a filter people route around. Some patterns are
 * unambiguous (a synthetic depiction of a child); some are merely suspicious (a
 * capitalised full name, which is as likely to be a coach's own name as a
 * celebrity's). Blocking the second class in a personal-training product would
 * produce constant false refusals and train the operator to disable the filter —
 * which is strictly worse than flagging.
 *
 *   BLOCK  refuse the run outright
 *   FLAG   allow, but mark the asset as requiring explicit human acknowledgement
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
 * SwanStudios legitimately trains youth, so this deliberately targets SYNTHETIC
 * DEPICTION rather than the words themselves. A coach writing "youth bootcamp" in a
 * program description is not touching this file; a prompt asking a model to render a
 * child is. No legitimate use of a video generator here requires producing a
 * synthetic minor, so there is no cost to refusing and no carve-out worth the risk.
 */
const MINOR_PATTERNS = [
  { re: /\b(child|children|kid|kids|toddler|infant|baby|babies)\b/i, why: 'depiction of a child' },
  { re: /\b(teen|teens|teenager|teenaged|adolescent|minor|minors|preteen|pre-teen)\b/i, why: 'depiction of a minor' },
  { re: /\b(boy|girl|schoolboy|schoolgirl|student)\b/i, why: 'possible depiction of a minor' },
  { re: /\b(\d{1,2})[\s-]*(?:year|yr)s?[\s-]*old\b/i, why: 'explicit age', ageCheck: true },
  { re: /\b(elementary|middle school|high school|kindergarten|preschool)\b/i, why: 'school-age context' },
];

/** IMPERSONATION / SYNTHETIC LIKENESS — hard block. */
const IMPERSONATION_PATTERNS = [
  { re: /\b(deepfake|deep fake|face[\s-]?swap|faceswap)\b/i, why: 'synthetic likeness technique' },
  { re: /\b(impersonat\w*|pretending to be|posing as|disguised as)\b/i, why: 'impersonation' },
  { re: /\b(looks? like|resembl\w+|in the likeness of|modell?ed (?:on|after))\s+(?:a\s+)?(?:famous|celebrity|celebrities)/i, why: 'celebrity likeness' },
  { re: /\b(celebrity|celebrities|famous (?:actor|actress|athlete|singer|politician))\b/i, why: 'celebrity depiction' },
];

/** DECEPTION — hard block. Content whose purpose is to be mistaken for real. */
const DECEPTION_PATTERNS = [
  { re: /\b(fake|forged|counterfeit)\s+(news|report|document|certificate|id|licen[sc]e|passport|receipt|invoice)\b/i, why: 'forged document or record' },
  { re: /\b(breaking news|news (?:report|anchor|broadcast)|press conference)\b/i, why: 'simulated news framing' },
  { re: /\b(police|government|official|federal|court)\s+(?:notice|order|statement|announcement|seal)\b/i, why: 'simulated official communication' },
  { re: /\b(medical|clinical|scientific)\s+(?:proof|evidence|study results?)\b/i, why: 'fabricated evidence claim' },
];

/**
 * REAL PEOPLE — flag, not block.
 *
 * A capitalised full name in a fitness prompt is far more often a trainer or a client
 * than a public figure. Blocking would refuse constantly and get the filter switched
 * off; flagging routes it to the human review that already exists.
 *
 * An explicit denylist (SWAN_VIDEO_BLOCKED_NAMES) hard-blocks named individuals when
 * there is a specific reason to.
 */
const REAL_PERSON_HINT = /\b(?:photo|video|footage|portrait|image|likeness) of ([A-Z][a-z]+ [A-Z][a-z]+)\b/;
const FULL_NAME_HINT = /\b([A-Z][a-z]{2,} [A-Z][a-z]{2,})\b/;

/** Words that make a full-name match almost certainly benign in this product. */
const NAME_FALSE_POSITIVE_GUARD = /\b(New York|Los Angeles|San Diego|United States|Swan Studios|SwanStudios|Personal Training|Golden Hour|Blue Hour)\b/;

function readBlockedNames(env) {
  return String(env.SWAN_VIDEO_BLOCKED_NAMES || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

/**
 * Evaluate a prompt.
 *
 * @returns {{allowed:boolean, violations:PolicyViolation[], flags:PolicyViolation[]}}
 */
export function evaluatePrompt(prompt, env = process.env) {
  const text = String(prompt ?? '');
  const violations = [];
  const flags = [];

  const scan = (patterns, rule) => {
    for (const p of patterns) {
      const m = text.match(p.re);
      if (!m) continue;
      if (p.ageCheck) {
        // Only an age UNDER 18 is a violation. "45 year old client" is the core
        // audience of this product and must pass cleanly.
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
      violations.push(new PolicyViolation('block', 'blocked-name', 'a name on SWAN_VIDEO_BLOCKED_NAMES appears in the prompt'));
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
 * Throwing wrapper for the generate path. Names every violation, not just the first —
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
