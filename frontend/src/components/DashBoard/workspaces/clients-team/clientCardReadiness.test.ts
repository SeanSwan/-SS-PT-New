import { describe, expect, it } from 'vitest';
import {
  getAccountAccessReadiness,
  getNextSessionReadiness,
  lastLoggedLabelFor,
  relativeClientDateLabelFor,
  sessionBankReadinessFor,
  workoutProofLabelFor,
} from './clientCardReadiness';
import type { ClientOption } from './ClientSelectorDropdown';

const DAY_MS = 86400000;

const baseClient: ClientOption = {
  id: 7,
  firstName: 'Ready',
  lastName: 'Client',
  email: 'ready.client@example.test',
};

const isoInDays = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();

const utcMonthDay = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    .format(new Date(iso));

describe('getNextSessionReadiness', () => {
  it('keeps neutral guidance when the surface has no next-session data (trainer path)', () => {
    expect(getNextSessionReadiness(baseClient)).toEqual({ value: 'check schedule', tone: 'default' });
  });

  it('shows an honest empty state when the API says nothing is booked', () => {
    expect(getNextSessionReadiness({ ...baseClient, nextSessionDate: null }))
      .toEqual({ value: 'none booked', tone: 'warning' });
  });

  it('renders Today and Tomorrow for imminent bookings', () => {
    expect(getNextSessionReadiness({ ...baseClient, nextSessionDate: new Date().toISOString() }).value)
      .toBe('Today');
    expect(getNextSessionReadiness({ ...baseClient, nextSessionDate: isoInDays(1) }).value)
      .toBe('Tomorrow');
  });

  it('renders the booked date for future sessions', () => {
    const iso = isoInDays(6);
    expect(getNextSessionReadiness({ ...baseClient, nextSessionDate: iso }))
      .toEqual({ value: utcMonthDay(iso), tone: 'default' });
  });

  it('flags stale scheduled sessions that were never completed', () => {
    const iso = isoInDays(-4);
    const signal = getNextSessionReadiness({ ...baseClient, nextSessionDate: iso });
    expect(signal.tone).toBe('warning');
    expect(signal.value).toBe(`overdue: ${utcMonthDay(iso)}`);
  });

  it('falls back to neutral guidance on malformed dates', () => {
    expect(getNextSessionReadiness({ ...baseClient, nextSessionDate: 'not-a-date' }))
      .toEqual({ value: 'check schedule', tone: 'default' });
  });
});

describe('getAccountAccessReadiness', () => {
  it('does not overclaim login readiness when accountStatus is unknown on the surface', () => {
    expect(getAccountAccessReadiness(baseClient)).toEqual({ value: 'active', tone: 'default' });
  });

  it('maps the claim lifecycle to honest admin-facing labels', () => {
    expect(getAccountAccessReadiness({ ...baseClient, accountStatus: 'stub' }))
      .toEqual({ value: 'invite pending', tone: 'warning' });
    expect(getAccountAccessReadiness({ ...baseClient, accountStatus: 'invited' }))
      .toEqual({ value: 'claim link sent', tone: 'warning' });
    expect(getAccountAccessReadiness({ ...baseClient, accountStatus: 'active' }))
      .toEqual({ value: 'login ready', tone: 'default' });
  });

  it('lets deactivation win over any claim state', () => {
    expect(getAccountAccessReadiness({ ...baseClient, isActive: false, accountStatus: 'stub' }))
      .toEqual({ value: 'deactivated', tone: 'danger' });
  });
});

describe('sessionBankReadinessFor', () => {
  it('labels free-tracking accounts as tracking mode, not paid inventory', () => {
    expect(sessionBankReadinessFor({ label: 'free tracking', note: 'no deduction', tone: 'neutral' }))
      .toBe('tracking mode');
  });

  it('labels healthy paid accounts as paid inventory and low balances as low inventory', () => {
    expect(sessionBankReadinessFor({ label: '12 paid sessions', note: 'deducts when logged', tone: 'gold' }))
      .toBe('paid inventory');
    expect(sessionBankReadinessFor({ label: '1 paid session', note: 'refill soon', tone: 'warning' }))
      .toBe('low inventory');
  });
});

describe('moved card label helpers', () => {
  it('formats last-logged and proof labels from real workout data', () => {
    const client = { ...baseClient, workoutCount: 4, lastSessionDate: '2026-05-20T12:00:00.000Z' };
    expect(lastLoggedLabelFor(client)).toBe('Last logged: May 20');
    expect(workoutProofLabelFor(client)).toBe('4 logged');
  });

  it('suppresses last-logged when there are no workouts and handles joined-date fallback', () => {
    expect(lastLoggedLabelFor({ ...baseClient, workoutCount: 0, lastSessionDate: '2026-05-20T12:00:00.000Z' }))
      .toBeNull();
    expect(relativeClientDateLabelFor({ ...baseClient, joinDate: new Date().toISOString() }))
      .toBe('Joined Today');
    expect(relativeClientDateLabelFor(baseClient)).toBeNull();
  });
});
