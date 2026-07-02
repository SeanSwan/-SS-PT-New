import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  loggerMock,
  processSessionDeductionsMock,
} = vi.hoisted(() => ({
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  processSessionDeductionsMock: vi.fn(),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: loggerMock,
}));

vi.mock('../../services/sessionDeductionService.mjs', () => ({
  processSessionDeductions: processSessionDeductionsMock,
}));

async function loadWorker() {
  return import('../../jobs/sessionSettlementWorker.mjs');
}

describe('sessionSettlementWorker', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.clearAllMocks();
    delete process.env.SESSION_SETTLEMENT_WORKER_ENABLED;
    delete process.env.SESSION_SETTLEMENT_WORKER_INTERVAL_MS;
    processSessionDeductionsMock.mockResolvedValue({
      processed: 0,
      deducted: 0,
      noCredits: [],
      deferred: [],
      errors: [],
    });
  });

  afterEach(async () => {
    const worker = await loadWorker();
    worker.stopSessionSettlementWorker();
    vi.useRealTimers();
    delete process.env.SESSION_SETTLEMENT_WORKER_ENABLED;
    delete process.env.SESSION_SETTLEMENT_WORKER_INTERVAL_MS;
  });

  it('does not start unless explicitly enabled', async () => {
    const worker = await loadWorker();

    worker.startSessionSettlementWorker();
    await vi.runOnlyPendingTimersAsync();

    expect(processSessionDeductionsMock).not.toHaveBeenCalled();
    expect(loggerMock.info).toHaveBeenCalledWith(
      '[sessionSettlementWorker] SESSION_SETTLEMENT_WORKER_ENABLED != true — not starting'
    );
  });

  it('starts a guarded sweep when enabled', async () => {
    process.env.SESSION_SETTLEMENT_WORKER_ENABLED = 'true';
    const worker = await loadWorker();

    worker.startSessionSettlementWorker();
    await Promise.resolve();

    expect(processSessionDeductionsMock).toHaveBeenCalledTimes(1);
    expect(loggerMock.info).toHaveBeenCalledWith('[sessionSettlementWorker] starting with interval %dms', 900000);
  });

  it('prevents overlapping manual sweeps', async () => {
    const worker = await loadWorker();
    let resolveSweep;
    processSessionDeductionsMock.mockReturnValue(new Promise((resolve) => {
      resolveSweep = resolve;
    }));

    const first = worker.runSessionSettlementSweep();
    const second = await worker.runSessionSettlementSweep();

    expect(second).toBeNull();
    expect(processSessionDeductionsMock).toHaveBeenCalledTimes(1);

    resolveSweep({ processed: 1, deducted: 1, noCredits: [], deferred: [], errors: [] });
    await expect(first).resolves.toEqual({ processed: 1, deducted: 1, noCredits: [], deferred: [], errors: [] });
  });

  it('honors a valid custom interval', async () => {
    process.env.SESSION_SETTLEMENT_WORKER_ENABLED = 'true';
    process.env.SESSION_SETTLEMENT_WORKER_INTERVAL_MS = '60000';
    const worker = await loadWorker();

    worker.startSessionSettlementWorker();
    await Promise.resolve();

    expect(loggerMock.info).toHaveBeenCalledWith('[sessionSettlementWorker] starting with interval %dms', 60000);
  });
});
