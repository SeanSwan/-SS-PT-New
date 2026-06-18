import { describe, expect, it } from 'vitest';
import { shouldAutoRetryScan } from './equipmentScanRetry';

describe('equipmentScanRetry policy', () => {
  it('treats a no-response network or timeout failure as transient', () => {
    expect(shouldAutoRetryScan(new Error('Network Error'), 0)).toBe(true);
    expect(shouldAutoRetryScan({}, 0)).toBe(true);
    expect(shouldAutoRetryScan(undefined, 0)).toBe(true);
  });

  it('treats 5xx server or AI errors as transient except the configured 503 path', () => {
    expect(shouldAutoRetryScan({ status: 500 }, 0)).toBe(true);
    expect(shouldAutoRetryScan({ status: 502 }, 0)).toBe(true);
    expect(shouldAutoRetryScan({ status: 504 }, 0)).toBe(true);
    expect(shouldAutoRetryScan({ status: 503 }, 0)).toBe(false);
  });

  it('does not auto-retry client errors or rate limits', () => {
    expect(shouldAutoRetryScan({ status: 400 }, 0)).toBe(false);
    expect(shouldAutoRetryScan({ status: 403 }, 0)).toBe(false);
    expect(shouldAutoRetryScan({ status: 404 }, 0)).toBe(false);
    expect(shouldAutoRetryScan({ status: 413 }, 0)).toBe(false);
    expect(shouldAutoRetryScan({ status: 429 }, 0)).toBe(false);
  });

  it('does not let a retryable hint override 4xx or 429 status codes', () => {
    expect(shouldAutoRetryScan({ status: 400, retryable: true }, 0)).toBe(false);
    expect(shouldAutoRetryScan({ status: 429, retryable: true }, 0)).toBe(false);
    expect(shouldAutoRetryScan({ status: 503, retryable: true }, 0)).toBe(false);
  });

  it('honors a false retryable hint on otherwise transient failures', () => {
    expect(shouldAutoRetryScan({ status: 500, retryable: false }, 0)).toBe(false);
    expect(shouldAutoRetryScan({ retryable: false }, 0)).toBe(false);
  });

  it('stops auto-retrying once the attempt budget is spent', () => {
    const transient = { status: 500 };
    expect(shouldAutoRetryScan(transient, 0)).toBe(true);
    expect(shouldAutoRetryScan(transient, 1)).toBe(false);
  });

  it('never auto-retries a non-transient failure, even on the first attempt', () => {
    expect(shouldAutoRetryScan({ status: 429 }, 0)).toBe(false);
  });
});
