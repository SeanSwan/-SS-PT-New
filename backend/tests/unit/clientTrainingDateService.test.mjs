/**
 * ============================================================================
 * FILE: clientTrainingDateService.test.mjs
 * PURPOSE: Lock client-local plan date and timezone precedence.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CLIENT_TIME_ZONE,
  ClientTrainingDateError,
  formatDateOnlyInTimeZone,
  normalizeClientTimeZoneUpdate,
  resolveClientTrainingDateContext,
} from '../../services/clientTrainingDateService.mjs';

const SPRING_BOUNDARY = new Date('2026-03-08T07:30:00.000Z');
const FALL_BOUNDARY = new Date('2026-11-01T06:30:00.000Z');

describe('client training date service', () => {
  it('formats spring and fall DST boundaries in the client IANA timezone', () => {
    expect(formatDateOnlyInTimeZone(SPRING_BOUNDARY, 'America/Los_Angeles')).toBe('2026-03-07');
    expect(formatDateOnlyInTimeZone(SPRING_BOUNDARY, 'America/New_York')).toBe('2026-03-08');
    expect(formatDateOnlyInTimeZone(FALL_BOUNDARY, 'America/Los_Angeles')).toBe('2026-10-31');
    expect(formatDateOnlyInTimeZone(FALL_BOUNDARY, 'America/New_York')).toBe('2026-11-01');
  });

  it('keeps an explicitly configured client timezone authoritative', () => {
    expect(resolveClientTrainingDateContext({
      storedTimeZone: 'America/Denver',
      storedTimeZoneConfigured: true,
      headerTimeZone: 'Asia/Tokyo',
      actorId: 42,
      targetClientId: 42,
      referenceDate: SPRING_BOUNDARY,
    })).toEqual({
      localDate: '2026-03-08',
      timeZone: 'America/Denver',
      source: 'user',
    });
  });

  it('uses a valid browser header only for the client viewing their own plan', () => {
    expect(resolveClientTrainingDateContext({
      storedTimeZone: DEFAULT_CLIENT_TIME_ZONE,
      storedTimeZoneConfigured: false,
      headerTimeZone: 'Asia/Tokyo',
      actorId: '42',
      targetClientId: 42,
      referenceDate: SPRING_BOUNDARY,
    })).toEqual({
      localDate: '2026-03-08',
      timeZone: 'Asia/Tokyo',
      source: 'client_header',
    });
  });

  it('never lets a trainer browser timezone change the client plan date', () => {
    expect(resolveClientTrainingDateContext({
      storedTimeZone: DEFAULT_CLIENT_TIME_ZONE,
      storedTimeZoneConfigured: false,
      headerTimeZone: 'Asia/Tokyo',
      actorId: 7,
      targetClientId: 42,
      referenceDate: SPRING_BOUNDARY,
    })).toEqual({
      localDate: '2026-03-07',
      timeZone: DEFAULT_CLIENT_TIME_ZONE,
      source: 'account_default',
    });
  });

  it('falls back explicitly when stored and header zones are invalid', () => {
    expect(resolveClientTrainingDateContext({
      storedTimeZone: 'Not/A_TimeZone',
      storedTimeZoneConfigured: true,
      headerTimeZone: 'Also/Invalid',
      actorId: 42,
      targetClientId: 42,
      referenceDate: SPRING_BOUNDARY,
    })).toEqual({
      localDate: '2026-03-07',
      timeZone: DEFAULT_CLIENT_TIME_ZONE,
      source: 'fallback',
    });
  });

  it('normalizes valid profile updates and rejects invalid IANA identifiers', () => {
    expect(normalizeClientTimeZoneUpdate(' America/New_York ')).toBe('America/New_York');
    expect(() => normalizeClientTimeZoneUpdate('Not/A_TimeZone')).toThrow(
      expect.objectContaining({
        name: ClientTrainingDateError.name,
        code: 'CLIENT_TIME_ZONE_INVALID',
        statusCode: 400,
      }),
    );
  });
});