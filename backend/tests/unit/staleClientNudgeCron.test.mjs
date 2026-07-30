/**
 * Stale-client nudge tick contract (Workout-OS C6b).
 * Locks: stale detection window, consent hard opt-out, cooldown (one nudge
 * per window), generic envelope (no pain/body detail), kill-switch default
 * OFF, and never-throws resilience.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../models/index.mjs', () => ({
  getUser: vi.fn(),
  getWorkoutSession: vi.fn(),
  getNotification: vi.fn(),
}));
vi.mock('../../controllers/notificationController.mjs', () => ({
  createNotification: vi.fn(),
}));
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const {
  runStaleClientNudgeTick,
  isStaleClientNudgeEnabled,
  staleDays,
  hasWorkoutReminderConsent,
  NUDGE_TITLE,
  NUDGE_MESSAGE,
} = await import('../../services/staleClientNudgeCron.mjs');

const NOW = new Date('2026-07-29T18:00:00Z');

const harness = ({ clients, recentSessionFor = [], recentNudgeFor = [] } = {}) => {
  const notify = vi.fn().mockResolvedValue({});
  const deps = {
    User: { findAll: vi.fn().mockResolvedValue(clients) },
    WorkoutSession: {
      findOne: vi.fn(({ where }) => Promise.resolve(
        recentSessionFor.includes(where.userId) ? { id: 'ws' } : null,
      )),
    },
    Notification: {
      findOne: vi.fn(({ where }) => Promise.resolve(
        recentNudgeFor.includes(where.userId) ? { id: 'n' } : null,
      )),
    },
    notify,
    env: {},
    now: NOW,
  };
  return { deps, notify };
};

beforeEach(() => vi.clearAllMocks());

describe('kill switch + config', () => {
  it('is OFF by default and only exactly "true" enables it', () => {
    expect(isStaleClientNudgeEnabled({})).toBe(false);
    expect(isStaleClientNudgeEnabled({ ENABLE_STALE_CLIENT_NUDGES: '1' })).toBe(false);
    expect(isStaleClientNudgeEnabled({ ENABLE_STALE_CLIENT_NUDGES: 'true' })).toBe(true);
  });

  it('threshold defaults to 4 days and rejects nonsense values', () => {
    expect(staleDays({})).toBe(4);
    expect(staleDays({ STALE_CLIENT_NUDGE_DAYS: '7' })).toBe(7);
    expect(staleDays({ STALE_CLIENT_NUDGE_DAYS: '1' })).toBe(4);
    expect(staleDays({ STALE_CLIENT_NUDGE_DAYS: 'nope' })).toBe(4);
  });

  it('consent: workoutReminders === false is a hard opt-out (JSON or object)', () => {
    expect(hasWorkoutReminderConsent({ notificationPreferences: { workoutReminders: false } })).toBe(false);
    expect(hasWorkoutReminderConsent({ notificationPreferences: '{"workoutReminders":false}' })).toBe(false);
    expect(hasWorkoutReminderConsent({ notificationPreferences: {} })).toBe(true);
    expect(hasWorkoutReminderConsent({})).toBe(true);
    expect(hasWorkoutReminderConsent({ notificationPreferences: 'not-json' })).toBe(true);
  });
});

describe('runStaleClientNudgeTick', () => {
  it('nudges only stale, consenting, un-cooled clients with the generic envelope', async () => {
    const { deps, notify } = harness({
      clients: [
        { id: 1, notificationPreferences: null },                              // stale → nudge
        { id: 2, notificationPreferences: { workoutReminders: false } },       // opted out
        { id: 3, notificationPreferences: null },                              // trained recently
        { id: 4, notificationPreferences: null },                              // already nudged
      ],
      recentSessionFor: [3],
      recentNudgeFor: [4],
    });

    const result = await runStaleClientNudgeTick(deps);

    expect(result.nudged).toBe(1);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith({
      userId: 1,
      title: NUDGE_TITLE,
      message: NUDGE_MESSAGE,
      type: 'reminder',
    });
    // Generic envelope: no body/pain vocabulary ever.
    expect(`${NUDGE_TITLE} ${NUDGE_MESSAGE}`).not.toMatch(/pain|injur|shoulder|knee|back\b/i);
  });

  it('one failing client never poisons the sweep', async () => {
    const { deps, notify } = harness({ clients: [{ id: 1 }, { id: 2 }] });
    notify.mockRejectedValueOnce(new Error('socket down'));

    const result = await runStaleClientNudgeTick(deps);

    expect(result.nudged).toBe(1);
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it('excludes brand-new accounts from the sweep (never nudge a never-logged newbie)', async () => {
    const { deps } = harness({ clients: [] });
    await runStaleClientNudgeTick(deps);
    const where = deps.User.findAll.mock.calls[0][0].where;
    expect(where.createdAt).toBeDefined();
    // The account-age bound uses the SAME cutoff as staleness.
    const cutoffMs = NOW.getTime() - 4 * 24 * 60 * 60 * 1000;
    // Op.lt is a SYMBOL key — Object.values can't see it.
    const bound = where.createdAt[Object.getOwnPropertySymbols(where.createdAt)[0]];
    expect(new Date(bound).getTime()).toBe(cutoffMs);
  });

  it('never throws even when the user query explodes', async () => {
    const deps = {
      User: { findAll: vi.fn().mockRejectedValue(new Error('db down')) },
      WorkoutSession: { findOne: vi.fn() },
      Notification: { findOne: vi.fn() },
      notify: vi.fn(),
      env: {},
      now: NOW,
    };
    const result = await runStaleClientNudgeTick(deps);
    expect(result.nudged).toBe(0);
    expect(result.error).toMatch(/db down/);
  });
});
