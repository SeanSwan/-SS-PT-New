import { describe, expect, it, vi } from 'vitest';
import { companionEventBridgeResponseMiddleware } from '../../middleware/companionEventBridgeResponseMiddleware.mjs';
import { scheduleCompanionLedgerEvents } from '../../services/gamification/CompanionEventBridgeService.mjs';

describe('companionEventBridgeResponseMiddleware', () => {
  it('injects request-scoped companion summaries into successful JSON responses', () => {
    const json = vi.fn((body) => body);
    const res = { json };
    const next = vi.fn(() => {
      scheduleCompanionLedgerEvents({
        service: { recordActivity: vi.fn(async () => ({})) },
        result: { duplicate: false, pointsAwarded: 50 },
        entry: { userId: 42, source: 'workout_completion', transactionType: 'earn' },
        transaction: { afterCommit: vi.fn() },
        logger: { info: vi.fn(), error: vi.fn() },
      });
      res.json({ success: true, message: 'Workout completion recorded successfully' });
    });

    companionEventBridgeResponseMiddleware({}, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(json).toHaveBeenCalledTimes(1);
    const body = json.mock.calls[0][0];
    expect(body.companionEvents).toHaveLength(1);
    expect(body.companionEvents[0]).toMatchObject({
      source: 'workout_completion',
      status: 'scheduled',
    });
  });

  it('does not overwrite an explicit companionEvents response field', () => {
    const json = vi.fn((body) => body);
    const res = { json };
    const next = vi.fn(() => {
      scheduleCompanionLedgerEvents({
        service: { recordActivity: vi.fn(async () => ({})) },
        result: { duplicate: false, pointsAwarded: 50 },
        entry: { userId: 42, source: 'workout_completion', transactionType: 'earn' },
        transaction: { afterCommit: vi.fn() },
        logger: { info: vi.fn(), error: vi.fn() },
      });
      res.json({ success: true, companionEvents: [{ source: 'manual' }] });
    });

    companionEventBridgeResponseMiddleware({}, res, next);

    expect(json.mock.calls[0][0].companionEvents).toEqual([{ source: 'manual' }]);
  });

  it('keeps a successful workout response stable when companion recording fails after commit', async () => {
    const afterCommit = vi.fn();
    const error = vi.fn();
    const json = vi.fn((body) => body);
    const res = { json };
    const next = vi.fn(() => {
      scheduleCompanionLedgerEvents({
        service: { recordActivity: vi.fn(async () => { throw new Error('simulated companion write failure'); }) },
        result: { duplicate: false, pointsAwarded: 50 },
        entry: { userId: 42, source: 'workout_completion', transactionType: 'earn' },
        transaction: { afterCommit },
        logger: { info: vi.fn(), error },
      });
      res.json({ success: true, message: 'Workout completion recorded successfully' });
    });

    companionEventBridgeResponseMiddleware({}, res, next);

    const responseBody = json.mock.calls[0][0];
    expect(responseBody).toMatchObject({
      success: true,
      message: 'Workout completion recorded successfully',
      companionEvents: [{ source: 'workout_completion', status: 'scheduled' }],
    });
    expect(afterCommit).toHaveBeenCalledTimes(1);

    await afterCommit.mock.calls[0][0]();

    expect(error).toHaveBeenCalledTimes(1);
    expect(json).toHaveBeenCalledTimes(1);
    expect(json.mock.calls[0][0]).toEqual(responseBody);
  });
});
