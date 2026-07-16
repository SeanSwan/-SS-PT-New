/**
 * ============================================================================
 * FILE: clientTimeZoneHeader.test.ts
 * PURPOSE: Lock browser timezone header validation and omission behavior.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */
import { describe, expect, it } from 'vitest';
import { getBrowserTimeZoneHeader } from './clientTimeZoneHeader';

describe('client timezone request header', () => {
  it('returns a validated browser IANA timezone', () => {
    expect(getBrowserTimeZoneHeader('America/New_York')).toBe('America/New_York');
  });

  it('omits invalid, empty, and oversized timezone values', () => {
    expect(getBrowserTimeZoneHeader('Not/A_TimeZone')).toBeNull();
    expect(getBrowserTimeZoneHeader('')).toBeNull();
    expect(getBrowserTimeZoneHeader('A'.repeat(65))).toBeNull();
  });
});