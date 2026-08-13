/**
 * Client free-text sanitizer for LLM prompt interpolation
 * ========================================================
 * Slice 0 (F3, PAIN-CHART-UPGRADE-BLUEPRINT-2026-08-04): client-authored free
 * text (pain descriptions, aggravating movements, relieving factors) is
 * client-writable and flows into coach/workout prompts. Untreated, it is a
 * prompt-injection lane and an unbounded-length lane. The de-identification
 * layer (aiPrivacyService) handles identity; this module handles SHAPE:
 *   - collapse whitespace, strip markup/code fences/role markers
 *   - neutralize instruction-override phrases ("ignore previous instructions")
 *   - hard length cap (default 280 chars)
 *   - optional <client_reported> delimiter wrap so the model treats the text
 *     as quoted data, never as instructions
 *
 * Trainer-authored fields (trainerNotes, aiNotes) are trusted staff input and
 * intentionally NOT routed through the injection strip — cap-only if needed.
 */

const INJECTION_PATTERNS = [
  /```+/g,                                                   // code fences
  /<\|[^|>]*\|>/g,                                           // chat control tokens
  /\b(ignore|disregard|forget|override)\s+(all\s+|any\s+)?(previous|prior|above|earlier|system)\s+(instructions?|prompts?|rules?|messages?)\b/gi,
  // Role markers, anchored to a LINE START.
  //
  // Kimi K3 review 3, finding 1 — verified against this function: the previous
  // pattern was `\b(system|assistant|developer|tool)\s*:` with no anchor, so it
  // fired anywhere in the string and ate ordinary clinical and occupational text:
  //   "Digestive system: sensitive to dairy"      -> "Digestive sensitive to dairy"
  //   "Physician assistant: shift work"           -> "Physician shift work"
  //   "Occupation: software developer: 10h seated"-> "Occupation: software 10h seated"
  // Health intake is precisely where "digestive system:" and an occupation of
  // "developer" or "physician assistant" appear. The onboarding field-dictionary
  // slice newly routes health free text through here, which is what exposed it.
  //
  // A genuine injected role marker sits at a line boundary; a body-system name
  // sits mid-sentence. Anchoring keeps the control and returns the meaning.
  // Applied BEFORE whitespace collapse (see sanitizeClientText) or the anchor
  // would have nothing to bind to.
  /^\s*(system|assistant|developer|tool)\s*:/gim,            // role markers
];

const DEFAULT_MAX_LEN = 280;

/**
 * Sanitize client-authored free text for safe prompt interpolation.
 * Null/undefined/empty → '' (render sites skip empty strings).
 */
export function sanitizeClientText(text, { maxLen = DEFAULT_MAX_LEN } = {}) {
  if (text == null) return '';
  let s = String(text);
  if (!s.trim()) return '';
  // Injection patterns run BEFORE whitespace collapse: the role-marker pattern is
  // anchored to a line start, and collapsing newlines first would leave it nothing
  // to bind to (only the very start of the string would ever match). See the
  // pattern's own note for why the anchor exists.
  for (const pattern of INJECTION_PATTERNS) s = s.replace(pattern, ' ');
  s = s.replace(/<[^>]*>/g, ' ');            // any markup/tag shapes
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length > maxLen) s = `${s.slice(0, maxLen - 1)}…`;
  return s;
}

/**
 * Sanitize and wrap in <client_reported> delimiters. Empty input → ''.
 */
export function wrapClientReported(text, opts) {
  const s = sanitizeClientText(text, opts);
  return s ? `<client_reported>${s}</client_reported>` : '';
}

export default { sanitizeClientText, wrapClientReported };
