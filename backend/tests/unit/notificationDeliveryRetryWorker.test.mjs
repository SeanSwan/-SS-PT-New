import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackendFile = (relativePath) => readFileSync(resolve(__dirname, '../..', relativePath), 'utf8');

describe('notificationDeliveryRetryWorker', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('runs due in-app notification delivery retries once on demand', async () => {
    const processor = vi.fn(async () => ({
      success: true,
      attempted: 2,
      sent: 1,
      pending: 0,
      failed: 0,
      skipped: 1,
      stale: 0,
    }));
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const { createNotificationDeliveryRetryWorker } = await import('../../jobs/notificationDeliveryRetryWorker.mjs');
    const worker = createNotificationDeliveryRetryWorker({ processor, intervalMs: 60000, limit: 7, log });

    await expect(worker.runOnce()).resolves.toEqual(expect.objectContaining({ success: true, attempted: 2, sent: 1 }));
    expect(processor).toHaveBeenCalledWith(expect.objectContaining({ limit: 7 }));
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('processed 2 retry candidate'));
  });

  it('does not start an interval when disabled', async () => {
    const processor = vi.fn();
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    const { createNotificationDeliveryRetryWorker } = await import('../../jobs/notificationDeliveryRetryWorker.mjs');
    const worker = createNotificationDeliveryRetryWorker({ processor, enabled: false });

    expect(worker.start()).toBe(false);

    expect(setIntervalSpy).not.toHaveBeenCalled();
  });
  it('stays disabled by default unless the Render env gate is explicitly enabled', async () => {
    const previous = process.env.NOTIFICATION_DELIVERY_RETRY_WORKER_ENABLED;
    delete process.env.NOTIFICATION_DELIVERY_RETRY_WORKER_ENABLED;
    const processor = vi.fn();
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    const { createNotificationDeliveryRetryWorker } = await import('../../jobs/notificationDeliveryRetryWorker.mjs');
    const worker = createNotificationDeliveryRetryWorker({ processor });

    expect(worker.start()).toBe(false);
    expect(setIntervalSpy).not.toHaveBeenCalled();

    if (previous === undefined) {
      delete process.env.NOTIFICATION_DELIVERY_RETRY_WORKER_ENABLED;
    } else {
      process.env.NOTIFICATION_DELIVERY_RETRY_WORKER_ENABLED = previous;
    }
  });

  it('prevents overlapping retry cycles', async () => {
    let finishFirstRun;
    const firstRun = new Promise((resolve) => { finishFirstRun = resolve; });
    const processor = vi.fn(() => firstRun);
    const { createNotificationDeliveryRetryWorker } = await import('../../jobs/notificationDeliveryRetryWorker.mjs');
    const worker = createNotificationDeliveryRetryWorker({ processor, intervalMs: 60000 });

    const pending = worker.runOnce();
    await expect(worker.runOnce()).resolves.toEqual({ success: true, skipped: true, reason: 'already_running' });
    finishFirstRun({ success: true, attempted: 0, sent: 0, pending: 0, failed: 0, skipped: 0, stale: 0 });
    await pending;

    expect(processor).toHaveBeenCalledTimes(1);
  });

  it('starts an unref interval and stops it cleanly', async () => {
    const processor = vi.fn(async () => ({ success: true, attempted: 0 }));
    const intervalHandle = { unref: vi.fn() };
    const setIntervalSpy = vi.spyOn(global, 'setInterval').mockReturnValue(intervalHandle);
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval').mockImplementation(() => {});
    const { createNotificationDeliveryRetryWorker } = await import('../../jobs/notificationDeliveryRetryWorker.mjs');
    const worker = createNotificationDeliveryRetryWorker({ processor, intervalMs: 45000, enabled: true });

    expect(worker.start()).toBe(true);
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 45000);
    expect(intervalHandle.unref).toHaveBeenCalled();
    expect(worker.stop()).toBe(true);
    expect(clearIntervalSpy).toHaveBeenCalledWith(intervalHandle);
  });
});

describe('notification delivery retry worker server bootstrap', () => {
  it('imports the retry worker start and stop functions', () => {
    const serverSource = readBackendFile('server.mjs');

    expect(serverSource).toMatch(/import\s+\{[\s\S]{0,120}startNotificationDeliveryRetryWorker[\s\S]{0,120}\}\s+from\s+['"]\.\/jobs\/notificationDeliveryRetryWorker\.mjs['"]/);
    expect(serverSource).toMatch(/import\s+\{[\s\S]{0,120}stopNotificationDeliveryRetryWorker[\s\S]{0,120}\}\s+from\s+['"]\.\/jobs\/notificationDeliveryRetryWorker\.mjs['"]/);
  });

  it('starts the retry worker after socket initialization in a non-fatal bootstrap block', () => {
    const serverSource = readBackendFile('server.mjs');
    const socketIdx = serverSource.indexOf('initializeSocket()');
    const startIdx = serverSource.indexOf('startNotificationDeliveryRetryWorker()');

    expect(socketIdx).toBeGreaterThan(0);
    expect(startIdx).toBeGreaterThan(socketIdx);
    expect(serverSource).toMatch(/Notification delivery retry worker bootstrap failed[\s\S]{0,120}non-fatal/);
  });

  it('stops the retry worker during graceful shutdown', () => {
    const serverSource = readBackendFile('server.mjs');

    expect(serverSource).toMatch(/stopNotificationDeliveryRetryWorker\(\)/);
  });
});