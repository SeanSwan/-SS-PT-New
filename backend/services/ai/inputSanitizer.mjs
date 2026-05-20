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
  /\byou\s+are\s+now\b/i,
  /\b(new|override|replace)\s+(system\s+)?(prompt|instruction|persona|role)\b/i,
  /\bact\s+as\s+(if\s+you\s+are|a|an|the)\b/i,
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
  let sanitized = input;
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
