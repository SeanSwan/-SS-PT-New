/**
 * aiPrivacyNonStringGuard
 * =======================
 * Kimi PII-to-LLM audit SEV-2 (SWA-129): stripIdentityFromNotes must FAIL CLOSED
 * on non-string input. A truthy non-string (an array/object from a
 * client-authored JSON column like masterPromptJson.goals.notes) previously hit
 * `.replace()` in the term loop → uncaught TypeError (AI-request crash), or, if a
 * caller stringified it first, leaked raw PII to the LLM. Neither is acceptable
 * under Rule 8 — a value we cannot deterministically scrub must be withheld.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../services/privacy/PIIManager.mjs', () => ({ piiManager: {} }));
vi.mock('../../middleware/piiSanitizationMiddleware.mjs', () => ({
  sanitizeText: (t) => ({ sanitized: t }),
}));

const { stripIdentityFromNotes } = await import('../../services/aiPrivacyService.mjs');
const identity = { firstName: 'John', lastName: 'Smith', email: 'j@x.com', phone: '5551234567' };

describe('stripIdentityFromNotes — SEV-2 non-string fail-closed', () => {
  it('withholds an ARRAY note instead of crashing or leaking', () => {
    const out = stripIdentityFromNotes(['John Smith, j@x.com'], 42, identity);
    expect(typeof out).toBe('string');
    expect(out).toMatch(/withheld/i);
    expect(out).not.toContain('John Smith');
  });

  it('withholds an OBJECT note (masterPromptJson.goals.notes shape)', () => {
    const out = stripIdentityFromNotes({ notes: 'call John at 5551234567' }, 42, identity);
    expect(out).toMatch(/withheld/i);
    expect(out).not.toContain('John');
  });

  it('withholds a number', () => {
    expect(stripIdentityFromNotes(1234567890, 42, identity)).toMatch(/withheld/i);
  });

  it('still returns falsy inputs unchanged (no content to leak)', () => {
    expect(stripIdentityFromNotes('', 42, identity)).toBe('');
    expect(stripIdentityFromNotes(null, 42, identity)).toBeNull();
    expect(stripIdentityFromNotes(undefined, 42, identity)).toBeUndefined();
  });

  it('still strips a real string note (the happy path is unbroken)', () => {
    const out = stripIdentityFromNotes('John Smith has knee pain', 42, identity);
    expect(out).toContain('[Client #42]');
    expect(out).not.toContain('John Smith');
    expect(out).toMatch(/knee/); // clinical language preserved
  });

  it('withholds when identity is absent (pre-existing fail-closed, still holds)', () => {
    expect(stripIdentityFromNotes('John Smith', 42, null)).toMatch(/withheld/i);
  });
});
