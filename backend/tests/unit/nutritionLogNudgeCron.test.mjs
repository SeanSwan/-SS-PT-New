/**
 * nutritionLogNudgeCron tick contract (nutrition blueprint Phase 3, S3.3).
 * Locks: kill-switch default OFF, consent hard opt-out, the atomic
 * nudge_dispatches claim as the ONLY send gate (Kimi P0-5 — lose the claim,
 * lose the send), quiet-hours skip by user-local hour, established-logger
 * targeting (never nudge a never-logger), never-throws resilience, and the
 * ED-safe copy law: NO guilt verbs, NO fake urgency, NO streak-loss framing
 * in ANY pool (S3.4 launch blocker).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../models/index.mjs', () => ({
  getUser: vi.fn(),
  getModel: vi.fn(),
}));
vi.mock('../../controllers/notificationController.mjs', () => ({
  createNotification: vi.fn(),
}));
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const {
  runNutritionLogNudgeTick,
  isNutritionLogNudgeEnabled,
  nudgeDays,
  hasNutritionReminderConsent,
  isWithinSendWindow,
  pickNudgeCopy,
  claimNudgeDispatch,
  NUDGE_COPY_POOLS,
  NUDGE_TYPE,
  NUDGE_LINK,
} = await import('../../services/nutritionLogNudgeCron.mjs');

// 18:00 UTC = 11:00 America/Los_Angeles — inside the send window for the default zone.
const NOW = new Date('2026-08-04T18:00:00Z');

const harness = ({ clients = [], recentLogFor = [], activityFor = [], claimWonFor = null, priorCounts = {} } = {}) => {
  const notify = vi.fn().mockResolvedValue({ success: true });
  // type: QueryTypes.SELECT → sequelize returns the rows array directly.
  const query = vi.fn(async (sql, { bind }) => {
    if (/^INSERT INTO nudge_dispatches/.test(sql.trim())) {
      const won = claimWonFor === null ? true : claimWonFor.includes(bind[0]);
      return won ? [{ id: 1 }] : [];
    }
    return [{ count: priorCounts[bind[0]] ?? 0 }];
  });
  // Per-client call sequencing: call 1 = recent-window probe, call 2 = 30d-activity probe.
  const perClientCalls = new Map();
  const deps = {
    User: { findAll: vi.fn().mockResolvedValue(clients) },
    DailyMacroLog: {
      findOne: vi.fn(({ where }) => {
        const id = where.userId;
        const n = (perClientCalls.get(id) ?? 0) + 1;
        perClientCalls.set(id, n);
        if (n === 1) return Promise.resolve(recentLogFor.includes(id) ? { id: 'log' } : null);
        return Promise.resolve(activityFor.includes(id) ? { id: 'log' } : null);
      }),
    },
    sequelize: { query },
    notify,
    env: {},
    now: NOW,
  };
  return { deps, notify, query };
};

beforeEach(() => vi.clearAllMocks());

describe('kill switch + config + consent', () => {
  it('is OFF by default and only exactly "true" enables it', () => {
    expect(isNutritionLogNudgeEnabled({})).toBe(false);
    expect(isNutritionLogNudgeEnabled({ ENABLE_NUTRITION_LOG_NUDGES: '1' })).toBe(false);
    expect(isNutritionLogNudgeEnabled({ ENABLE_NUTRITION_LOG_NUDGES: 'true' })).toBe(true);
  });

  it('threshold defaults to 3 days and rejects nonsense values', () => {
    expect(nudgeDays({})).toBe(3);
    expect(nudgeDays({ NUTRITION_NUDGE_DAYS: '5' })).toBe(5);
    expect(nudgeDays({ NUTRITION_NUDGE_DAYS: '1' })).toBe(3);
    expect(nudgeDays({ NUTRITION_NUDGE_DAYS: 'nope' })).toBe(3);
  });

  it('consent: nutritionReminders === false is a hard opt-out (JSON or object)', () => {
    expect(hasNutritionReminderConsent({ notificationPreferences: { nutritionReminders: false } })).toBe(false);
    expect(hasNutritionReminderConsent({ notificationPreferences: '{"nutritionReminders":false}' })).toBe(false);
    expect(hasNutritionReminderConsent({ notificationPreferences: {} })).toBe(true);
    expect(hasNutritionReminderConsent({})).toBe(true);
  });
});

describe('quiet hours (user-local via Intl)', () => {
  it('blocks outside 08:00-21:00 user-local and allows inside it', () => {
    // 2026-08-04T18:00Z = 11:00 in LA (allowed), 03:00 next day in Tokyo... no: 03:00 Aug 5 (blocked).
    expect(isWithinSendWindow(NOW, 'America/Los_Angeles')).toBe(true);
    expect(isWithinSendWindow(NOW, 'Asia/Tokyo')).toBe(false); // 03:00 local
    expect(isWithinSendWindow(new Date('2026-08-04T05:00:00Z'), 'America/Los_Angeles')).toBe(false); // 22:00 local
  });

  it('falls back to the default zone on a bad timezone instead of throwing', () => {
    expect(isWithinSendWindow(NOW, 'Not/AZone')).toBe(true); // default LA = 11:00
  });
});

describe('ED-safe copy law', () => {
  it('has 4 pools and rotates deterministically by prior dispatch count', () => {
    expect(NUDGE_COPY_POOLS).toHaveLength(4);
    expect(pickNudgeCopy(0).pool).toBe('celebration');
    expect(pickNudgeCopy(1).pool).toBe('gentle-restart');
    expect(pickNudgeCopy(2).pool).toBe('curiosity');
    expect(pickNudgeCopy(3).pool).toBe('recipe-tease');
    expect(pickNudgeCopy(4).pool).toBe('celebration'); // wraps
    expect(pickNudgeCopy(4).message).not.toBe(pickNudgeCopy(0).message); // second message in pool
  });

  it('NO pool contains guilt, urgency, or streak-loss framing (launch blocker)', () => {
    const banned = /streak|lost|lose|los(?:ing)|broke|broken|miss(?:ed|ing)?|fail|guilt|shame|behind|hurry|urgent|last chance|expir|don't let|slipp/i;
    for (const pool of NUDGE_COPY_POOLS) {
      for (const message of pool.messages) {
        expect(`${pool.title} ${message}`).not.toMatch(banned);
      }
    }
  });
});

describe('runNutritionLogNudgeTick', () => {
  it('nudges only lapsed ESTABLISHED loggers who consent, via the claim gate', async () => {
    const { deps, notify } = harness({
      clients: [
        { id: 1, notificationPreferences: null, timeZone: 'America/Los_Angeles' }, // lapsed logger → nudge
        { id: 2, notificationPreferences: { nutritionReminders: false }, timeZone: 'America/Los_Angeles' }, // opted out
        { id: 3, notificationPreferences: null, timeZone: 'America/Los_Angeles' }, // logged recently
        { id: 4, notificationPreferences: null, timeZone: 'America/Los_Angeles' }, // never logged in 30d
      ],
      recentLogFor: [3],
      activityFor: [1, 3],
    });

    const result = await runNutritionLogNudgeTick(deps);

    expect(result.nudged).toBe(1);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({
      userId: 1,
      type: 'nutrition',
      link: NUDGE_LINK,
    }));
  });

  it('the dispatch-ledger claim GATES the send: lose the insert, lose the send', async () => {
    const { deps, notify, query } = harness({
      clients: [
        { id: 1, notificationPreferences: null, timeZone: 'America/Los_Angeles' },
        { id: 2, notificationPreferences: null, timeZone: 'America/Los_Angeles' },
      ],
      activityFor: [1, 2],
      claimWonFor: [2], // another instance already claimed user 1's row today
    });

    const result = await runNutritionLogNudgeTick(deps);

    expect(result.nudged).toBe(1);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ userId: 2 }));
    // The claim really is the atomic ON CONFLICT insert on the triple.
    const insertSql = query.mock.calls.find(([sql]) => /INSERT INTO nudge_dispatches/.test(sql))[0];
    expect(insertSql).toMatch(/ON CONFLICT \("userId", "nudgeType", "localDate"\) DO NOTHING/);
  });

  it('skips users inside their local quiet hours without touching the DB for them', async () => {
    const { deps, notify } = harness({
      clients: [{ id: 9, notificationPreferences: null, timeZone: 'Asia/Tokyo' }], // 03:00 local
      activityFor: [9],
    });

    const result = await runNutritionLogNudgeTick(deps);

    expect(result.nudged).toBe(0);
    expect(notify).not.toHaveBeenCalled();
    expect(deps.DailyMacroLog.findOne).not.toHaveBeenCalled();
  });

  it('rotates copy by the count of PRIOR dispatches', async () => {
    const { deps, notify } = harness({
      clients: [{ id: 1, notificationPreferences: null, timeZone: 'America/Los_Angeles' }],
      activityFor: [1],
      priorCounts: { 1: 2 }, // third nudge ever → curiosity pool
    });

    await runNutritionLogNudgeTick(deps);

    const expected = pickNudgeCopy(2);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({
      title: expected.title,
      message: expected.message,
    }));
  });

  it('one failing client never poisons the sweep, and a dead DB never throws', async () => {
    const { deps, notify } = harness({
      clients: [
        { id: 1, notificationPreferences: null, timeZone: 'America/Los_Angeles' },
        { id: 2, notificationPreferences: null, timeZone: 'America/Los_Angeles' },
      ],
      activityFor: [1, 2],
    });
    notify.mockRejectedValueOnce(new Error('socket down'));

    const result = await runNutritionLogNudgeTick(deps);
    expect(result.nudged).toBe(1);
    expect(notify).toHaveBeenCalledTimes(2);

    const dead = {
      User: { findAll: vi.fn().mockRejectedValue(new Error('db down')) },
      DailyMacroLog: { findOne: vi.fn() },
      sequelize: { query: vi.fn() },
      notify: vi.fn(),
      env: {},
      now: NOW,
    };
    const deadResult = await runNutritionLogNudgeTick(dead);
    expect(deadResult.nudged).toBe(0);
    expect(deadResult.error).toMatch(/db down/);
  });

  it('claimNudgeDispatch binds (userId, NUDGE_TYPE, localDate) and reports the win truthfully', async () => {
    const query = vi.fn(async () => [{ id: 7 }]);
    expect(await claimNudgeDispatch({ sequelize: { query }, userId: 5, localDate: '2026-08-04' })).toBe(true);
    expect(query.mock.calls[0][1].bind).toEqual([5, NUDGE_TYPE, '2026-08-04']);

    const lostQuery = vi.fn(async () => []);
    expect(await claimNudgeDispatch({ sequelize: { query: lostQuery }, userId: 5, localDate: '2026-08-04' })).toBe(false);
  });
});
