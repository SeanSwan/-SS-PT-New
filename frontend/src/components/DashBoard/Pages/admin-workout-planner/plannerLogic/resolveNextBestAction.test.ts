import { describe, expect, it } from 'vitest';
import { resolveNextBestAction } from './resolveNextBestAction';

const base = { roster: [], plans: [], schedule: [], now: Date.parse('2026-08-01T12:00:00Z') };

describe('resolveNextBestAction', () => {
  it('prioritizes a session in the next 24 hours', () => expect(resolveNextBestAction({ ...base, roster: [{ id: 1, initials: 'SC' }], schedule: [{ clientId: 1, at: Date.parse('2026-08-02T10:00:00Z'), week: 3, day: 2 }] }).kind).toBe('session_due'));
  it('then prioritizes a plan ending within three days', () => expect(resolveNextBestAction({ ...base, roster: [{ id: 1, initials: 'SC' }], plans: [{ clientId: 1, active: true, endsAt: Date.parse('2026-08-04T00:00:00Z'), week: 4 }] }).kind).toBe('deload_due'));
  it('does not treat an already-ended plan as an upcoming deload', () => expect(resolveNextBestAction({ ...base, roster: [{ id: 1, initials: 'SC' }], plans: [{ clientId: 1, active: true, endsAt: Date.parse('2026-07-31T00:00:00Z'), week: 4 }] }).kind).toBe('plan_expired'));
  it('rejects non-finite time input', () => expect(() => resolveNextBestAction({ ...base, now: Number.NaN })).toThrow(/finite/));
  it('then prioritizes a pending safety review', () => expect(resolveNextBestAction({ ...base, plans: [{ clientId: 1, pendingReview: true }] }).kind).toBe('review_required'));
  it('then prioritizes a client with no active plan', () => expect(resolveNextBestAction({ ...base, roster: [{ id: 1, initials: 'SC' }] }).kind).toBe('missing_plan'));
  it('then surfaces the latest pain flag', () => expect(resolveNextBestAction({ ...base, roster: [{ id: 1, lastPainFlag: 'Knee' }], plans: [{ clientId: 1, active: true }] }).kind).toBe('pain_flag'));
  it('falls back to client selection', () => expect(resolveNextBestAction(base).kind).toBe('pick_client'));
});
