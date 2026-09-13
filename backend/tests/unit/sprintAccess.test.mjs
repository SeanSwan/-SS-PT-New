/**
 * ============================================================================
 * FILE: sprintAccess.test.mjs — S08 / R-H03.
 * The access contract: strict identifier normalization, trusted actor
 * validation, and non-disclosing ownership.
 * ============================================================================
 */

import { describe, expect, it, vi } from 'vitest';
import {
  isAdminActor,
  normalizeActor,
  normalizePositiveSafeInteger,
  requireChildOfSprint,
  requireOptionalOwnedSprint,
  requireOwnedSpaceProfile,
  requireOwnedSprint,
  SprintActorForbiddenError,
  SprintIdInvalidError,
  SprintObjectNotFoundError,
} from '../../services/bootcamp/sprintAccess.mjs';

const OWNER = { userId: 7, role: 'trainer' };
const FOREIGN = { userId: 8, role: 'trainer' };
const ADMIN = { userId: 99, role: 'admin' };

describe('normalizePositiveSafeInteger', () => {
  it('accepts positive safe integers and trimmed decimal digit strings', () => {
    expect(normalizePositiveSafeInteger(7)).toBe(7);
    expect(normalizePositiveSafeInteger('7')).toBe(7);
    expect(normalizePositiveSafeInteger(' 42 ')).toBe(42);
    expect(normalizePositiveSafeInteger(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('rejects zero, negatives, fractions, unsafe values and non-finite numbers', () => {
    for (const bad of [0, -1, -0.5, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 2, '0', '-3', '1.5']) {
      expect(() => normalizePositiveSafeInteger(bad)).toThrow(SprintIdInvalidError);
    }
  });

  it('rejects junk suffixes, exponent notation, blanks and non-string/number input', () => {
    for (const bad of ['12abc', '1e3', '0x10', '', '   ', '+7', '7 7', null, undefined, {}, [], true,
      () => 1, Symbol('7')]) {
      expect(() => normalizePositiveSafeInteger(bad)).toThrow(SprintIdInvalidError);
    }
  });

  it('carries a 400 status and a reason code for sanitized route mapping', () => {
    try {
      normalizePositiveSafeInteger('nope');
      throw new Error('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(SprintIdInvalidError);
      expect(error.status).toBe(400);
      expect(error.code).toBe('SPRINT_ID_INVALID');
    }
  });
});

describe('normalizeActor', () => {
  it('normalizes a trusted actor', () => {
    expect(normalizeActor({ userId: 7, role: 'trainer' })).toEqual({ userId: 7, role: 'trainer' });
    expect(normalizeActor({ userId: '7', role: ' admin ' })).toEqual({ userId: 7, role: 'admin' });
  });

  it('forbids anything that is not an exact admin/trainer actor with a real user id', () => {
    for (const bad of [null, undefined, {}, [], 'trainer', { userId: 7 }, { role: 'trainer' },
      { userId: 7, role: 'client' }, { userId: 7, role: 'superadmin' }, { userId: 7, role: '' },
      { userId: 0, role: 'trainer' }, { userId: -1, role: 'trainer' }, { userId: 1.5, role: 'trainer' },
      { userId: 'abc', role: 'trainer' }, { userId: { id: 7 }, role: 'trainer' }]) {
      expect(() => normalizeActor(bad)).toThrow(SprintActorForbiddenError);
    }
    expect(() => normalizeActor(null)).toThrow(/Access denied/);
  });

  it('exposes the admin check without trusting anything else', () => {
    expect(isAdminActor({ userId: 1, role: 'admin' })).toBe(true);
    expect(isAdminActor({ userId: 1, role: 'trainer' })).toBe(false);
    expect(isAdminActor(null)).toBe(false);
  });
});

describe('requireOwnedSprint', () => {
  const sprint = { id: 12, trainerId: 7 };
  const getSprint = vi.fn(async (id) => (id === 12 ? sprint : null));

  it('returns the owner scope and the stored data owner', async () => {
    const result = await requireOwnedSprint('12', OWNER, { getSprint });
    expect(result.sprint).toBe(sprint);
    expect(result.sprintId).toBe(12);
    expect(result.actor).toEqual(OWNER);
    expect(result.dataOwnerTrainerId).toBe(7);
    expect(result.actingAsAdmin).toBe(false);
  });

  it('passes the NORMALIZED integer to the model lookup', async () => {
    getSprint.mockClear();
    await requireOwnedSprint(' 12 ', OWNER, { getSprint });
    expect(getSprint).toHaveBeenCalledWith(12);
    expect(typeof getSprint.mock.calls[0][0]).toBe('number');
  });

  it('reports a foreign Sprint exactly like an absent one (non-disclosing)', async () => {
    const missing = await requireOwnedSprint(999, FOREIGN, { getSprint }).catch(e => e);
    const foreign = await requireOwnedSprint(12, FOREIGN, { getSprint }).catch(e => e);

    expect(missing).toBeInstanceOf(SprintObjectNotFoundError);
    expect(foreign).toBeInstanceOf(SprintObjectNotFoundError);
    expect(foreign.message).toBe(missing.message);
    expect(foreign.status).toBe(404);
    expect(foreign.message).not.toMatch(/own|belong|foreign|another|permission/i);
  });

  it('lets an explicit admin through WITHOUT taking ownership', async () => {
    const result = await requireOwnedSprint(12, ADMIN, { getSprint });
    expect(result.actingAsAdmin).toBe(true);
    // The Sprint's trainer remains the data owner; the admin id is not adopted.
    expect(result.dataOwnerTrainerId).toBe(7);
    expect(result.dataOwnerTrainerId).not.toBe(ADMIN.userId);
  });

  it('rejects a malformed id BEFORE any model lookup', async () => {
    const spy = vi.fn();
    await expect(requireOwnedSprint('12abc', OWNER, { getSprint: spy })).rejects.toBeInstanceOf(SprintIdInvalidError);
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects a bad actor BEFORE any model lookup', async () => {
    const spy = vi.fn();
    await expect(requireOwnedSprint(12, { userId: 7, role: 'client' }, { getSprint: spy }))
      .rejects.toBeInstanceOf(SprintActorForbiddenError);
    await expect(requireOwnedSprint(12, null, { getSprint: spy }))
      .rejects.toBeInstanceOf(SprintActorForbiddenError);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('requireChildOfSprint', () => {
  it('accepts a child that belongs to the authorized Sprint', () => {
    expect(requireChildOfSprint({ id: 3, sprintId: 12 }, 12)).toMatchObject({ id: 3 });
    // String-vs-number comparison goes through the common normalization.
    expect(requireChildOfSprint({ id: 3, sprintId: '12' }, '12')).toMatchObject({ id: 3 });
  });

  it('reports a foreign or absent child as not found', () => {
    for (const child of [null, undefined, { id: 3, sprintId: 13 }, { id: 3 }, { id: 3, sprintId: null }]) {
      expect(() => requireChildOfSprint(child, 12)).toThrow(SprintObjectNotFoundError);
    }
  });
});

describe('requireOptionalOwnedSprint', () => {
  const getSprint = vi.fn(async (id) => (id === 12 ? { id: 12, trainerId: 7 } : null));

  it('returns null only when no previous Sprint was referenced', async () => {
    expect(await requireOptionalOwnedSprint(undefined, OWNER, { getSprint })).toBeNull();
    expect(await requireOptionalOwnedSprint(null, OWNER, { getSprint })).toBeNull();
    expect(await requireOptionalOwnedSprint('', OWNER, { getSprint })).toBeNull();
  });

  it('authorizes a referenced previous Sprint under the same actor', async () => {
    const spy = vi.fn(async () => ({ id: 12, trainerId: 7 }));
    await requireOptionalOwnedSprint(12, OWNER, { getSprint: spy });
    expect(spy).toHaveBeenCalledWith(12);

    // A foreign previous Sprint is refused BEFORE its exclusions are read.
    const foreign = vi.fn(async () => ({ id: 12, trainerId: 8 }));
    await expect(requireOptionalOwnedSprint(12, OWNER, { getSprint: foreign }))
      .rejects.toBeInstanceOf(SprintObjectNotFoundError);
  });
});

/**
 * A space profile is an optional cross-table reference on Sprint create. It was
 * written to an INTEGER column straight from the request body, so `'abc'`
 * reached PostgreSQL (a 500) and a trainer could reference ANOTHER trainer's
 * profile. These are the direct unit locks for the boundary that closed it.
 */
describe('requireOwnedSpaceProfile', () => {
  const profileFor = (ownerId) => vi.fn(async (id) => (id === 5 ? { id: 5, trainerId: ownerId } : null));

  it('returns null only when no profile was referenced', async () => {
    const spy = vi.fn();
    for (const absent of [undefined, null, '']) {
      expect(await requireOwnedSpaceProfile(absent, OWNER, { getSpaceProfile: spy })).toBeNull();
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it('authorizes the caller OWN profile and returns the NORMALIZED integer', async () => {
    const spy = profileFor(7);
    expect(await requireOwnedSpaceProfile('5', OWNER, { getSpaceProfile: spy })).toBe(5);
    expect(spy).toHaveBeenCalledWith(5);
    expect(typeof spy.mock.calls[0][0]).toBe('number');
  });

  it('reports a FOREIGN profile exactly like an absent one (non-disclosing)', async () => {
    const get = vi.fn(async (id) => (id === 5 ? { id: 5, trainerId: 8 } : null));
    const missing = await requireOwnedSpaceProfile(999, OWNER, { getSpaceProfile: get }).catch(e => e);
    const foreign = await requireOwnedSpaceProfile(5, OWNER, { getSpaceProfile: get }).catch(e => e);

    expect(missing).toBeInstanceOf(SprintObjectNotFoundError);
    expect(foreign).toBeInstanceOf(SprintObjectNotFoundError);
    expect(foreign.message).toBe(missing.message);
    expect(foreign.status).toBe(404);
    expect(foreign.message).not.toMatch(/own|belong|foreign|another|permission/i);
  });

  it('lets an admin use a foreign profile', async () => {
    expect(await requireOwnedSpaceProfile(5, ADMIN, { getSpaceProfile: profileFor(8) })).toBe(5);
  });

  it('rejects a malformed id BEFORE any model lookup', async () => {
    const spy = vi.fn();
    for (const bad of ['abc', '12abc', 0, -1, 1.5, {}]) {
      await expect(requireOwnedSpaceProfile(bad, OWNER, { getSpaceProfile: spy })).rejects.toThrow();
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it('fails CLOSED when no accessor is supplied', async () => {
    // A caller that forgets to inject the model must not silently skip the check.
    await expect(requireOwnedSpaceProfile(5, OWNER, {}))
      .rejects.toBeInstanceOf(SprintObjectNotFoundError);
    await expect(requireOwnedSpaceProfile(5, OWNER))
      .rejects.toBeInstanceOf(SprintObjectNotFoundError);
  });

  it('rejects a bad actor before touching the model', async () => {
    const spy = vi.fn();
    await expect(requireOwnedSpaceProfile(5, { userId: 7, role: 'client' }, { getSpaceProfile: spy }))
      .rejects.toBeInstanceOf(SprintActorForbiddenError);
    expect(spy).not.toHaveBeenCalled();
  });
});
