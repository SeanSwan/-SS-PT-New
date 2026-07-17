/**
 * PROBE (rule 55) — the PII guard blocks legitimate WORKOUT LOGGING on a weightlifting app.
 *
 * `strictPiiMiddleware` = `piiSanitization({ blockCritical: true })` returns **400** whenever
 * `hasCriticalPII` is true. `credit_card` is severity 'critical' and its pattern is:
 *
 *     /\b(?:\d[ -]*?){13,16}\b/g      // 13-16 digits, separated by spaces or dashes
 *
 * A weight progression IS 13-16 space-separated digits. "135 135 185 185 225" is 15 digits.
 * So a routine set log trips the credit-card detector and is rejected as critical PII.
 *
 * This is live on `/conversations/:id/messages` (aiChatRoutes.mjs:540), which carries
 * strictPiiMiddleware and whose default textFields include 'message'. It therefore blocks
 * the Product Core Loop's first step — log the workout — for any barbell progression.
 *
 * This probe asserts the PURE detector, so it is deterministic and needs no HTTP/mocks.
 */
import { describe, expect, it } from 'vitest';
import { sanitizeText } from '../../middleware/piiSanitizationMiddleware.mjs';

// Real things a trainer or Swan Coach says on the floor. Zero actual PII.
const WORKOUT_LINES = [
  'Squat 135 135 185 185 225 225 245 for 3x5, then RDL 95 115 135.',
  'logged sets: 45 45 95 95 135 135 155 155 185 today, felt strong',
  'warmup 45 55 65 75 85 95 105 115 125 135 145 then work sets',
];

describe('PII guard vs real workout logging', () => {
  it.each(WORKOUT_LINES)('does not flag a barbell progression as critical PII: %s', (line) => {
    const result = sanitizeText(line);
    expect(result.hasCriticalPII).toBe(false);
  });

  it('still flags an actual credit card', () => {
    expect(sanitizeText('card 4111 1111 1111 1111').hasCriticalPII).toBe(true);
  });

  it('still flags an actual SSN', () => {
    expect(sanitizeText('ssn 123-45-6789').hasCriticalPII).toBe(true);
  });
});
