/**
 * redactionRules.mjs — the single source of truth for LOG redaction shapes.
 * ==========================================================================
 * WHY THIS MODULE EXISTS (SWA-71, 2026-07-28):
 * This backend had two independent loggers with two independently-maintained redaction lists:
 *
 *   - `utils/logger.mjs`                    (~2841 call sites) — API-key shapes only
 *   - `utils/monitoring/piiSafeLogging.mjs` (~231 call sites)  — keys + PII
 *
 * They drifted, and the drift was the bug. Verified by execution: the MAIN logger — the one with
 * 12x the reach — redacted API keys but passed **email, SSN, phone, and database credentials**
 * straight through. `logger.error(err)` on a Postgres connection failure writes the connection
 * password into the logs.
 *
 * Two lists maintained by hand will drift again. One list cannot.
 *
 * SCOPE — this module governs LOG output only. It is deliberately NOT shared with:
 *   - `scripts/context-gateway/src/egress.mjs` — content crossing to an external LLM. Different
 *     threat model, different tolerance for over-redaction, and it lives outside `backend/`.
 *   - `services/ai/phiScanner.mjs` — classifies medical PHI in user messages and uses fuzzy
 *     matching. Far too expensive for a logging hot path.
 * Those serving different jobs is correct; the two LOGGERS serving the same job differently was not.
 *
 * ── DESIGN RULES, all load-bearing ──────────────────────────────────────────────────────────
 *
 * 1. EVERY QUANTIFIER IS UPPER-BOUNDED. Regex backtracking is superlinear in the length of one
 *    contiguous run, and this runs in front of ~3000 log call sites. An unbounded quantifier over
 *    a punctuation-rich line is a self-inflicted DoS on the logging path.
 *
 * 2. ORDER IS LOAD-BEARING — specific before general. EMAIL must come AFTER the credential-URL
 *    rules: a connection string embeds a `password@hostname` segment that EMAIL matches. With
 *    EMAIL first, scrubbing a connection string removed the password but replaced only that inner
 *    segment — mislabeling it as an email while the scheme and username survived, partially
 *    disclosing the connection target. Keep credential URLs ahead of EMAIL when adding rules.
 *
 * 3. A BARE 10-DIGIT RUN IS NOT A PHONE NUMBER. That pattern also eats Sequelize migration
 *    timestamps, epoch millis, and long numeric IDs. The same over-match was found elsewhere in
 *    this repo silently replacing migration filenames with a placeholder. In logs a digit run is
 *    far more likely to be an identifier than a phone number, and destroying identifiers guts the
 *    debuggability logs exist for. Phone matching REQUIRES separators or a +1 prefix.
 *
 * 4. IDs ARE PRESERVED ON PURPOSE. User IDs, plan IDs, and commit SHAs are the allowed identifier
 *    form (Rule 8: client IDs only, names mapped client-side) and are what make a log actionable.
 *
 * @module utils/redactionRules
 */

/**
 * Ordered redaction rules. Applied in sequence, per line — see design rules 1 and 2.
 * @type {ReadonlyArray<[string, RegExp]>}
 */
export const LOG_REDACTION_RULES = Object.freeze([
  // ── Credential / key shapes (most specific first) ──
  ['JWT', /\beyJ[A-Za-z0-9_-]{8,4096}\.[A-Za-z0-9_-]{8,4096}\.[A-Za-z0-9_-]{8,4096}/g],
  ['STRIPE', /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,256}/g],
  ['STRIPE_WHSEC', /\bwhsec_[A-Za-z0-9]{16,256}/g],
  ['ANTHROPIC', /\bsk-ant-[A-Za-z0-9_-]{20,256}/g],
  ['OPENAI', /\bsk-(?:or-)?(?:proj-|v1-)?[A-Za-z0-9_-]{20,256}/g],
  ['GOOGLE', /\bAIza[0-9A-Za-z_-]{30,120}/g],
  ['SLACK', /\bxox[baprs]-[A-Za-z0-9-]{10,256}/g],
  ['GITHUB', /\bgh[pousr]_[A-Za-z0-9]{36,256}/g],
  ['GITHUB_PAT', /\bgithub_pat_[A-Za-z0-9_]{22,256}/g],
  ['AWS_AKID', /\bAKIA[0-9A-Z]{16}\b/g],
  ['TELEGRAM', /\b\d{8,10}:[A-Za-z0-9_-]{35}\b/g],

  // ── Credential URLs — MUST precede EMAIL (design rule 2) ──
  ['DB_URL', /\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s:@/]{1,128}:[^\s:@/]{1,256}@[^\s/]{1,256}/g],
  ['HTTP_AUTH_URL', /\bhttps?:\/\/[^\s:@/]{1,128}:[^\s:@/]{1,256}@[^\s/]{1,256}/g],

  // ── PII (general — must come last) ──
  ['EMAIL', /\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,255}\.[A-Za-z]{2,24}\b/g],
  ['SSN', /\b\d{3}-\d{2}-\d{4}\b/g],
  // Separators or +1 required — see design rule 3.
  ['PHONE', /(?:\+1[-.\s])?\(\d{3}\)[-.\s]?\d{3}[-.\s]?\d{4}\b|\b(?:\+1[-.\s])?\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g]
]);

/** Multi-line PEM block — the only rule that may span newlines, so it runs before the per-line pass. */
export const PRIVATE_KEY_RULE =
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----[\s\S]{1,8192}?-----END (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g;

/**
 * Replace high-confidence PII/secret shapes in a string with typed placeholders.
 *
 * NEVER THROWS. A redaction failure must not be able to suppress a log line — losing the log
 * entirely is worse than logging it unredacted, and an observability helper that can throw into
 * its caller is the defect class this whole effort exists to remove.
 *
 * @param {*} input - redacted only when a non-empty string; anything else passes through unchanged
 * @returns {*} the redacted string, or the input untouched
 */
export function redactLogString(input) {
  try {
    if (typeof input !== 'string' || input.length === 0) return input;

    // PEM blocks span lines, so they are handled before the per-line pass. Everything else runs
    // per line to bound the unit of regex work even if a looser pattern is added later.
    const afterKeys = input.replace(PRIVATE_KEY_RULE, '<REDACTED-PRIVATE_KEY>');

    return afterKeys
      .split('\n')
      .map((line) => {
        let out = line;
        for (const [kind, pattern] of LOG_REDACTION_RULES) {
          out = out.replace(pattern, `<REDACTED-${kind}>`);
        }
        return out;
      })
      .join('\n');
  } catch {
    return input;
  }
}
