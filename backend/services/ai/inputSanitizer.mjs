/**
 * Input Sanitizer — Prompt Injection Prevention
 * ===============================================
 * Strips injection attempts from user input before it reaches the AI.
 * Part of the God-Level command pipeline middleware chain.
 *
 * Pipeline position: InputSanitizer → PhiScanner → IntentClassifier → ...
 */
import logger from '../../utils/logger.mjs';

// ── Injection Patterns ──────────────────────────────────────────────────────

const INJECTION_PATTERNS = [
  // System prompt override attempts
  /\b(ignore|disregard|forget)\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|context)\b/i,
  // Persona reassignment — requires an article AND a noun, i.e. "you are now a pirate".
  //
  // WHY NOT the bare /\byou\s+are\s+now\b/: it matched "you are now ready for phase 2", which is
  // textbook NASM OPT progression language, and any threat in this list drives
  // `hasCriticalPII = true` in piiSanitizationMiddleware → HTTP 400. A trainer telling a client
  // they had advanced a phase got a SECURITY ERROR. Verified by execution 2026-07-28.
  // The negative lookahead protects the state-of-being sense ("you are now ready/able/cleared"),
  // which is the sense this product actually uses.
  /\byou\s+are\s+now\s+(?:a|an|the)\s+(?!ready\b|able\b|cleared\b|eligible\b)[a-z]/i,
  // Prompt/persona replacement. Split into two patterns because "prompt", "instruction" and
  // "role" are ORDINARY WORDS IN THIS PRODUCT — "new instruction: rest 90s between sets" and
  // "the trainer role is filled" are things a trainer types. The original single pattern made
  // `(system\s+)?` optional, so bare "new instruction" was flagged, and every flag becomes an
  // HTTP 400 in piiSanitizationMiddleware. Found by an expanded false-positive corpus.
  //
  // 1. Ambiguous nouns require an AI/system qualifier to count.
  /\b(new|override|replace|change)\s+(?:the\s+|your\s+|my\s+)?(?:system|assistant|ai|model|chatbot)\s+(?:prompt|instruction|persona|role)s?\b/i,
  // 2. "persona" is unambiguous here — it does not appear in coaching language — so it counts
  //    bare. The optional article also closes "override THE persona", which the original pattern
  //    missed because it allowed no article at all.
  /\b(new|override|replace|change)\s+(?:the\s+|your\s+|my\s+)?personas?\b/i,
  // Role hijack — must name an AI/system persona. "act as a spotter" is ordinary coaching
  // language in a training app and was being hard-blocked; the injection form names what the
  // model should become, not what a human should do.
  /\bact\s+as\s+(?:if\s+you\s+are\s+)?(?:a|an|the)?\s*(?:ai|assistant|model|chatbot|bot|system|admin|administrator|developer|root|superuser|dan|jailbroken|unrestricted|unfiltered)\b/i,
  // Delimiter injection
  /```\s*(system|assistant|function|tool)\b/i,
  /<\|?(system|im_start|im_end|endoftext)\|?>/i,
  /\[INST\]|\[\/INST\]/i,
  // Code execution attempts
  /\b(eval|exec|import|require|__proto__|constructor)\s*\(/i,
  // JSON/object injection into prompts
  /\{\s*"(role|system|function_call|tool_calls)"\s*:/i,
  // SQL injection (shouldn't reach AI but defense in depth)
  /(\b(DROP|DELETE|ALTER|TRUNCATE)\s+(TABLE|DATABASE|INDEX)\b)/i,
];

// Words/phrases that are suspicious but need context (lower confidence)
const SOFT_PATTERNS = [
  /\bpretend\s+to\s+be\b/i,
  /\bdo\s+not\s+follow\b/i,
  /\bjailbreak\b/i,
  /\bDAN\s+mode\b/i,
];

/**
 * Sanitize user input for prompt injection.
 * Returns cleaned text + any detected threats.
 *
 * @param {string} input - Raw user input (text or transcribed voice)
 * @returns {{ sanitized: string, threats: string[], blocked: boolean }}
 */
export function sanitizeInput(input) {
  if (!input || typeof input !== 'string') {
    return { sanitized: '', threats: [], blocked: false };
  }

  const threats = [];
  // Match against a NORMALIZED copy so trivial obfuscation does not walk past the patterns:
  // NFKC folds compatibility characters, and the zero-width strip removes the invisible
  // separators used to break up a keyword ("ignore​all previous instructions" evaded every
  // pattern before this). Homoglyph substitution (Cyrillic о for Latin o) is folded where NFKC
  // covers it. Detection runs on the normalized text; the SANITIZED OUTPUT is built from the
  // normalized text too, so a stripped match cannot leave the original fragment behind.
  //
  // Deliberately NOT attempted: decoding base64 or collapsing letter-spacing ("i g n o r e").
  // Those are an endless regex arms race, and this layer is defense-in-depth — the real control
  // is the command registry's explicit schemas plus the approval gates, not this filter. Chasing
  // them here would add false positives (base64 appears in legitimate payloads) for little gain.
  // Escapes, not literal characters: written literally these are invisible in source, survive
  // copy/paste badly, and a reviewer cannot tell whether the class is correct. ​-‍ are
  // the zero-width space/non-joiner/joiner, ﻿ the BOM, ⁠ the word joiner.
  let sanitized = String(input).normalize('NFKC').replace(/[​-‍﻿⁠]/g, '');
  let blocked = false;

  // Check hard injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    const match = sanitized.match(pattern);
    if (match) {
      threats.push(`injection_attempt: "${match[0]}"`);
      // Strip the matched injection attempt
      sanitized = sanitized.replace(pattern, '[REMOVED]');
      blocked = true;
    }
  }

  // Check soft patterns (warn but don't block)
  for (const pattern of SOFT_PATTERNS) {
    const match = sanitized.match(pattern);
    if (match) {
      threats.push(`suspicious_phrase: "${match[0]}"`);
    }
  }

  // Strip excessive whitespace that could hide injections
  sanitized = sanitized.replace(/\s{10,}/g, ' ');

  // Strip null bytes and control characters (except newlines).
  const controlCharsExceptNewlines = new RegExp(String.raw`[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]`, 'g');
  sanitized = sanitized.replace(controlCharsExceptNewlines, '');

  // Limit length (prevent prompt stuffing — 2000 chars for commands)
  if (sanitized.length > 2000) {
    sanitized = sanitized.slice(0, 2000);
    threats.push('input_truncated: exceeded 2000 char limit');
  }

  if (threats.length > 0) {
    logger.warn('[InputSanitizer] Threats detected', {
      threatCount: threats.length,
      blocked,
      threats,
    });
  }

  return { sanitized, threats, blocked };
}
