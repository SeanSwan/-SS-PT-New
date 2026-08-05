/**
 * Trainer dropdown — PII narrowing, asserted BEHAVIOURALLY.
 * =========================================================
 *
 * `GET /api/sessions/users/trainers` returned the full legal name, EMAIL and
 * PHONE of every trainer and admin, unpaginated, to any authenticated account.
 *
 * Two things this file exists to prevent recurring:
 *
 * 1. The first guard for it was a source slice spanning BOTH `/users/trainers`
 *    and `/users/clients`, asserting the string `trainerOrAdminOnly` appeared
 *    somewhere inside. It passed on the SIBLING route's gate — deleting the
 *    gate from `/users/trainers` left the whole suite green. Assert what the
 *    service actually SELECTS instead.
 *
 * 2. The route must stay open to members. `UniversalSchedule` backs both the
 *    admin master schedule and the client "Book My Session" page, so gating the
 *    route broke booking. Least privilege belongs on the DATA.
 */
import { describe, expect, it, vi } from 'vitest';

const { findAllMock } = vi.hoisted(() => ({ findAllMock: vi.fn() }));

vi.mock('../../models/index.mjs', () => ({
  getUser: () => ({ findAll: findAllMock }),
  getAllModels: () => ({}),
}));

const loadService = async () =>
  (await import('../../services/sessions/session.service.mjs')).default;

const attributesFor = async (viewer) => {
  findAllMock.mockReset();
  findAllMock.mockResolvedValue([]);
  // `User` is a lazy getter backed by getUser(), which is mocked above — no
  // need (and no ability) to assign it.
  const service = await loadService();
  await service.getTrainers(viewer);
  expect(findAllMock).toHaveBeenCalled();
  return JSON.stringify(findAllMock.mock.calls[0][0].attributes);
};

describe('trainer dropdown PII', () => {
  it('never sends a member an email or phone number', async () => {
    const attrs = await attributesFor({ id: 42, role: 'user' });

    expect(attrs).not.toContain('email');
    expect(attrs).not.toContain('phone');
    expect(attrs).not.toContain('lastName');
  });

  it('never sends a client an email or phone number', async () => {
    const attrs = await attributesFor({ id: 43, role: 'client' });

    expect(attrs).not.toContain('email');
    expect(attrs).not.toContain('phone');
  });

  it('still gives a member what booking needs', async () => {
    const attrs = await attributesFor({ id: 42, role: 'user' });

    expect(attrs).toContain('firstName');
    expect(attrs).toContain('specialties');
  });

  it('still gives staff the contact details they administer with', async () => {
    const attrs = await attributesFor({ id: 1, role: 'admin' });

    expect(attrs).toContain('lastName');
  });

  it('fails closed when the viewer is unknown', async () => {
    const attrs = await attributesFor(undefined);

    expect(attrs).not.toContain('email');
    expect(attrs).not.toContain('lastName');
  });
});
