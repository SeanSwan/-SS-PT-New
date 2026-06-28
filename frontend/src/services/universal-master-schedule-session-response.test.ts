import { describe, expect, it } from 'vitest';

import {
  INVALID_SESSIONS_RESPONSE_MESSAGE,
  isInvalidSessionsResponseError,
  normalizeSessionsResponse,
} from './universal-master-schedule-session-response';

describe('universal master schedule session response normalization', () => {
  const sessions = [
    {
      id: '42',
      status: 'confirmed',
      sessionDate: '2026-06-26T15:00:00.000Z',
    },
  ];

  it('accepts raw array responses from GET /api/sessions', () => {
    expect(normalizeSessionsResponse(sessions)).toBe(sessions);
  });

  it('accepts wrapped success responses from GET /api/sessions', () => {
    expect(normalizeSessionsResponse({ success: true, sessions })).toBe(sessions);
  });

  it('rejects non-list responses with the schedule endpoint message', () => {
    expect(() => normalizeSessionsResponse({ success: false, message: 'backend failed' })).toThrow(
      `${INVALID_SESSIONS_RESPONSE_MESSAGE} backend failed`
    );
    expect(() => normalizeSessionsResponse(null)).toThrow(INVALID_SESSIONS_RESPONSE_MESSAGE);
  });

  it('identifies invalid sessions response errors without swallowing unrelated errors', () => {
    expect(isInvalidSessionsResponseError(new Error(INVALID_SESSIONS_RESPONSE_MESSAGE))).toBe(true);
    expect(isInvalidSessionsResponseError(new Error('network failed'))).toBe(false);
  });
});
