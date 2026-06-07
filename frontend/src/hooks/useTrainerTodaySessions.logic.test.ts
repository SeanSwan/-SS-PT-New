import { describe, expect, it } from 'vitest';
import {
  buildTrainerSessionLogRoute,
  getSessionClientId,
  getSessionEndDate,
  getSessionStartDate,
  type TrainerSession,
} from './useTrainerTodaySessions';

describe('useTrainerTodaySessions session mapping helpers', () => {
  const apiSession: TrainerSession = {
    id: 88,
    sessionDate: '2026-05-31T16:00:00.000Z',
    duration: 45,
    userId: 42,
    client: {
      id: 42,
      firstName: 'Ada',
      lastName: 'Lovelace',
    },
    status: 'scheduled',
  };

  it('uses canonical sessionDate and duration when startTime/endTime are absent', () => {
    expect(getSessionStartDate(apiSession)?.toISOString()).toBe('2026-05-31T16:00:00.000Z');
    expect(getSessionEndDate(apiSession)?.toISOString()).toBe('2026-05-31T16:45:00.000Z');
  });

  it('resolves the session client id from userId first, then associated client id', () => {
    expect(getSessionClientId(apiSession)).toBe('42');
    expect(getSessionClientId({ ...apiSession, userId: null, client: { id: 51 } })).toBe('51');
    expect(getSessionClientId({ ...apiSession, userId: null, client: undefined })).toBeNull();
  });

  it('rejects malformed schedule identities before building workout logger routes', () => {
    expect(getSessionClientId({ ...apiSession, userId: '42junk', client: { id: 51 } })).toBe('51');
    expect(getSessionClientId({ ...apiSession, userId: '42junk', client: { id: '51bad' } })).toBeNull();
    expect(buildTrainerSessionLogRoute({ ...apiSession, id: '88junk' })).toBeNull();
    expect(buildTrainerSessionLogRoute({ ...apiSession, userId: '42junk', client: undefined })).toBeNull();
  });

  it('builds a trainer log route with client, session, date, source, and return context', () => {
    const route = buildTrainerSessionLogRoute(apiSession);
    expect(route).not.toBeNull();

    const url = new URL(route ?? '', 'https://sswanstudios.test');
    expect(url.pathname).toBe('/dashboard/trainer/log-workout');
    expect(url.searchParams.get('clientId')).toBe('42');
    expect(url.searchParams.get('sessionId')).toBe('88');
    expect(url.searchParams.get('sessionDate')).toBe('2026-05-31T16:00:00.000Z');
    expect(url.searchParams.get('source')).toBe('master-schedule');
    expect(url.searchParams.get('returnTo')).toBe('/dashboard/trainer/overview');
    expect(url.searchParams.get('loadPlan')).toBe('today');
  });
});
