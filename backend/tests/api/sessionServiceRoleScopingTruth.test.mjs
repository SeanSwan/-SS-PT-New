/**
 * Launch-audit integration (2026-08-03) — session.service role scoping.
 *
 * Two P1 leaks found by lane 1, applied centrally by the integrator because
 * `session.service.mjs` is shared infra (it also feeds the admin master
 * schedule), so no single lane owned it.
 *
 * 1. getTrainers() returned `email` + `phone` for every trainer AND admin to
 *    ANY authenticated user — the owner's personal contact details handed to
 *    anyone who registered through the public signup form.
 * 2. getScheduleStats() scoped only 'client' and 'trainer'. The DEFAULT signup
 *    role is 'user', which matched neither branch and fell through to the
 *    unscoped admin query, returning platform-wide session counts.
 *
 * Both are now fail-closed: only recognised staff roles widen the projection /
 * the query. These tests assert the projection and the where-clause directly,
 * so they fail if either guard is removed.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findAllMock, countMock, userCountMock } = vi.hoisted(() => ({
  findAllMock: vi.fn(),
  countMock: vi.fn(),
  userCountMock: vi.fn(),
}));

vi.mock('../../models/index.mjs', () => ({}));

const CONTACT_FIELDS = ['email', 'phone'];

// `User` / `Session` are lazy getters that memoise into `_User` / `_Session`,
// so seeding the caches substitutes the models without touching a live DB.
const makeService = async () => {
  const mod = await import('../../services/sessions/session.service.mjs');
  const service = mod.default ?? mod.unifiedSessionService ?? mod.sessionService;
  // The admin branch of getScheduleStats also counts users.
  service._User = { findAll: findAllMock, count: userCountMock };
  service._Session = { count: countMock };
  return service;
};

describe('session.service role scoping (launch audit)', () => {
  beforeEach(() => {
    findAllMock.mockReset().mockResolvedValue([]);
    countMock.mockReset().mockResolvedValue(0);
    userCountMock.mockReset().mockResolvedValue(0);
  });

  describe('getTrainers contact-PII projection', () => {
    it('withholds email/phone from a default-role "user" caller', async () => {
      const service = await makeService();
      await service.getTrainers({ id: 42, role: 'user' });

      const attrs = findAllMock.mock.calls[0][0].attributes;
      for (const field of CONTACT_FIELDS) {
        expect(attrs, `"${field}" must not be exposed to a non-staff caller`).not.toContain(field);
      }
      expect(attrs).toContain('firstName'); // dropdowns still work
    });

    it('withholds email/phone from a client caller', async () => {
      const service = await makeService();
      await service.getTrainers({ id: 7, role: 'client' });
      const attrs = findAllMock.mock.calls[0][0].attributes;
      for (const field of CONTACT_FIELDS) expect(attrs).not.toContain(field);
    });

    it('withholds email/phone when the caller is unknown (fail closed)', async () => {
      const service = await makeService();
      await service.getTrainers();
      const attrs = findAllMock.mock.calls[0][0].attributes;
      for (const field of CONTACT_FIELDS) expect(attrs).not.toContain(field);
    });

    it('still gives staff the contact fields they need', async () => {
      const service = await makeService();
      for (const role of ['admin', 'trainer']) {
        findAllMock.mockClear();
        await service.getTrainers({ id: 1, role });
        const attrs = findAllMock.mock.calls[0][0].attributes;
        for (const field of CONTACT_FIELDS) {
          expect(attrs, `staff role "${role}" should keep ${field}`).toContain(field);
        }
      }
    });
  });

  describe('getScheduleStats query scoping', () => {
    it('scopes a default-role "user" to their own sessions, not the platform', async () => {
      const service = await makeService();
      await service.getScheduleStats({ id: 42, role: 'user' });

      const where = countMock.mock.calls[0][0].where;
      expect(where, 'default-role user must not get the unscoped admin query').toEqual({ userId: 42 });
    });

    it('scopes an unrecognised role to their own sessions (fail closed)', async () => {
      const service = await makeService();
      await service.getScheduleStats({ id: 99, role: 'something-new' });
      expect(countMock.mock.calls[0][0].where).toEqual({ userId: 99 });
    });

    it('keeps admin unscoped and trainer scoped to their own assignments', async () => {
      const service = await makeService();

      await service.getScheduleStats({ id: 1, role: 'admin' });
      expect(countMock.mock.calls[0][0].where).toEqual({});

      countMock.mockClear();
      await service.getScheduleStats({ id: 5, role: 'trainer' });
      expect(countMock.mock.calls[0][0].where).toEqual({ trainerId: 5 });
    });
  });
});
