/**
 * clientTrainerAssignmentService — revocation contract
 * ====================================================
 * SWA-192 / SWA-113 C1+C2.
 *
 * These methods are currently DEAD — no component calls them (the live admin
 * surface, Admin/ClientTrainerAssignments.tsx, talks to `/api/assignments`
 * directly via authAxios). That is exactly why they are dangerous: three
 * separate audits read this file, saw "unassign", and concluded that live
 * revocation was broken. It is not — but anything wired to THIS service would
 * be, in three independent ways:
 *
 *   1. `deactivateAssignment` called `PUT /:id/deactivate`, a route that does
 *      not exist. The router has POST /, PUT /:id, DELETE /:id.  -> 404
 *   2. `getClientAssignments` returned `response.data` raw, but the backend
 *      replies `{ success, assignment: <object|null> }` — SINGULAR, and an
 *      object. `.filter(...)` on that throws TypeError.
 *   3. The filters read `a.isActive`, but `isActive()` is a Sequelize INSTANCE
 *      METHOD (ClientTrainerAssignment.mjs:36), not a serialized column. The
 *      JSON carries `status: 'active'`, so the predicate is always undefined —
 *      and `isClientAssignedToTrainer` therefore always returned false.
 *
 * Pinning the contract here so the trap cannot be re-armed.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const put = vi.fn();
const post = vi.fn();
const del = vi.fn();

vi.mock('./api.service', () => ({
  default: { get: (...a: any[]) => get(...a), put: (...a: any[]) => put(...a), post: (...a: any[]) => post(...a), delete: (...a: any[]) => del(...a) },
  apiService: { get: (...a: any[]) => get(...a), put: (...a: any[]) => put(...a), post: (...a: any[]) => post(...a), delete: (...a: any[]) => del(...a) },
}));

const { default: service } = await import('./clientTrainerAssignmentService');

const activeAssignment = { id: 'a1', trainerId: '101', clientId: '42', status: 'active' };

beforeEach(() => {
  vi.clearAllMocks();
  put.mockResolvedValue({ data: { success: true } });
});

describe('getClientAssignments — response shape', () => {
  it('unwraps the singular { success, assignment } the backend actually returns', async () => {
    get.mockResolvedValue({ data: { success: true, assignment: activeAssignment } });

    const result = await service.getClientAssignments('42');

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('active');
  });

  it('returns an empty array when there is no assignment', async () => {
    get.mockResolvedValue({ data: { success: true, assignment: null } });
    await expect(service.getClientAssignments('42')).resolves.toEqual([]);
  });

  it('still accepts a plain array or a wrapped list', async () => {
    get.mockResolvedValue({ data: [activeAssignment] });
    await expect(service.getClientAssignments('42')).resolves.toHaveLength(1);

    get.mockResolvedValue({ data: { assignments: [activeAssignment] } });
    await expect(service.getClientAssignments('42')).resolves.toHaveLength(1);
  });
});

describe('deactivateAssignment — endpoint that exists', () => {
  it('PUTs a status change to /:id, not to the nonexistent /:id/deactivate', async () => {
    await service.deactivateAssignment('a1');

    expect(put).toHaveBeenCalledTimes(1);
    const [url, body] = put.mock.calls[0];
    expect(url).toBe('/api/client-trainer-assignments/a1');
    expect(url).not.toContain('/deactivate');
    expect(body).toMatchObject({ status: 'inactive' });
  });
});

describe('active-assignment predicates read status, not the phantom isActive', () => {
  it('unassignClient deactivates the active assignment it found', async () => {
    get.mockResolvedValue({ data: { success: true, assignment: activeAssignment } });

    await service.unassignClient('42');

    // The whole failure was that this never fired.
    expect(put).toHaveBeenCalledTimes(1);
    expect(put.mock.calls[0][0]).toBe('/api/client-trainer-assignments/a1');
  });

  it('unassignClient does nothing when the assignment is already inactive', async () => {
    get.mockResolvedValue({ data: { success: true, assignment: { ...activeAssignment, status: 'inactive' } } });

    await service.unassignClient('42');

    expect(put).not.toHaveBeenCalled();
  });

  it('isClientAssignedToTrainer returns true for an active assignment', async () => {
    get.mockResolvedValue({ data: { success: true, assignment: activeAssignment } });

    // Previously ALWAYS false, because it read a.isActive.
    await expect(service.isClientAssignedToTrainer('42', '101')).resolves.toBe(true);
  });

  it('isClientAssignedToTrainer returns false for a different trainer', async () => {
    get.mockResolvedValue({ data: { success: true, assignment: activeAssignment } });
    await expect(service.isClientAssignedToTrainer('42', '999')).resolves.toBe(false);
  });

  it('isClientAssignedToTrainer returns false when the assignment is inactive', async () => {
    get.mockResolvedValue({ data: { success: true, assignment: { ...activeAssignment, status: 'inactive' } } });
    await expect(service.isClientAssignedToTrainer('42', '101')).resolves.toBe(false);
  });
});
