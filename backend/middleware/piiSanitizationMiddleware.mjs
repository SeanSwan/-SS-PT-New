/**
 * ============================================================================
 * FILE: piiSanitizationMiddleware.mjs
 * PURPOSE: Express middleware for PII/PHI detection and stripping on AI endpoints
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Scans incoming request body for PII (emails, phones,
 * SSNs, addresses) and PHI (medical conditions, medications, diagnoses) before
 * the request reaches any AI endpoint. Strips or redacts PII from text fields.
 *
 * HOW IT FITS IN THE APP: Mounted on all AI endpoints, especially voice AI
 * where users speak naturally and may inadvertently include PII.
 *
 * Pipeline: Request → piiSanitizationMiddleware → AI route handler → AI model
 *
 * KEY DECISIONS: Non-blocking by default (redacts and continues). Can be
 * configured to block requests with high-risk PII (SSN, insurance IDs).
 */

import { sanitizeInput } from '../services/ai/inputSanitizer.mjs';
import { scanForPHI } from '../services/ai/phiScanner.mjs';
import logger from '../utils/logger.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: PII Regex Patterns
// PURPOSE: Detect and redact common PII patterns in free text
// ─────────────────────────────────────────────────────────────

const PII_PATTERNS = [
  { name: 'ssn', pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN-REDACTED]', severity: 'critical' },
  { name: 'email', pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, replacement: '[EMAIL-REDACTED]', severity: 'high' },
  { name: 'phone', pattern: /\b(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, replacement: '[PHONE-REDACTED]', severity: 'high' },
  { name: 'credit_card', pattern: /\b(?:\d[ -]*?){13,16}\b/g, replacement: '[CC-REDACTED]', severity: 'critical' },
  { name: 'dob', pattern: /\b(DOB|date\s+of\s+birth|born\s+on|birthday)\s*:?\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/gi, replacement: '[DOB-REDACTED]', severity: 'high' },
  { name: 'address', pattern: /\b\d{1,5}\s+[A-Z][a-zA-Z]*\s+(Street|St|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Lane|Ln|Road|Rd|Court|Ct|Way|Place|Pl)\b/g, replacement: '[ADDRESS-REDACTED]', severity: 'medium' },
  { name: 'insurance_id', pattern: /\b[A-Z]{2,3}\d{7,12}\b/g, replacement: '[INSURANCE-REDACTED]', severity: 'critical' },
  { name: 'full_name_pattern', pattern: /\bmy\s+name\s+is\s+([A-Z][a-z]+\s+[A-Z][a-z]+)\b/gi, replacement: 'my name is [NAME-REDACTED]', severity: 'medium' },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Text Sanitization
// PURPOSE: Apply all PII patterns + PHI scan to a text string
// ─────────────────────────────────────────────────────────────

/**
 * Sanitize a text string by redacting PII and flagging PHI.
 * @param {string} text - Raw text input
 * @returns {{ sanitized: string, detections: Object[], hasCriticalPII: boolean }}
 */
function sanitizeText(text) {
  if (!text || typeof text !== 'string') {
    return { sanitized: text, detections: [], hasCriticalPII: false };
  }

  let sanitized = text;
  const detections = [];
  let hasCriticalPII = false;

  // Apply PII regex patterns
  for (const { name, pattern, replacement, severity } of PII_PATTERNS) {
    const matches = sanitized.match(pattern);
    if (matches) {
      detections.push({
        type: name,
        severity,
        count: matches.length,
        // Don't log the actual PII values — just the count
      });
      sanitized = sanitized.replace(pattern, replacement);
      if (severity === 'critical') hasCriticalPII = true;
    }
  }

  // Run PHI scanner for medical information
  const phiResult = scanForPHI(sanitized);
  if (phiResult && phiResult.hasPHI && phiResult.matches.length > 0) {
    for (const category of (phiResult.categories || [])) {
      detections.push({
        type: `phi_${category}`,
        severity: category === 'identifier' ? 'critical' : 'high',
        count: phiResult.matches.length,
      });
    }
    // PHI scanner doesn't auto-redact — we've already caught PII patterns above.
    // PHI categories (medical conditions, medications) are flagged but not necessarily
    // blocked, since trainers need to discuss injuries/limitations.
  }

  // Run injection sanitizer
  const injectionResult = sanitizeInput(sanitized);
  if (injectionResult.threats.length > 0) {
    detections.push({
      type: 'injection_attempt',
      severity: 'critical',
      threats: injectionResult.threats,
    });
    sanitized = injectionResult.sanitized;
    hasCriticalPII = true; // Block injection attempts too
  }

  return { sanitized, detections, hasCriticalPII };
}

// ─────────────────────────────────────────────────────────────
// SECTION: Express Middleware
// PURPOSE: Middleware factory for AI endpoints
// ─────────────────────────────────────────────────────────────

/**
 * PII Sanitization Middleware factory.
 *
 * @param {Object} options
 * @param {boolean} options.blockCritical - If true, returns 400 for critical PII (default: true)
 * @param {string[]} options.textFields - Body fields to scan (default: ['message', 'text', 'prompt', 'transcript', 'input'])
 * @param {boolean} options.logDetections - Log detection events (default: true)
 * @returns {Function} Express middleware
 */
export function piiSanitization(options = {}) {
  const {
    blockCritical = true,
    textFields = ['message', 'text', 'prompt', 'transcript', 'input', 'content', 'query'],
    logDetections = true,
  } = options;

  return (req, res, next) => {
    if (!req.body || typeof req.body !== 'object') {
      return next();
    }

    const allDetections = [];
    let blocked = false;

    // Scan each configured text field
    for (const field of textFields) {
      const value = req.body[field];
      if (!value || typeof value !== 'string') continue;

      const result = sanitizeText(value);

      if (result.detections.length > 0) {
        allDetections.push(...result.detections.map(d => ({ ...d, field })));

        // Replace the field with sanitized version
        req.body[field] = result.sanitized;

        if (blockCritical && result.hasCriticalPII) {
          blocked = true;
        }
      }
    }

    // Also scan nested objects (e.g., body.messages[].content)
    if (req.body.messages && Array.isArray(req.body.messages)) {
      for (let i = 0; i < req.body.messages.length; i++) {
        const msg = req.body.messages[i];
        if (msg.content && typeof msg.content === 'string') {
          const result = sanitizeText(msg.content);
          if (result.detections.length > 0) {
            allDetections.push(...result.detections.map(d => ({ ...d, field: `messages[${i}].content` })));
            req.body.messages[i].content = result.sanitized;
            if (blockCritical && result.hasCriticalPII) blocked = true;
          }
        }
      }
    }

    // Attach detections to request for downstream logging
    req.piiDetections = allDetections;

    if (allDetections.length > 0 && logDetections) {
      logger.warn('[PII Middleware] PII detected and sanitized', {
        userId: req.user?.id,
        detectionCount: allDetections.length,
        types: [...new Set(allDetections.map(d => d.type))],
        blocked,
      });
    }

    if (blocked) {
      return res.status(400).json({
        success: false,
        error: 'pii_blocked',
        message: 'Your message contains sensitive personal information (SSN, credit card, or insurance ID) that cannot be sent to AI services. Please remove this information and try again.',
        detections: allDetections.map(d => ({
          type: d.type,
          severity: d.severity,
          field: d.field,
        })),
      });
    }

    next();
  };
}

/**
 * Convenience: strict PII middleware that blocks all critical PII.
 * Use on voice AI and chat endpoints.
 */
export const strictPiiMiddleware = piiSanitization({ blockCritical: true });

/**
 * Convenience: permissive PII middleware that redacts but never blocks.
 * Use on workout logging where some medical context is expected.
 */
export const permissivePiiMiddleware = piiSanitization({ blockCritical: false });

export default { piiSanitization, strictPiiMiddleware, permissivePiiMiddleware, sanitizeText };
