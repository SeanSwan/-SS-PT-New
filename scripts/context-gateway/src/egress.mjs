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

const RULES = [
  ['JWT', /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g],
  ['PRIVATE_KEY', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g],
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
  ['EMAIL', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g],
  ['SSN', /\b\d{3}-\d{2}-\d{4}\b/g],
];

/**
 * Redact inline secret VALUES from a string.
 * @returns {{ text: string, redactions: number, kinds: string[] }}
 */
export function redactSecrets(input) {
  let text = String(input);
  let redactions = 0;
  const kinds = new Set();
  for (const [kind, re] of RULES) {
    text = text.replace(re, () => { redactions += 1; kinds.add(kind); return `<REDACTED-${kind}>`; });
  }
  return { text, redactions, kinds: [...kinds] };
}
