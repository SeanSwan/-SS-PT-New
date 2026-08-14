/**
 * ============================================================================
 * FILE: sessionBlockAuthorization.test.mjs
 * PURPOSE: Pin the actor/subject rule for blocked-time creation at the SERVICE
 *          boundary — a trainer may only block their OWN calendar.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-13 (Swan Coach V3 · S1 · F7)
 * ============================================================================
 *
 * THE DEFECT THIS PINS
 * `createBlockedSessions` resolved the subject as:
 *
 *     trainerId: trainerId || (user.role === 'trainer' ? user.id : null)
 *
 * The submitted value short-circuits the `||`, so the authenticated identity is
 * never consulted. An authenticated trainer could POST another trainer's id and
 * write blocked rows onto that trainer's calendar. With a recurrence rule, every
 * generated date lands on the victim.
 *
 * WHY THIS IS A REGRESSION, NOT AN OVERSIGHT
 * The retired `routes/sessionRoutes.mjs` copy has the clamp the right way round —
 * `req.user.role === 'trainer' ? req.user.id : (trainerId || null)` — actor first.
 * The unified service reversed the operands. The protection existed and was lost.
 *
 * WHY THE SERVICE AND NOT ONLY THE ROUTE
 * The route is not the only caller. A service-level policy test means a future
 * caller (an AI command lane, a script, a new route) cannot reintroduce the hole
 * by forgetting to clamp at its own boundary. Route-level coverage lives in
 * tests/api/sessionBlockAuthorization.test.mjs.
 *
 * WHY MOCKS: the property under test is authorization arithmetic on the row
 * payload. `bulkCreate` is spied so the exact rows the service WOULD write are
 * asserted without a database, and "zero rows" is provable rather than inferred.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sequelize, transaction, Session, SessionType, User } = vi.hoisted(() => {
  const transaction = {
    LOCK: { UPDATE: 'UPDATE' },
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
  };
  return {
    transaction,
    sequelize: {
      transaction: vi.fn().mockResolvedValue(transaction),
      query: vi.fn().mockResolvedValue([]),
      literal: vi.fn((v) => v),
      fn: vi.fn(),
      col: vi.fn(),
    },
    Session: {
      bulkCreate: vi.fn(async (rows) => rows.map((r, i) => ({ ...r, id: 1000 + i }))),
      findByPk: vi.fn(),
      findAll: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      update: vi.fn(),
    },
    SessionType: { findByPk: vi.fn() },
    User: { findByPk: vi.fn(), findAll: vi.fn().mockResolvedValue([]), findOne: vi.fn() },
  };
});

vi.mock('../../database.mjs', () => ({ default: sequelize, sequelize }));
vi.mock('../../models/Session.mjs', () => ({ default: Session }));
vi.mock('../../models/User.mjs', () => ({ default: User }));
vi.mock('../../models/index.mjs', () => ({
  getSession: () => Session,
  getSessionType: () => SessionType,
  getUser: () => User,
  getOrder: () => ({ findByPk: vi.fn() }),
  getOrderItem: () => ({ findAll: vi.fn() }),
  getStorefrontItem: () => ({ findByPk: vi.fn() }),
  getFinancialTransaction: () => ({ create: vi.fn() }),
}));
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../services/realTimeScheduleService.mjs', () => ({
  default: { broadcastSessionUpdate: vi.fn(), emitScheduleChange: vi.fn() },
}));
vi.mock('../../services/automationService.mjs', () => ({ triggerSequence: vi.fn() }));

const TRAINER = { id: 41, role: 'trainer', email: 'trainer-a@example.test' };
const OTHER_TRAINER_ID = 77;
const ADMIN = { id: 9, role: 'admin', email: 'admin@example.test' };
const BASE_DATE = '2026-09-01T17:00:00.000Z';

/** Every trainerId the service actually tried to persist, across all rows. */
const persistedTrainerIds = () =>
  Session.bulkCreate.mock.calls.flatMap(([rows]) => rows.map((r) => r.trainerId));

/** Total rows the service attempted to write. */
const persistedRowCount = () =>
  Session.bulkCreate.mock.calls.reduce((n, [rows]) => n + rows.length, 0);

let service;

describe('UnifiedSessionService.createBlockedSessions — actor/subject containment (F7)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    Session.bulkCreate.mockImplementation(async (rows) => rows.map((r, i) => ({ ...r, id: 1000 + i })));
    if (!service) {
      ({ default: service } = await import('../../services/sessions/session.service.mjs'));
    }
  });

  it('binds a trainer to their own calendar when trainerId is omitted', async () => {
    await service.createBlockedSessions({ sessionDate: BASE_DATE, duration: 60 }, TRAINER);

    expect(persistedTrainerIds()).toEqual([TRAINER.id]);
  });

  it('accepts a trainer explicitly naming themselves', async () => {
    await service.createBlockedSessions(
      { sessionDate: BASE_DATE, duration: 60, trainerId: TRAINER.id },
      TRAINER,
    );

    expect(persistedTrainerIds()).toEqual([TRAINER.id]);
  });

  it('REFUSES a trainer targeting another trainer, and writes zero rows', async () => {
    // The P0. Before the fix this resolves to OTHER_TRAINER_ID and persists a row
    // on the victim's calendar. Refusing (rather than silently clamping) makes
    // misuse loud instead of writing to a calendar the caller did not name.
    await expect(
      service.createBlockedSessions(
        { sessionDate: BASE_DATE, duration: 60, trainerId: OTHER_TRAINER_ID },
        TRAINER,
      ),
    ).rejects.toThrow(/not authorized|another trainer|own calendar/i);

    expect(persistedRowCount()).toBe(0);
    expect(persistedTrainerIds()).not.toContain(OTHER_TRAINER_ID);
  });

  it('REFUSES a cross-trainer target even when the id arrives as a string', async () => {
    // `"77" || …` is truthy exactly like the number, and a JSON body trivially
    // carries a string. A numeric-only comparison would let this straight through.
    await expect(
      service.createBlockedSessions(
        { sessionDate: BASE_DATE, duration: 60, trainerId: String(OTHER_TRAINER_ID) },
        TRAINER,
      ),
    ).rejects.toThrow(/not authorized|another trainer|own calendar/i);

    expect(persistedRowCount()).toBe(0);
  });

  it('accepts a trainer naming themselves as a string (no false refusal)', async () => {
    // The mirror of the case above: the clamp must compare by value, not identity,
    // or the normal UI path — which posts `String(user.id)` — breaks.
    await service.createBlockedSessions(
      { sessionDate: BASE_DATE, duration: 60, trainerId: String(TRAINER.id) },
      TRAINER,
    );

    expect(persistedTrainerIds()).toEqual([TRAINER.id]);
  });

  it('does not let a recurrence rule escape the authenticated trainer', async () => {
    // Recurrence multiplies the defect: every generated date carried the same
    // unclamped subject, so one request wrote N rows onto the victim's calendar.
    await expect(
      service.createBlockedSessions(
        {
          sessionDate: BASE_DATE,
          duration: 60,
          trainerId: OTHER_TRAINER_ID,
          recurrenceRule: 'FREQ=WEEKLY;COUNT=4',
        },
        TRAINER,
      ),
    ).rejects.toThrow(/not authorized|another trainer|own calendar/i);

    expect(persistedRowCount()).toBe(0);
  });

  it('clamps every occurrence of a legitimate trainer recurrence to that trainer', async () => {
    await service.createBlockedSessions(
      { sessionDate: BASE_DATE, duration: 60, recurrenceRule: 'FREQ=WEEKLY;COUNT=4' },
      TRAINER,
    );

    const ids = persistedTrainerIds();
    expect(ids.length).toBeGreaterThan(1);
    expect(new Set(ids)).toEqual(new Set([TRAINER.id]));
  });

  it('still allows an admin to target an explicit trainer', async () => {
    // The clamp must not become an outage for the admin workflow it does not govern.
    await service.createBlockedSessions(
      { sessionDate: BASE_DATE, duration: 60, trainerId: OTHER_TRAINER_ID },
      ADMIN,
    );

    expect(persistedTrainerIds()).toEqual([OTHER_TRAINER_ID]);
  });

  it('allows an admin to block unassigned studio time', async () => {
    await service.createBlockedSessions({ sessionDate: BASE_DATE, duration: 60 }, ADMIN);

    expect(persistedTrainerIds()).toEqual([null]);
  });

  it('rejects a malformed target before any mutation', async () => {
    await expect(
      service.createBlockedSessions(
        { sessionDate: BASE_DATE, duration: 60, trainerId: 'not-a-number' },
        ADMIN,
      ),
    ).rejects.toThrow(/invalid/i);

    expect(persistedRowCount()).toBe(0);
  });

  it('rejects a non-positive target before any mutation', async () => {
    await expect(
      service.createBlockedSessions({ sessionDate: BASE_DATE, duration: 60, trainerId: -3 }, ADMIN),
    ).rejects.toThrow(/invalid/i);

    expect(persistedRowCount()).toBe(0);
  });

  it.each([
    ['boolean true', true],
    ['single-element array', [77]],
    ['object', { id: 77 }],
    ['zero', 0],
    ['float', 4.5],
  ])('rejects a %s target instead of coercing it into an id', async (_label, trainerId) => {
    // Number(true) === 1 and Number([77]) === 77. A validator built on Number()
    // alone turns junk into a real, existing trainer id — silently, and with a
    // 201. Caught while attacking my own fix, not by the original tests.
    await expect(
      service.createBlockedSessions({ sessionDate: BASE_DATE, duration: 60, trainerId }, ADMIN),
    ).rejects.toThrow(/invalid/i);

    expect(persistedRowCount()).toBe(0);
  });

  it('keeps refusing roles that may not block time at all', async () => {
    await expect(
      service.createBlockedSessions(
        { sessionDate: BASE_DATE, duration: 60, trainerId: OTHER_TRAINER_ID },
        { id: 5, role: 'client' },
      ),
    ).rejects.toThrow(/admin or trainer/i);

    expect(persistedRowCount()).toBe(0);
  });
});
