/**
 * ============================================================================
 * DATA-SUBJECT RIGHTS — export + erasure  (SWA-75, 2026-07-29)
 * ============================================================================
 *
 * WHY THIS EXISTS
 * Kimi K3 named this the top thing missing entirely: the platform holds minors'
 * data, health/injury notes, photos and payment history, and there was NO path
 * for a parent asking to see or delete their child's data. Verified before
 * building — the repo's only `deleteAccount` was an unrelated social-integration
 * method.
 *
 * The tests that matter most are the REFUSALS. Erasure is irreversible; a bug
 * here destroys a paying client's record.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const {
  exportAccountData,
  eraseAccountData,
  erasureConfirmationFor,
  IDENTIFYING_USER_FIELDS,
  MAX_EXPORT_ROWS_PER_MODEL,
  DataRightsError,
} = await import('../../services/admin/accountDataRightsService.mjs');

const makeUser = (over = {}) => ({
  id: 61,
  role: 'client',
  firstName: 'Alex',
  lastName: 'Rivera',
  email: 'alex@example.test',
  username: 'alexr',
  phone: '555-0100',
  photo: 'https://cdn.test/a.jpg',
  dateOfBirth: '2009-04-02',
  emergencyContact: 'Parent 555-0111',
  bio: 'plays soccer',
  createdAt: '2026-01-01T00:00:00Z',
  update: vi.fn(async function (payload) { Object.assign(this, payload); return this; }),
  toJSON() { return { ...this }; },
  ...over,
});

const makeModels = (user) => ({
  User: { findByPk: vi.fn(async () => user) },
  ClientProgress: {
    findAll: vi.fn(async () => [{ id: 1, userId: 61, toJSON: () => ({ id: 1, userId: 61 }) }]),
    destroy: vi.fn(async () => 1),
  },
  BodyMeasurement: { findAll: vi.fn(async () => []), destroy: vi.fn(async () => 0) },
});

const fakeSequelize = { transaction: async (fn) => fn({ id: 'tx' }) };

beforeEach(() => vi.clearAllMocks());

describe('export', () => {
  it('returns the subject profile and their owned records', async () => {
    const user = makeUser();
    const out = await exportAccountData({ targetUserId: 61, models: makeModels(user), actor: { id: 1 } });
    expect(out.subject.email).toBe('alex@example.test');
    expect(out.subject.id).toBe(61);
    expect(out.records.ClientProgress).toHaveLength(1);
    expect(out.exportedAt).toBeTruthy();
  });

  it('states plainly that financial history is retained and excluded', async () => {
    const out = await exportAccountData({ targetUserId: 61, models: makeModels(makeUser()), actor: { id: 1 } });
    expect(out.note).toMatch(/retained for accounting/i);
  });

  it('survives a model whose table is missing rather than failing the export', async () => {
    const models = makeModels(makeUser());
    models.ClientProgress.findAll = vi.fn(async () => { throw new Error('relation does not exist'); });
    const out = await exportAccountData({ targetUserId: 61, models, actor: { id: 1 } });
    expect(out.records.ClientProgress).toEqual({ unavailable: true });
    expect(out.subject.id).toBe(61);
  });

  it.each([[0], [-1], ['abc'], [null]])('rejects an invalid target id (%s)', async (bad) => {
    await expect(exportAccountData({ targetUserId: bad, models: makeModels(makeUser()), actor: { id: 1 } }))
      .rejects.toThrow(DataRightsError);
  });

  it('404s an absent user', async () => {
    const models = makeModels(null);
    models.User.findByPk = vi.fn(async () => null);
    await expect(exportAccountData({ targetUserId: 61, models, actor: { id: 1 } })).rejects.toThrow(/not found/i);
  });
});

describe('erasure — the refusals', () => {
  const base = (over = {}) => ({
    targetUserId: 61,
    confirmation: erasureConfirmationFor(61),
    models: makeModels(makeUser()),
    sequelize: fakeSequelize,
    actor: { id: 1, role: 'admin' },
    ...over,
  });

  it('REFUSES without a confirmation', async () => {
    await expect(eraseAccountData(base({ confirmation: undefined }))).rejects.toThrow(/confirmation/i);
  });

  // A confirmation for a DIFFERENT account must not work here.
  it('REFUSES a confirmation naming another account', async () => {
    await expect(eraseAccountData(base({ confirmation: erasureConfirmationFor(62) })))
      .rejects.toThrow(/confirmation/i);
  });

  it('REFUSES self-erasure', async () => {
    await expect(eraseAccountData(base({ actor: { id: 61, role: 'admin' } })))
      .rejects.toThrow(/your own account/i);
  });

  it('REFUSES erasing an admin', async () => {
    const admin = makeUser({ role: 'admin' });
    await expect(eraseAccountData(base({ models: makeModels(admin) })))
      .rejects.toThrow(/Admin accounts cannot be erased/i);
  });

  it('404s an absent user', async () => {
    const models = makeModels(null);
    models.User.findByPk = vi.fn(async () => null);
    await expect(eraseAccountData(base({ models }))).rejects.toThrow(/not found/i);
  });
});

/**
 * Second hostile probe, 2026-07-29 — adversarial inputs the first pass never
 * tried. All three of these were real defects in the shipped service.
 */
describe('erasure — hostile input handling', () => {
  const base = (over = {}) => ({
    targetUserId: 61,
    confirmation: erasureConfirmationFor(61),
    models: makeModels(makeUser()),
    sequelize: fakeSequelize,
    actor: { id: 1, role: 'admin' },
    ...over,
  });

  // An irreversible operation must be attributable, or the audit row says
  // actorId: null and nobody can answer "who erased this client?".
  it('REFUSES to run without an identified actor', async () => {
    await expect(eraseAccountData(base({ actor: undefined }))).rejects.toThrow(/identified actor/i);
  });

  it.each([[{}], [{ id: null }], [{ id: 'abc' }], [{ id: 0 }]])(
    'REFUSES an unusable actor %j', async (actor) => {
      await expect(eraseAccountData(base({ actor }))).rejects.toThrow(/identified actor/i);
    }
  );

  // A strict === on the role let a user stored as 'Admin' be erased.
  it.each([['Admin'], ['ADMIN'], [' admin ']])(
    'REFUSES to erase a user whose role is %s (case/whitespace variant)', async (role) => {
      const u = makeUser({ role });
      await expect(eraseAccountData(base({ models: makeModels(u) })))
        .rejects.toThrow(/Admin accounts cannot be erased/i);
    }
  );

  it('still blocks self-erasure when the actor id arrives as a string', async () => {
    await expect(eraseAccountData(base({ actor: { id: '61', role: 'admin' } })))
      .rejects.toThrow(/your own account/i);
  });
});

describe('export — bounded so it cannot become a memory event', () => {
  it('caps rows per model and DISCLOSES the truncation', async () => {
    const many = Array.from({ length: MAX_EXPORT_ROWS_PER_MODEL + 500 }, (_, i) => ({
      id: i, toJSON: () => ({ id: i }),
    }));
    const models = makeModels(makeUser());
    models.ClientProgress.findAll = vi.fn(async () => many);

    const out = await exportAccountData({ targetUserId: 61, models, actor: { id: 1 } });

    expect(out.records.ClientProgress).toHaveLength(MAX_EXPORT_ROWS_PER_MODEL);
    // A truncated export must never be mistaken for a complete one.
    expect(out.records.ClientProgress__truncated).toBeDefined();
    expect(out.records.ClientProgress__truncated.note).toMatch(/more records exist/i);
  });

  it('does not mark a small result as truncated', async () => {
    const out = await exportAccountData({ targetUserId: 61, models: makeModels(makeUser()), actor: { id: 1 } });
    expect(out.records.ClientProgress__truncated).toBeUndefined();
  });

  it('pushes the limit into the QUERY, not just the slice', async () => {
    const models = makeModels(makeUser());
    await exportAccountData({ targetUserId: 61, models, actor: { id: 1 } });
    expect(models.ClientProgress.findAll.mock.calls[0][0].limit).toBeGreaterThan(0);
  });
});

describe('erasure — what it actually does', () => {
  it('destroys every identifying field', async () => {
    const user = makeUser();
    const models = makeModels(user);
    await eraseAccountData({
      targetUserId: 61, confirmation: erasureConfirmationFor(61),
      models, sequelize: fakeSequelize, actor: { id: 1, role: 'admin' },
    });
    const payload = user.update.mock.calls[0][0];
    for (const f of IDENTIFYING_USER_FIELDS) {
      expect(Object.prototype.hasOwnProperty.call(payload, f)).toBe(true);
    }
    expect(payload.firstName).toBe('Erased');
    expect(payload.email).toBe('erased-61@deleted.invalid');
    expect(payload.phone).toBeNull();
    expect(payload.dateOfBirth).toBeNull();
    expect(payload.emergencyContact).toBeNull();
    expect(payload.isActive).toBe(false);
  });

  it('leaves NO original PII in the update payload', async () => {
    const user = makeUser();
    const models = makeModels(user);
    await eraseAccountData({
      targetUserId: 61, confirmation: erasureConfirmationFor(61),
      models, sequelize: fakeSequelize, actor: { id: 1, role: 'admin' },
    });
    const s = JSON.stringify(user.update.mock.calls[0][0]);
    for (const pii of ['Alex', 'Rivera', 'alex@example.test', '555-0100', '2009-04-02', 'Parent 555-0111', 'plays soccer']) {
      expect(s).not.toContain(pii);
    }
  });

  it('clears owned records and reports what it removed', async () => {
    const models = makeModels(makeUser());
    const out = await eraseAccountData({
      targetUserId: 61, confirmation: erasureConfirmationFor(61),
      models, sequelize: fakeSequelize, actor: { id: 1, role: 'admin' },
    });
    expect(models.ClientProgress.destroy).toHaveBeenCalled();
    expect(out.recordsCleared.find((r) => r.model === 'ClientProgress').removed).toBe(1);
  });

  it('writes an audit row naming actor and target', async () => {
    const writeAudit = vi.fn(async () => {});
    await eraseAccountData({
      targetUserId: 61, confirmation: erasureConfirmationFor(61),
      models: makeModels(makeUser()), sequelize: fakeSequelize,
      actor: { id: 7, role: 'admin' }, writeAudit,
    });
    expect(writeAudit).toHaveBeenCalledOnce();
    const a = writeAudit.mock.calls[0][0];
    expect(a.action).toBe('account_erasure');
    expect(a.actorId).toBe(7);
    expect(a.targetUserId).toBe(61);
  });

  it('runs inside a single transaction', async () => {
    const tx = vi.fn(async (fn) => fn({ id: 'tx' }));
    await eraseAccountData({
      targetUserId: 61, confirmation: erasureConfirmationFor(61),
      models: makeModels(makeUser()), sequelize: { transaction: tx },
      actor: { id: 1, role: 'admin' },
    });
    expect(tx).toHaveBeenCalledOnce();
  });

  // Financial integrity: the books must survive an erasure.
  it('does NOT touch orders or financial transactions', async () => {
    const models = makeModels(makeUser());
    models.Order = { destroy: vi.fn(), findAll: vi.fn() };
    models.FinancialTransaction = { destroy: vi.fn(), findAll: vi.fn() };
    const out = await eraseAccountData({
      targetUserId: 61, confirmation: erasureConfirmationFor(61),
      models, sequelize: fakeSequelize, actor: { id: 1, role: 'admin' },
    });
    expect(models.Order.destroy).not.toHaveBeenCalled();
    expect(models.FinancialTransaction.destroy).not.toHaveBeenCalled();
    expect(out.retained).toMatch(/financial/i);
  });
});
