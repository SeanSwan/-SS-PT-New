/**
 * Equipment dispatchers — unit tests (Slice S6)
 * =============================================
 * Covers the Swan Coach equipment command executors without touching the DB.
 * Locks: self-scoped profile listing, per-command ownership enforcement
 * (owner OR admin — same rule as equipmentRoutes.getOwnedProfile), names-only
 * flat results, and the add_item write landing as approvalStatus 'manual'
 * (NEVER auto-approved).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Op } from 'sequelize';

const mocks = vi.hoisted(() => ({
  equipmentProfile: { findByPk: vi.fn(), findAll: vi.fn() },
  equipmentItem: { findAll: vi.fn(), findOne: vi.fn(), create: vi.fn(), count: vi.fn() },
  buildReport: vi.fn(),
}));

vi.mock('../../models/index.mjs', () => ({
  getEquipmentProfile: () => mocks.equipmentProfile,
  getEquipmentItem: () => mocks.equipmentItem,
}));

vi.mock('../../services/equipmentGapReport.mjs', () => ({
  buildEquipmentGapReport: mocks.buildReport,
  COUNTED_APPROVAL_STATUSES: ['approved', 'manual'],
}));

import {
  dispatchEquipmentAddItem,
  dispatchEquipmentGapReport,
  dispatchEquipmentListItems,
  dispatchEquipmentListProfiles,
  resolveOwnedProfile,
} from '../../services/ai/dispatchers/equipmentDispatchers.mjs';

const OWNER = { id: 10, role: 'trainer' };
const INTRUDER = { id: 99, role: 'trainer' };
const ADMIN = { id: 1, role: 'admin' };

function ownedProfile(overrides = {}) {
  return { id: 5, trainerId: 10, name: 'Home Gym', update: vi.fn(), ...overrides };
}

describe('resolveOwnedProfile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('owner passes, intruder trainer is denied, admin passes', async () => {
    mocks.equipmentProfile.findByPk.mockResolvedValue(ownedProfile());

    await expect(resolveOwnedProfile(5, OWNER)).resolves.toMatchObject({ id: 5 });
    await expect(resolveOwnedProfile(5, INTRUDER)).rejects.toThrow(/own equipment profiles/);
    await expect(resolveOwnedProfile(5, ADMIN)).resolves.toMatchObject({ id: 5 });
  });

  it('missing profile → honest not-found; junk id → honest validation error', async () => {
    mocks.equipmentProfile.findByPk.mockResolvedValue(null);
    await expect(resolveOwnedProfile(123, OWNER)).rejects.toThrow(/#123 was not found/);
    await expect(resolveOwnedProfile('junk', OWNER)).rejects.toThrow(/valid equipment profile ID/);
  });
});

describe('dispatchEquipmentListProfiles', () => {
  beforeEach(() => vi.clearAllMocks());

  it('scopes to the requesting user id — even for admin — and flattens names+counts', async () => {
    mocks.equipmentProfile.findAll.mockResolvedValue([
      { id: 5, name: 'Home Gym', equipmentCount: 3 },
      { id: 6, name: 'Park', equipmentCount: 0 },
    ]);

    const result = await dispatchEquipmentListProfiles({}, { user: ADMIN });

    expect(mocks.equipmentProfile.findAll.mock.calls[0][0].where).toEqual({
      trainerId: ADMIN.id, isActive: true,
    });
    expect(result).toEqual({
      profileCount: 2,
      profiles: '#5 Home Gym (3 items), #6 Park (0 items)',
    });
  });

  it('no profiles → truthful zero, null list', async () => {
    mocks.equipmentProfile.findAll.mockResolvedValue([]);
    const result = await dispatchEquipmentListProfiles({}, { user: OWNER });
    expect(result).toEqual({ profileCount: 0, profiles: null });
  });
});

describe('dispatchEquipmentListItems', () => {
  beforeEach(() => vi.clearAllMocks());

  it('owner gets approved/manual item names + categories only', async () => {
    mocks.equipmentProfile.findByPk.mockResolvedValue(ownedProfile());
    mocks.equipmentItem.findAll.mockResolvedValue([
      { name: 'Dumbbell Set', trainerLabel: null, category: 'dumbbell', quantity: 2 },
      { name: 'Flat Bench', trainerLabel: 'Bench', category: 'bench', quantity: 1 },
    ]);

    const result = await dispatchEquipmentListItems({ profileId: 5 }, { user: OWNER });

    const query = mocks.equipmentItem.findAll.mock.calls[0][0];
    expect(query.where.profileId).toBe(5);
    expect(query.where.isActive).toBe(true);
    expect(query.where.approvalStatus).toEqual({ [Op.in]: ['approved', 'manual'] });

    expect(result).toEqual({
      profileId: 5,
      profileName: 'Home Gym',
      itemCount: 2,
      items: 'Dumbbell Set x2 [dumbbell], Bench [bench]',
    });
  });

  it('non-owner is rejected before any item read', async () => {
    mocks.equipmentProfile.findByPk.mockResolvedValue(ownedProfile());
    await expect(
      dispatchEquipmentListItems({ profileId: 5 }, { user: INTRUDER }),
    ).rejects.toThrow(/own equipment profiles/);
    expect(mocks.equipmentItem.findAll).not.toHaveBeenCalled();
  });
});

describe('dispatchEquipmentGapReport', () => {
  beforeEach(() => vi.clearAllMocks());

  it('owner gets a flat card-safe summary of the report', async () => {
    mocks.equipmentProfile.findByPk.mockResolvedValue(ownedProfile());
    mocks.buildReport.mockResolvedValue({
      profileId: 5,
      patterns: [
        { pattern: 'push', coverage: 0.5, itemCount: 1, exampleItems: ['Bench'] },
        { pattern: 'pull', coverage: 0, itemCount: 0, exampleItems: [] },
      ],
      overallCoverage: 0.06,
      weakestPattern: 'pull',
      suggestions: [
        { addition: 'Doorway pull-up bar', unlocksPatterns: ['pull', 'core'], reason: 'r' },
      ],
    });

    const result = await dispatchEquipmentGapReport({ profileId: 5 }, { user: OWNER });

    expect(mocks.buildReport).toHaveBeenCalledWith(5);
    expect(result).toEqual({
      profileId: 5,
      profileName: 'Home Gym',
      overallCoverage: '6%',
      weakestPattern: 'pull',
      patternCoverage: 'push 50%, pull 0%',
      gapPatterns: 'pull',
      topSuggestion: 'Doorway pull-up bar',
      suggestions: 'Doorway pull-up bar → pull/core',
    });
  });

  it('non-owner never reaches the report service', async () => {
    mocks.equipmentProfile.findByPk.mockResolvedValue(ownedProfile());
    await expect(
      dispatchEquipmentGapReport({ profileId: 5 }, { user: INTRUDER }),
    ).rejects.toThrow(/own equipment profiles/);
    expect(mocks.buildReport).not.toHaveBeenCalled();
  });
});

describe('dispatchEquipmentAddItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.equipmentItem.findOne.mockResolvedValue(null); // no duplicate by default
    mocks.equipmentItem.create.mockResolvedValue({ id: 77 });
    mocks.equipmentItem.count.mockResolvedValue(4);
  });

  it('creates the item as approvalStatus manual — NEVER approved — and refreshes the cached count', async () => {
    const profile = ownedProfile();
    mocks.equipmentProfile.findByPk.mockResolvedValue(profile);

    const result = await dispatchEquipmentAddItem(
      { profileId: 5, name: '  Kettlebell 16kg  ', category: 'kettlebell', quantity: 2 },
      { user: OWNER },
    );

    expect(mocks.equipmentItem.create).toHaveBeenCalledWith({
      profileId: 5,
      name: 'Kettlebell 16kg',
      category: 'kettlebell',
      quantity: 2,
      approvalStatus: 'manual',
      isActive: true,
    });
    expect(profile.update).toHaveBeenCalledWith({ equipmentCount: 4 });
    expect(result).toEqual({
      itemId: 77,
      profileId: 5,
      profileName: 'Home Gym',
      name: 'Kettlebell 16kg',
      category: 'kettlebell',
      quantity: 2,
      approvalStatus: 'manual',
    });
  });

  it('unknown category coerces to other; missing quantity defaults to 1', async () => {
    mocks.equipmentProfile.findByPk.mockResolvedValue(ownedProfile());

    await dispatchEquipmentAddItem({ profileId: 5, name: 'Mystery Gear' }, { user: OWNER });

    expect(mocks.equipmentItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'other', quantity: 1, approvalStatus: 'manual' }),
    );
  });

  it('whitespace-only name (passes zod min(1)) → honest error, nothing created', async () => {
    mocks.equipmentProfile.findByPk.mockResolvedValue(ownedProfile());

    await expect(
      dispatchEquipmentAddItem({ profileId: 5, name: '   ' }, { user: OWNER }),
    ).rejects.toThrow(/name is required/);
    expect(mocks.equipmentItem.create).not.toHaveBeenCalled();
  });

  it('duplicate active name → honest error, nothing created', async () => {
    mocks.equipmentProfile.findByPk.mockResolvedValue(ownedProfile());
    mocks.equipmentItem.findOne.mockResolvedValue({ id: 3, name: 'Kettlebell 16kg' });

    await expect(
      dispatchEquipmentAddItem({ profileId: 5, name: 'Kettlebell 16kg' }, { user: OWNER }),
    ).rejects.toThrow(/already exists/);
    expect(mocks.equipmentItem.create).not.toHaveBeenCalled();
  });

  it('unique-index race surfaces as the same honest duplicate error', async () => {
    mocks.equipmentProfile.findByPk.mockResolvedValue(ownedProfile());
    const err = new Error('dup');
    err.name = 'SequelizeUniqueConstraintError';
    mocks.equipmentItem.create.mockRejectedValue(err);

    await expect(
      dispatchEquipmentAddItem({ profileId: 5, name: 'Band' }, { user: OWNER }),
    ).rejects.toThrow(/already exists/);
  });

  it('non-owner is rejected before any write', async () => {
    mocks.equipmentProfile.findByPk.mockResolvedValue(ownedProfile());
    await expect(
      dispatchEquipmentAddItem({ profileId: 5, name: 'Band' }, { user: INTRUDER }),
    ).rejects.toThrow(/own equipment profiles/);
    expect(mocks.equipmentItem.create).not.toHaveBeenCalled();
  });
});
