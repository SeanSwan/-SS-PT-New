/**
 * redactTranscriptPII — deterministic transcript PII redaction (Rule 8)
 * =====================================================================
 * Locks the no-LLM redaction applied at the transcript→parser boundary:
 * known participant names + emails/phones/SSN are removed; injury/movement
 * language the parser needs is preserved. Pure function — no network/LLM.
 */
import { describe, it, expect } from 'vitest';
import { redactTranscriptPII } from '../../services/redactTranscriptPII.mjs';

describe('redactTranscriptPII', () => {
  it('redacts the known client name (nameHint), case-insensitively', () => {
    const { text } = redactTranscriptPII(
      'Alice did 3 sets of goblet squats at 135. alice pushed hard today.',
      { nameHints: ['Alice'] },
    );
    expect(text).not.toMatch(/\bAlice\b/i);
    // training language preserved
    expect(text).toContain('goblet squat');
    expect(text).toContain('135');
  });

  it('redacts emails, phones, and SSNs without a nameHint', () => {
    const { text, detections } = redactTranscriptPII(
      'Reach me at jane@example.com or 555-123-4567. SSN 123-45-6789. Bench 185x5.',
    );
    expect(text).not.toContain('jane@example.com');
    expect(text).not.toContain('555-123-4567');
    expect(text).not.toContain('123-45-6789');
    expect(text).toContain('Bench'); // exercise language survives
    expect(detections.length).toBeGreaterThan(0);
  });

  it('preserves injury / pain language the parser needs', () => {
    const { text } = redactTranscriptPII(
      'Left shoulder felt tight, mild knee pain on the last set of squats.',
      { nameHints: [] },
    );
    expect(text).toContain('shoulder');
    expect(text).toContain('knee pain');
    expect(text).toContain('squats');
  });

  it('returns a stable shape and is safe on empty/non-string input', () => {
    expect(redactTranscriptPII('')).toEqual({ text: '', detections: [], hasCriticalPII: false });
    expect(redactTranscriptPII(null)).toEqual({ text: '', detections: [], hasCriticalPII: false });
    const r = redactTranscriptPII('Squat 225x5', { nameHints: [] });
    expect(r).toHaveProperty('text');
    expect(Array.isArray(r.detections)).toBe(true);
    expect(typeof r.hasCriticalPII).toBe('boolean');
  });

  it('tolerates falsy entries in nameHints', () => {
    const { text } = redactTranscriptPII('Bob ran fast', { nameHints: [null, '', 'Bob'] });
    expect(text).not.toMatch(/\bBob\b/);
  });
});
