import { describe, expect, it } from 'vitest';
import {
  buildTrainerSessionCoachRoute,
  buildTrainerSessionLogRoute,
  buildTrainerSessionBuildPlanRoute,
  getNextActionableTrainerSession,
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

  it('adds a display-only session credit hint when the schedule exposes session type cost', () => {
    const route = buildTrainerSessionLogRoute({
      ...apiSession,
      sessionType: { creditsRequired: 2 },
    } as TrainerSession);
    expect(route).not.toBeNull();

    const url = new URL(route ?? '', 'https://sswanstudios.test');
    expect(url.searchParams.get('sessionCredits')).toBe('2');
  });

  it('omits unsafe session credit hints from workout logger routes', () => {
    const route = buildTrainerSessionLogRoute({
      ...apiSession,
      sessionType: { creditsRequired: '2junk' },
    } as TrainerSession);
    expect(route).not.toBeNull();

    const url = new URL(route ?? '', 'https://sswanstudios.test');
    expect(url.searchParams.get('sessionCredits')).toBeNull();
  });

  it('builds a trainer Coach route with the same booked-session context for dictation', () => {
    const route = buildTrainerSessionCoachRoute({
      ...apiSession,
      sessionType: { creditsRequired: 2 },
    } as TrainerSession);
    expect(route).not.toBeNull();

    const url = new URL(route ?? '', 'https://sswanstudios.test');
    expect(url.pathname).toBe('/dashboard/trainer/coach-assistant');
    expect(url.searchParams.get('clientId')).toBe('42');
    expect(url.searchParams.get('intent')).toBe('log_workout');
    expect(url.searchParams.get('sessionId')).toBe('88');
    expect(url.searchParams.get('sessionDate')).toBe('2026-05-31T16:00:00.000Z');
    expect(url.searchParams.get('sessionCredits')).toBe('2');
    expect(url.searchParams.get('source')).toBe('master-schedule');
    expect(url.searchParams.get('sourcePath')).toBe('/dashboard/trainer/schedule');
    expect(url.searchParams.get('returnTo')).toBe('/dashboard/trainer/overview');
  });

  it('builds a trainer Workout Planner route with scoped client and booked-session context', () => {
    // Workout-OS C7 (2026-07-29): Build Plan is absorbed into the planner —
    // the helper keeps its name and params but targets the planner mount.
    const route = buildTrainerSessionBuildPlanRoute(apiSession);
    expect(route).not.toBeNull();

    const url = new URL(route ?? '', 'https://sswanstudios.test');
    expect(url.pathname).toBe('/dashboard/trainer/workout-planner');
    expect(url.searchParams.get('clientId')).toBe('42');
    expect(url.searchParams.get('sessionId')).toBe('88');
    expect(url.searchParams.get('sessionDate')).toBe('2026-05-31T16:00:00.000Z');
    expect(url.searchParams.get('source')).toBe('trainer-overview');
    expect(url.searchParams.get('returnTo')).toBe('/dashboard/trainer/overview');
  });

  it('selects the next upcoming actionable session instead of completed or unordered rows', () => {
    const now = new Date('2026-05-31T15:00:00.000Z');
    const next = getNextActionableTrainerSession([
      { ...apiSession, id: 99, sessionDate: '2026-05-31T18:00:00.000Z', status: 'scheduled' },
      { ...apiSession, id: 77, sessionDate: '2026-05-31T14:00:00.000Z', status: 'scheduled' },
      { ...apiSession, id: 66, sessionDate: '2026-05-31T16:00:00.000Z', status: 'completed' },
      { ...apiSession, id: 55, sessionDate: '2026-05-31T15:30:00.000Z', status: 'scheduled' },
      { ...apiSession, id: 'bad-id', sessionDate: '2026-05-31T15:05:00.000Z', status: 'scheduled' },
    ], now);

    expect(next?.id).toBe(55);
  });

  it('falls back to the most recent unlogged past session when no future session remains', () => {
    const now = new Date('2026-05-31T20:00:00.000Z');
    const next = getNextActionableTrainerSession([
      { ...apiSession, id: 44, sessionDate: '2026-05-31T10:00:00.000Z', status: 'cancelled' },
      { ...apiSession, id: 45, sessionDate: '2026-05-31T12:00:00.000Z', status: 'scheduled' },
      { ...apiSession, id: 46, sessionDate: '2026-05-31T18:00:00.000Z', status: 'scheduled' },
    ], now);

    expect(next?.id).toBe(46);
  });

  it('does not let dateless actionable sessions hijack the next trainer CTA', () => {
    const now = new Date('2026-05-31T15:00:00.000Z');
    const next = getNextActionableTrainerSession([
      { ...apiSession, id: 100, sessionDate: undefined, status: 'scheduled' },
      { ...apiSession, id: 55, sessionDate: '2026-05-31T15:30:00.000Z', status: 'scheduled' },
    ], now);

    expect(next?.id).toBe(55);
  });

  it('falls back to a valid past session instead of a dateless route-only row', () => {
    const now = new Date('2026-05-31T20:00:00.000Z');
    const next = getNextActionableTrainerSession([
      { ...apiSession, id: 100, sessionDate: undefined, status: 'scheduled' },
      { ...apiSession, id: 46, sessionDate: '2026-05-31T18:00:00.000Z', status: 'scheduled' },
    ], now);

    expect(next?.id).toBe(46);
  });

  it('returns no trainer CTA when every actionable session lacks a usable time', () => {
    const next = getNextActionableTrainerSession([
      { ...apiSession, id: 100, sessionDate: undefined, startTime: undefined, status: 'scheduled' },
      { ...apiSession, id: 101, sessionDate: 'not-a-date', startTime: 'bad-time', status: 'scheduled' },
    ], new Date('2026-05-31T15:00:00.000Z'));

    expect(next).toBeNull();
  });
});
