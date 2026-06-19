/**
 * redactTranscriptPII
 * ===================
 * Deterministically redact PII from a free-text transcript BEFORE it is sent to
 * any cloud LLM (e.g. the Gemini workout parser).
 *
 * RULE 8 (zero PII to LLMs): the redactor itself MUST NOT ship PII to a model —
 * it is purely regex + string replacement (delegates to the deterministic
 * `sanitizeText`, no network/LLM call). It redacts names (via known-participant
 * nameHints + contextual patterns), emails, phones, SSNs, and injection attempts,
 * while INTENTIONALLY preserving injury / pain / movement language the parser
 * needs (sanitizeText flags PHI but does not strip clinical terms — see its body).
 *
 * Use at the transcript→parser boundary; the human-reviewed copy of the transcript
 * (encrypted at rest, role-gated) is NOT redacted — Rule 8 governs LLMs, not the
 * authorized human reviewing their own client's session.
 */

import { sanitizeText } from '../middleware/piiSanitizationMiddleware.mjs';

/**
 * @param {string} transcript - Raw transcript text
 * @param {{ nameHints?: string[] }} [opts] - Known participant names to redact (e.g. the client's name)
 * @returns {{ text: string, detections: Array<object>, hasCriticalPII: boolean }}
 */
export function redactTranscriptPII(transcript, { nameHints = [] } = {}) {
  if (typeof transcript !== 'string' || transcript.length === 0) {
    return { text: typeof transcript === 'string' ? transcript : '', detections: [], hasCriticalPII: false };
  }
  const hints = Array.isArray(nameHints) ? nameHints.filter(Boolean) : [];
  const { sanitized, detections, hasCriticalPII } = sanitizeText(transcript, { nameHints: hints });
  return {
    text: typeof sanitized === 'string' ? sanitized : transcript,
    detections: Array.isArray(detections) ? detections : [],
    hasCriticalPII: Boolean(hasCriticalPII),
  };
}

export default redactTranscriptPII;
