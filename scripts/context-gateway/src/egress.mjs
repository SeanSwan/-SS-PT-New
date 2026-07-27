/**
 * egress.mjs — inline-secret redaction on content crossing to a provider (threat T3, content half).
 * ===================================================================================================
 * safeRead blocks secret-bearing PATHS (DENY patterns); this blocks secret VALUES that live inside an
 * otherwise-innocent tracked file (a hardcoded key in a committed script, a JWT pasted into a doc).
 * Every evidence window and every tool result runs through redactSecrets BEFORE it can egress, so a
 * value the path-filter could not know about never reaches the model. Counts are reported (never the
 * value) so the receipt shows redaction happened without re-leaking it (Rule 59).
 *
 * High-confidence SHAPES only — matching key/token/PEM/DB-URL formats, not generic "password =" code,
 * to avoid mangling ordinary source. Pure, synchronous, dependency-free.
 *
 * @module context-gateway/egress
 */

// Every quantifier here is UPPER-BOUNDED. An unbounded `{n,}` or lazy `*?` over a delimiter-poor
// input backtracks O(n²) and can hang the default compile lane for minutes on one long line
// (hostile pass 4/5: EMAIL, then JWT + PRIVATE_KEY were each this class). Real secrets fit the caps.
const RULES = [
  // \b anchor: a real JWT is always preceded by a boundary (space/quote/=); this collapses an
  // `eyJeyJeyJ…` attack (no interior boundaries) to a single start position, killing the O(n·cap).
  ['JWT', /\beyJ[A-Za-z0-9_-]{8,4096}\.[A-Za-z0-9_-]{8,4096}\.[A-Za-z0-9_-]{8,4096}/g],
  ['PRIVATE_KEY', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----[\s\S]{1,8192}?-----END (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g],
  ['STRIPE', /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/g],
  ['STRIPE_WHSEC', /\bwhsec_[A-Za-z0-9]{16,}/g],
  ['OPENAI', /\bsk-(?:or-)?(?:proj-|v1-)?[A-Za-z0-9_-]{20,}/g],
  ['GOOGLE', /\bAIza[0-9A-Za-z_-]{30,120}/g],
  ['SLACK', /\bxox[baprs]-[A-Za-z0-9-]{10,}/g],
  ['TELEGRAM', /\b\d{8,10}:[A-Za-z0-9_-]{35}\b/g],
  ['DB_URL', /\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s:@/]+:[^\s:@/]+@[^\s/]+/g],
  ['HTTP_AUTH_URL', /\bhttps?:\/\/[^\s:@/]+:[^\s:@/]+@[^\s/]+/g], // user:pass@host basic-auth (finding 4)
  ['AWS_AKID', /\bAKIA[0-9A-Z]{16}\b/g],
  ['GITHUB', /\bgh[pousr]_[A-Za-z0-9]{36,}/g],
  ['GITHUB_PAT', /\bgithub_pat_[A-Za-z0-9_]{22,}/g], // fine-grained PATs (finding 10)
  ['ANTHROPIC', /\bsk-ant-[A-Za-z0-9_-]{20,}/g],
  // PII (Rule 8 is categorical — zero PII to external LLMs). High-confidence shapes only.
  // Quantifiers are RFC-BOUNDED ({1,64}@{1,255}.{2,24}), NOT open `+`: an unbounded class with
  // boundary punctuation backtracks O(n²) and hung the default compile lane for ~minutes on a long
  // punctuated line (hostile pass 4, finding 1 — a ReDoS the pass-3 EMAIL rule itself introduced).
  // The negative lookahead skips retina/asset "domains" (logo@2x.png) to cut over-redaction.
  ['EMAIL', /\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,255}\.(?!png|jpe?g|gif|webp|svg|ico|css|s?css|js|mjs|tsx?|jsx?|json|html?|woff2?|ttf|map)[A-Za-z]{2,24}\b/gi],
  ['SSN', /\b\d{3}-\d{2}-\d{4}\b/g],
];

/**
 * Redact inline secret VALUES from a string.
 * @returns {{ text: string, redactions: number, kinds: string[] }}
 */
const PK_RULE = RULES.find(([k]) => k === 'PRIVATE_KEY')[1];
const LINE_RULES = RULES.filter(([k]) => k !== 'PRIVATE_KEY');

export function redactSecrets(input) {
  // Defense-in-depth against a FUTURE unbounded rule: regex backtracking is superlinear in the
  // length of one contiguous run, so the single-line rules run PER LINE — bounding the unit of work
  // even if someone later adds an unbounded quantifier. PRIVATE_KEY is the only multi-line secret, so
  // it runs once over the whole text (its gap is bounded) before the per-line pass.
  let redactions = 0;
  const kinds = new Set();
  const afterPk = String(input).replace(PK_RULE, () => { redactions += 1; kinds.add('PRIVATE_KEY'); return '<REDACTED-PRIVATE_KEY>'; });
  const text = afterPk.split('\n').map((line) => {
    let t = line;
    for (const [kind, re] of LINE_RULES) {
      t = t.replace(re, () => { redactions += 1; kinds.add(kind); return `<REDACTED-${kind}>`; });
    }
    return t;
  }).join('\n');
  return { text, redactions, kinds: [...kinds] };
}
