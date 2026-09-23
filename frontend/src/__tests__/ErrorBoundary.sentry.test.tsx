/**
 * Proves the EX-4 call site is wired and that reporting never costs the member
 * their recovery path.
 *
 * The DSN gate itself lives in instrument.ts and is proved by its own tests; what
 * this file pins is that the boundary actually calls the reporting entry point,
 * and that doing so does not take down the fallback UI a crashed member is left
 * looking at.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// The boundary is mocked at OUR seam, not the vendor's: application code depends
// on reportError, so that is the contract worth pinning.
const reportError = vi.fn();
vi.mock('../instrument', () => ({ reportError, isErrorReportingEnabled: false, scrubEvent: (e: unknown) => e }));

const Boom = () => { throw new Error('render exploded'); };

async function renderCrash() {
  const { ErrorBoundary } = await import('../components/ui/ErrorBoundary');
  render(<ErrorBoundary><Boom /></ErrorBoundary>);
}

describe('ErrorBoundary error reporting', () => {
  beforeEach(() => {
    reportError.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('hands the exception to the reporting entry point', async () => {
    await renderCrash();
    expect(reportError).toHaveBeenCalledTimes(1);
    expect((reportError.mock.calls[0][0] as Error).message).toBe('render exploded');
  });

  // Reporting is an addition, not a replacement: the user-facing recovery path
  // must survive it. If capturing ever threw, the boundary would crash inside its
  // own catch and the member would be left on a blank screen.
  it('still renders its recovery UI while reporting', async () => {
    await renderCrash();
    expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
    expect(screen.getByText(/report this problem/i)).toBeTruthy();
  });
});
