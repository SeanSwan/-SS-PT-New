/**
 * FILE: consentVersion.mjs
 * PURPOSE: One source of truth for the AI consent version, server-side.
 * CREATED: 2026-08-22 — post-ship panel (ox-alpha, GLM 5.3)
 *
 * WHY THIS FILE EXISTS
 * The version lived as a private constant in aiConsentController while the
 * enforcement middleware never referenced it at all. Two consequences, both
 * flagged by the post-ship panel:
 *
 *   1. Owner decision Q5 ("re-consent all — block Coach until re-granted") was
 *      never implemented. The gate checked aiEnabled and withdrawnAt and no
 *      version, so every v1.0 grant kept working and the corrected disclosure
 *      was cosmetic for existing users — the exact population it was written
 *      for.
 *   2. Nothing tied the two declaration sites together, so a future bump in one
 *      place would silently diverge from the other.
 *
 * The frontend counterpart is frontend/src/content/aiConsentCopy.ts
 * (AI_CONSENT_VERSION). These MUST move together — a contract test asserts it.
 */

/** The version of the disclosure currently shown to users. */
export const CURRENT_CONSENT_VERSION = '2.0';

/**
 * Versions the API will ACCEPT on a grant. Older versions stay acceptable as
 * historical records; they are simply no longer CURRENT, which is what the
 * enforcement gate keys on.
 */
export const VALID_CONSENT_VERSIONS = ['1.0', '2.0'];

/**
 * True when a stored grant was captured under the disclosure now in force.
 *
 * A missing/null version counts as STALE. The frontend's first cut required a
 * truthy version before prompting, which skipped re-consent for exactly the
 * legacy records most likely to predate the correction — fail-open on the wrong
 * population.
 */
export function isConsentVersionCurrent(storedVersion) {
  return (storedVersion ?? null) === CURRENT_CONSENT_VERSION;
}
