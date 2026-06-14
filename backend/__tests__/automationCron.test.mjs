/**
 * Automation Cron — Tier 0.3 follow-up engine
 * ===========================================
 * The drip + renewal services exist but were never scheduled. This wires them
 * to a cron, GATED behind SWAN_AUTOMATION_CRON_ENABLED (default OFF) because the
 * drip processor sends REAL SMS. Tests lock: the kill switch, the non-blocking
 * tick, and that NOTHING fires while disabled. Services are vi.mock'd — no sends.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { processScheduledMessages, checkClientsForRenewalAlerts } = vi.hoisted(() => ({
  processScheduledMessages: vi.fn(),
  checkClientsForRenewalAlerts: vi.fn(),
}));

vi.mock('../services/automationService.mjs', () => ({ processScheduledMessages }));
vi.mock('../services/renewalAlertService.mjs', () => ({ checkClientsForRenewalAlerts }));
vi.mock('../utils/logger.mjs', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const {
  isAutomationCronEnabled,
  runAutomationTick,
  startAutomationScheduler,
  stopAutomationScheduler,
} = await import('../services/automationCron.mjs');

describe('automationCron (Tier 0.3 follow-up engine)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    processScheduledMessages.mockResolvedValue({ processed: 0, results: [] });
    checkClientsForRenewalAlerts.mockResolvedValue(undefined);
    delete process.env.SWAN_AUTOMATION_CRON_ENABLED;
  });
  afterEach(() => {
    stopAutomationScheduler();
    vi.useRealTimers();
    delete process.env.SWAN_AUTOMATION_CRON_ENABLED;
  });

  describe('isAutomationCronEnabled (kill switch, default OFF)', () => {
    it('is OFF when the flag is unset', () => {
      expect(isAutomationCronEnabled({})).toBe(false);
    });
    it('is OFF for any value other than the literal "true"', () => {
      expect(isAutomationCronEnabled({ SWAN_AUTOMATION_CRON_ENABLED: 'false' })).toBe(false);
      expect(isAutomationCronEnabled({ SWAN_AUTOMATION_CRON_ENABLED: '1' })).toBe(false);
      expect(isAutomationCronEnabled({ SWAN_AUTOMATION_CRON_ENABLED: 'TRUE' })).toBe(false);
    });
    it('is ON only for the literal "true"', () => {
      expect(isAutomationCronEnabled({ SWAN_AUTOMATION_CRON_ENABLED: 'true' })).toBe(true);
    });
  });

  describe('runAutomationTick', () => {
    it('runs both the drip processor and the renewal refresh', async () => {
      await runAutomationTick();
      expect(processScheduledMessages).toHaveBeenCalledTimes(1);
      expect(checkClientsForRenewalAlerts).toHaveBeenCalledTimes(1);
    });
    it('is non-blocking: renewal refresh still runs if the drip processor throws', async () => {
      processScheduledMessages.mockRejectedValue(new Error('sms provider down'));
      await expect(runAutomationTick()).resolves.toBeUndefined();
      expect(checkClientsForRenewalAlerts).toHaveBeenCalledTimes(1);
    });

    it('skips an overlapping tick (re-entrancy guard — no concurrent double-send)', async () => {
      let resolveFirst;
      processScheduledMessages.mockReturnValueOnce(
        new Promise((resolve) => { resolveFirst = () => resolve({ processed: 0, results: [] }); })
      );
      const first = runAutomationTick();        // starts, hangs inside processScheduledMessages
      await runAutomationTick();                 // re-entrant call should no-op immediately
      expect(processScheduledMessages).toHaveBeenCalledTimes(1); // second tick did NOT re-invoke
      resolveFirst();
      await first;
    });
  });

  describe('startAutomationScheduler', () => {
    it('does NOT start when disabled (default) — no outbound ever fires', async () => {
      vi.useFakeTimers();
      const res = startAutomationScheduler();
      expect(res).toEqual({ started: false, reason: 'disabled' });
      await vi.advanceTimersByTimeAsync(6000);
      expect(processScheduledMessages).not.toHaveBeenCalled();
      expect(checkClientsForRenewalAlerts).not.toHaveBeenCalled();
    });
    it('starts and ticks when explicitly enabled', async () => {
      process.env.SWAN_AUTOMATION_CRON_ENABLED = 'true';
      vi.useFakeTimers();
      const res = startAutomationScheduler();
      expect(res).toEqual({ started: true });
      await vi.advanceTimersByTimeAsync(6000); // past the 5s immediate run
      expect(processScheduledMessages).toHaveBeenCalled();
      expect(checkClientsForRenewalAlerts).toHaveBeenCalled();
    });
  });
});
