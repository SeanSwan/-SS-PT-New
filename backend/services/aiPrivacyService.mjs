/**
 * ============================================================================
 * FILE: aiPrivacyService.mjs
 * PURPOSE: Identity-blind AI — strips client identity from messages while
 *          preserving all fitness/medical data for NASM-quality workouts.
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-27
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Implements bidirectional PII stripping for the AI chat pipeline.
 * - OUTBOUND: Trainer types "How is Jackie's knee?" → AI sees "How is [Client #61]'s knee?"
 * - INBOUND: AI response scrubbed for any hallucinated/leaked client names
 *
 * PRIVACY MODEL: "Body-aware, identity-blind"
 * STRIP: name, email, phone, address, occupation, emergency contacts
 * KEEP: age, gender, weight, height, blood type, goals, PAR-Q, pain chart,
 *       form analysis, movement analysis, health concerns, injury history,
 *       workout history, measurements, macros, equipment, gamification
 *
 * HOW IT FITS IN THE APP:
 * aiChatRoutes.mjs → stripIdentityFromMessage() → AI provider
 * AI provider → stripIdentityFromResponse() → user sees response
 */
import logger from '../utils/logger.mjs';
import { piiManager } from './privacy/PIIManager.mjs';
import { sanitizeText } from '../middleware/piiSanitizationMiddleware.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: Client Name Cache
// PURPOSE: Cache client names for the current request to enable
//          name→ID replacement without extra DB queries per message
// ─────────────────────────────────────────────────────────────

/**
 * Fetch the target client's identity fields (name, email, phone) for stripping.
 * Only fetches identity — never returns health/fitness data.
 */
async function fetchClientIdentity(userId, sequelize) {
  try {
    const results = await sequelize.query(
      `SELECT "firstName", "lastName", email, phone
       FROM "Users" WHERE id = :userId LIMIT 1`,
      { replacements: { userId }, type: sequelize.QueryTypes.SELECT }
    );
    if (results.length === 0) return null;
    return results[0];
  } catch (err) {
    logger.warn('[AIPrivacy] Failed to fetch client identity for stripping:', err.message);
    return null;
  }
}

/**
 * Build a list of identity terms to search for and replace.
 * Includes: full name, first name, last name, email, phone, and common variations.
 */
function buildIdentityTerms(identity) {
  if (!identity) return [];
  const terms = [];

  const first = (identity.firstName || '').trim();
  const last = (identity.lastName || '').trim();
  const email = (identity.email || '').trim();
  const phone = (identity.phone || '').trim();

  // Full name variations (most specific first to avoid partial replacements)
  if (first && last) {
    terms.push(
      `${first} ${last}`,       // "Jackie Smith"
      `${last}, ${first}`,      // "Smith, Jackie"
      `${first}'s`,             // "Jackie's" (possessive)
      `${last}'s`,              // "Smith's" (possessive)
    );
  }

  // Individual names (only if 3+ chars to avoid false positives like "Jo" or "Al")
  if (first && first.length >= 3) terms.push(first);
  if (last && last.length >= 3) terms.push(last);

  // Email and phone
  if (email) terms.push(email);
  if (phone) {
    terms.push(phone);
    // Also catch formatted variations: (555) 123-4567, 555-123-4567, 5551234567
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 10) {
      terms.push(digits);
      terms.push(`(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`);
      terms.push(`${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`);
    }
  }

  // Filter out empty strings and deduplicate
  return [...new Set(terms.filter(t => t && t.length > 0))];
}

// ─────────────────────────────────────────────────────────────
// SECTION: Outbound Stripping (Trainer Message → AI)
// PURPOSE: Replace client identity references with anonymous ID
//          before the message reaches any AI provider
// ─────────────────────────────────────────────────────────────

/**
 * Strip client identity from a trainer's message before sending to AI.
 * Replaces names, emails, phones with [Client #ID].
 *
 * @param {string} message - The raw trainer message
 * @param {number} targetUserId - The client's user ID
 * @param {object} sequelize - Sequelize instance for DB queries
 * @returns {{ sanitizedMessage: string, identitiesStripped: number, strippedTerms: string[] }}
 */
export async function stripIdentityFromMessage(message, targetUserId, sequelize) {
  if (!message || !targetUserId) {
    return { sanitizedMessage: message || '', identitiesStripped: 0, strippedTerms: [] };
  }

  const identity = await fetchClientIdentity(targetUserId, sequelize);
  const terms = buildIdentityTerms(identity);
  const clientTag = `[Client #${targetUserId}]`;

  let sanitized = message;
  let count = 0;
  const stripped = [];

  // Replace identity terms (case-insensitive) — longest first to prevent partial matches
  const sortedTerms = terms.sort((a, b) => b.length - a.length);
  for (const term of sortedTerms) {
    // Escape regex special chars
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    const before = sanitized;
    sanitized = sanitized.replace(regex, (match) => {
      // Preserve possessive: "Jackie's" → "[Client #61]'s"
      if (match.endsWith("'s")) {
        return `${clientTag}'s`;
      }
      return clientTag;
    });
    if (sanitized !== before) {
      count++;
      stripped.push(term);
    }
  }

  // Also run PIIManager for emails, phones, SSNs, credit cards that might not be the client's
  try {
    const piiResult = await piiManager.sanitizeContent(sanitized, { context: 'ai_outbound' });
    if (piiResult.piiRemoved > 0) {
      sanitized = piiResult.sanitizedContent;
      count += piiResult.piiRemoved;
    }
  } catch (piiErr) {
    logger.warn('[AIPrivacy] PIIManager sanitization failed (non-fatal):', piiErr.message);
  }

  if (count > 0) {
    logger.info('[AIPrivacy] Stripped %d identity references from outbound message for Client #%d', count, targetUserId);
  }

  return { sanitizedMessage: sanitized, identitiesStripped: count, strippedTerms: stripped };
}

/**
 * Generic outbound PII scrub (emails, phones, SSNs, credit cards) that does NOT
 * require a target client identity. Used when an outbound message has no selected
 * client to name-map but must still never carry raw contact PII to an external LLM
 * (Rule 8) — e.g. a trainer typing "call Jane at 555-123-4567" in a general
 * conversation. Callers should treat a throw as fail-closed and withhold the message.
 *
 * @param {string} text - outbound text to scrub
 * @returns {{ sanitizedText: string, piiRemoved: number }}
 */
export async function scrubGenericPII(text) {
  if (!text) return { sanitizedText: text || '', piiRemoved: 0 };
  const piiResult = await piiManager.sanitizeContent(text, { context: 'ai_outbound' });
  return {
    sanitizedText: piiResult.sanitizedContent ?? text,
    piiRemoved: piiResult.piiRemoved || 0,
  };
}

// ─────────────────────────────────────────────────────────────
// SECTION: Inbound Stripping (AI Response → User)
// PURPOSE: Scrub AI responses in case the model hallucinated
//          or echoed back any client identity information
// ─────────────────────────────────────────────────────────────

/**
 * Strip client identity from AI response before showing to user.
 * Catches cases where AI might echo back a name from conversation history
 * or hallucinate identity details.
 *
 * @param {string} response - The AI's response text
 * @param {number} targetUserId - The client's user ID
 * @param {object} sequelize - Sequelize instance for DB queries
 * @returns {{ sanitizedResponse: string, identitiesStripped: number }}
 */
export async function stripIdentityFromResponse(response, targetUserId, sequelize) {
  if (!response || !targetUserId) {
    return { sanitizedResponse: response || '', identitiesStripped: 0 };
  }

  const identity = await fetchClientIdentity(targetUserId, sequelize);
  const terms = buildIdentityTerms(identity);
  const clientTag = `Client #${targetUserId}`;

  let sanitized = response;
  let count = 0;

  // Replace identity terms (case-insensitive) — longest first
  const sortedTerms = terms.sort((a, b) => b.length - a.length);
  for (const term of sortedTerms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    const before = sanitized;
    sanitized = sanitized.replace(regex, (match) => {
      if (match.endsWith("'s")) {
        return `${clientTag}'s`;
      }
      return clientTag;
    });
    if (sanitized !== before) count++;
  }

  // Also run PIIManager for stray PII in AI responses
  try {
    const piiResult = await piiManager.sanitizeContent(sanitized, { context: 'ai_inbound' });
    if (piiResult.piiRemoved > 0) {
      sanitized = piiResult.sanitizedContent;
      count += piiResult.piiRemoved;
    }
  } catch (piiErr) {
    logger.warn('[AIPrivacy] PIIManager response sanitization failed (non-fatal):', piiErr.message);
  }

  if (count > 0) {
    logger.info('[AIPrivacy] Stripped %d identity references from AI response for Client #%d', count, targetUserId);
  }

  return { sanitizedResponse: sanitized, identitiesStripped: count };
}

// ─────────────────────────────────────────────────────────────
// SECTION: Trainer Notes Stripping
// PURPOSE: Strip PII from trainer notes before including in AI context
// WHY: Trainers may write "Sarah called re: knee pain" in notes
// ─────────────────────────────────────────────────────────────

/**
 * Strip identity from trainer notes content before AI enrichment.
 * Used by enrichWithUserData() for client notes (data source #10).
 *
 * @param {string} noteContent - Raw trainer note text
 * @param {number} targetUserId - Client ID to replace names with
 * @param {object} identity - Pre-fetched identity object (optional, avoids extra query)
 * @returns {string} Sanitized note text
 */
const FREE_TEXT_WITHHELD_PLACEHOLDER = '[clinical note withheld — client identity unavailable for redaction]';

export function stripIdentityFromNotes(noteContent, targetUserId, identity = null) {
  if (!noteContent) return noteContent;

  // FAIL-CLOSED on non-string input (Kimi PII-to-LLM SEV-2, SWA-129). A truthy
  // non-string (an array/object from a client-authored JSON column like
  // masterPromptJson.goals.notes) would hit `.replace()` in the term loop and
  // throw an uncaught TypeError — crashing the AI request — or, if a caller
  // stringified it first elsewhere, leak raw PII. Neither is acceptable: a
  // value we cannot deterministically scrub must never reach an LLM. Withhold.
  if (typeof noteContent !== 'string') {
    return FREE_TEXT_WITHHELD_PLACEHOLDER;
  }

  // FAIL-CLOSED (Rule 8): with no identity map we cannot know the client's name,
  // so we cannot reliably strip it from free text — and a free-text clinical note
  // must NEVER reach an LLM raw. Withhold it. Non-identity derived signals (e.g.
  // detected condition flags computed separately by the caller) still reach the
  // model. This replaces the previous fail-OPEN behavior (returned raw text) that
  // leaked names when the identity load threw or returned 0 rows (dual users/"Users"
  // drift). [Hostile-review PRIV-1/SEC-1/PII-1, 2026-06-19]
  if (!identity) {
    return FREE_TEXT_WITHHELD_PLACEHOLDER;
  }

  let sanitized = noteContent;
  const clientTag = `[Client #${targetUserId}]`;
  const terms = buildIdentityTerms(identity);
  const sortedTerms = terms.sort((a, b) => b.length - a.length);
  for (const term of sortedTerms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    sanitized = sanitized.replace(regex, clientTag);
  }

  // Defense-in-depth (SEC-2): the known-client term list cannot catch THIRD-PARTY
  // names co-mentioned in clinical narratives ("Sarah called re: knee"), or stray
  // emails/phones. sanitizeText is a deterministic, no-network scrub that preserves
  // clinical/injury/movement language (same scrubber the workout parser trusts via
  // redactTranscriptPII).
  try {
    const result = sanitizeText(sanitized, { nameHints: terms });
    if (result && typeof result.sanitized === 'string') sanitized = result.sanitized;
  } catch (err) {
    logger.warn('[AIPrivacy] stripIdentityFromNotes fallback scrub failed (non-fatal):', err?.message);
  }

  return sanitized;
}
