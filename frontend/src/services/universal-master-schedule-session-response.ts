import type { Session } from '../components/UniversalMasterSchedule/types';

export const INVALID_SESSIONS_RESPONSE_MESSAGE = 'Invalid sessions response from /api/sessions.';

export const isInvalidSessionsResponseError = (error: unknown): boolean => (
  error instanceof Error && error.message.startsWith(INVALID_SESSIONS_RESPONSE_MESSAGE)
);

export const normalizeSessionsResponse = (payload: unknown): Session[] => {
  if (Array.isArray(payload)) {
    return payload as Session[];
  }

  if (payload && typeof payload === 'object') {
    const response = payload as { sessions?: unknown; message?: unknown };

    if (Array.isArray(response.sessions)) {
      return response.sessions as Session[];
    }

    const detail = typeof response.message === 'string' ? ` ${response.message}` : '';
    throw new Error(`${INVALID_SESSIONS_RESPONSE_MESSAGE}${detail}`);
  }

  throw new Error(INVALID_SESSIONS_RESPONSE_MESSAGE);
};
