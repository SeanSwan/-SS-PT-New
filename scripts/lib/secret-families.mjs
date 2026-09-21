/**
 * secret-families.mjs — THE INDEPENDENT INVENTORY of what the redactor must recognise.
 *
 * WHY THIS EXISTS, AND WHY IT IS SEPARATE FROM THE PATTERNS (round 9d, Astra A5).
 * `secret-shapes.mjs` holds the patterns. `redact-egress.rows.r9.test.mjs` asserted each row
 * "catches its own sample" — but the samples it used are the samples stored BESIDE the
 * patterns, so deleting a row deleted its assertion and its input together. Measured:
 *
 *   SECRET_SHAPES.splice(8,1) -> suite GREEN, 91 passed   (Astra's repro)
 *   ...and 13 of the 20 rows behaved this way.
 *
 * A test whose evidence is stored in the thing under test cannot observe the thing's absence.
 * That is not a weak test, it is a test that CANNOT test. The pathological force is stronger
 * than array `splice`, too: `selfTest()` still returns `true` with a row deleted, and a mutant
 * that redacts only the first 12 characters of a key also passes it (measured — the canary's
 * probe IS a 12-character prefix of the plaintext, so it disappears exactly when the row starts
 * working).
 *
 * So this file is a SECOND, INDEPENDENT statement of the same fact: the FAMILIES of secret this
 * machine has decided it must not emit. It contains no regex and no sample borrowed from the
 * table, and it is not derived from it. A row that is deleted, renamed or duplicated still
 * leaves its family listed here, and the coverage test fails until a human either restores the
 * recognition or amends this inventory — with the amendment itself being the record of the
 * decision.
 *
 * HOW A FAMILY IS MATCHED TO A ROW. By the family's own `marker` — a substring of the token
 * that must appear in the pattern's SOURCE. This is deliberately loose: it does not care what
 * the row is called, where it sits in the table, or how its boundary is spelled, only that
 * SOMETHING in the table still recognises this family. `github_pat_` replaced by a duplicate
 * copy of the `gh[pousr]_` row therefore fails, because the duplicate does not mention
 * `github_pat_` — which is exactly the case Astra reported as staying green.
 *
 * WHAT THIS INVENTORY IS NOT. It is not a threat model and it is not complete by construction;
 * it records the families this project has SEEN leak or has reason to expect. A new family is
 * added here when it is reasoned about, and the coverage test makes that a decision rather than
 * a side effect. Coverage of the UNKNOWN is what the test corpus and the threat model own, not
 * this file.
 */

/**
 * @typedef {object} SecretFamily
 * @property {string} id         stable identifier, used in test names
 * @property {string} marker     substring that must appear in some row's pattern source
 * @property {string} why        what this family is, and why it is on the list
 */

/** @type {SecretFamily[]} */
/**
 * ROWS OUTNUMBER FAMILIES, AND THAT IS EXPECTED — the invariant is one-directional.
 *
 * A family may need several rows (`keyed-numeric-id` now has four: bare, single-quoted, and the
 * two escaped spellings), and a row may belong to a family whose marker it does not literally
 * contain. So the assertion is `every FAMILY is covered by some row` — never `|families| >= |rows|`.
 * An earlier draft asserted the latter and failed on a table that was entirely correct; the
 * direction of coverage is what matters, and asserting the wrong direction is its own small
 * version of the defect this file exists to catch.
 */
export const SECRET_FAMILIES = [
  { id: 'openai-style-key', marker: 'sk-',
    why: 'Provider API key (`sk-…`). Carries its own left boundary because `sk-` is a word-junction in English compounds.' },
  { id: 'stripe-live-key', marker: 'sk_(live|test)_',
    why: 'Stripe secret key, live and test forms.' },
  { id: 'stripe-restricted-key', marker: 'rk_live_',
    why: 'Stripe restricted key — narrower powers, same blast radius if published.' },
  { id: 'stripe-webhook-secret', marker: 'whsec_',
    why: 'Stripe webhook signing secret; forges webhook deliveries.' },
  { id: 'slack-bot-token', marker: 'xoxb-',
    why: 'Slack bot token.' },
  { id: 'google-api-key', marker: 'AIza',
    why: 'Google API key. Left unbounded on purpose — no English word ends in `AIza`.' },
  { id: 'crypto-random-id', marker: 'rnd_',
    why: 'Internal random identifier. Left unbounded on purpose — no English word ends in `rnd_`.' },
  { id: 'github-token', marker: 'gh[pousr]_',
    why: 'GitHub personal/oauth/user/server/refresh tokens. Matches inside `highs_`/`weighp_` without its boundary.' },
  { id: 'github-fine-grained-pat', marker: 'github_pat_',
    why: 'GitHub fine-grained PAT — a DIFFERENT prefix from `gh[pousr]_` and a separate row.' },
  { id: 'payment-provider-secret', marker: 'SG\\.',
    why: 'Provider secret in dotted `<prefix>.<public>.<secret>` form. The marker is the source SPELLING, not the token text — a dot is escaped in a regex, so the family is matched by `SG\\.` and that is what must appear in the row.' },
  { id: 'linear-api-key', marker: 'lin_api_',
    why: 'Linear API key. Matches inside `displin_api_` without its boundary.' },
  { id: 'jwt', marker: 'eyJ',
    why: 'JWT: base64url header beginning `eyJ`. Matches inside `theyJhbGci` without its boundary.' },
  { id: 'http-bearer', marker: 'Bearer',
    why: '`Authorization: Bearer <token>`. Must also fire in a SERIALISED body, where it is followed by a literal `\\n`.' },
  { id: 'telegram-bot-token', marker: '\\d{8,}:',
    why: '`<bot id>:<secret>` — the class whose `\\b` right edge leaked trailing hyphens. Marked by its LEADING shape rather than its placeholder: the placeholder is the replacement, not the pattern, and an inventory that matched on the replacement would be matching the same file it is auditing from the other end.' },
  { id: 'private-key-pem', marker: 'PRIVATE KEY-----',
    why: 'PEM private key block; the widest secret here and the only multi-line one.' },
  { id: 'database-url', marker: 'postgres',
    why: 'Connection URL with embedded credentials for postgres/redis/mongo/mysql/amqp. Marked by one member of its alternation; the family is the shape, not the scheme list.' },
  { id: 'email-address', marker: '@[a-z0-9.-]+',
    why: 'Email address — identity, not a credential, but identity is the 2026-08-22 incident class.' },
  { id: 'phone-number', marker: '\\d{3}\\)?',
    why: 'North-American phone number, the other identity shape.' },
  { id: 'keyed-numeric-id', marker: 'chat_id',
    why: 'A numeric id under a name that announces it as an id (Telegram `chat_id` etc). Marked by the canonical name: any row that still recognises the family must name it.' },
  { id: 'bare-numeric-id', marker: '\\d{10,}',
    why: 'A 10+ digit run with no key — ids and large opaque numbers, above the commit-SHA range.' },
];

/**
 * Families in the inventory with NO row that can recognise them.
 *
 * THIS IS THE DELETION DETECTOR. `SECRET_SHAPES` alone cannot report its own absence — the
 * whole point of A5 — so coverage is asserted against this file instead. A row deleted,
 * renamed past recognition, or replaced by a duplicate of a different family shows up here.
 *
 * @param {Array<[RegExp, string, string]>} rows the table under test
 * @returns {Array<{id: string, marker: string, why: string}>} uncovered families
 */
export function uncoveredFamilies(rows) {
  const sources = rows.map(([re]) => re.source);
  return SECRET_FAMILIES.filter((f) => !sources.some((s) => s.includes(f.marker)));
}

/**
 * Rows whose pattern is a DUPLICATE of another row's pattern.
 *
 * A duplicate is not automatically wrong — but it is how a family silently disappears while
 * the row COUNT stays constant, which is how Astra's `github_pat_` -> copy-of-`gh[pours]_`
 * replacement stayed green at 93/93. Reported rather than asserted so the caller can decide:
 * the row suites require that no family be uncovered, which is the property that matters.
 *
 * @param {Array<[RegExp, string, string]>} rows
 * @returns {string[]} pattern sources appearing more than once
 */
export function duplicatePatterns(rows) {
  const seen = new Map();
  for (const [re] of rows) seen.set(re.source, (seen.get(re.source) || 0) + 1);
  return [...seen.entries()].filter(([, n]) => n > 1).map(([src]) => src);
}
