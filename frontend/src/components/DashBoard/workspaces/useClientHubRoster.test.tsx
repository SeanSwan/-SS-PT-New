/**
 * TEST: useClientHubRoster — the honest roster failure contract.
 * Regression lock for the batch-2 review finding: the error state must be
 * REACHABLE (the strict fetcher rethrows; the legacy swallow-to-[] path
 * made the banner dead code).
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useClientHubRoster } from './useClientHubRoster';

const Harness: React.FC<{ axios: any }> = ({ axios }) => {
  const { clients, loading, loadError, loadClients } = useClientHubRoster(axios, 'admin', 1);
  React.useEffect(() => { void loadClients(); }, [loadClients]);
  return (
    <div>
      <span data-testid="state">
        {loading ? 'loading' : loadError ? 'error' : `ok:${clients.length}`}
      </span>
      <button type="button" onClick={() => { void loadClients(); }}>retry</button>
    </div>
  );
};

describe('useClientHubRoster honest failure contract', () => {
  it('sets loadError when the roster fetch REJECTS (banner is reachable)', async () => {
    const axios = { get: vi.fn().mockRejectedValue(new Error('api down')) };
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Harness axios={axios} />);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('error'));
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('clears loadError on a subsequent successful retry', async () => {
    const axios = {
      get: vi.fn()
        .mockRejectedValueOnce(new Error('api down'))
        .mockResolvedValue({ data: { clients: [] } }),
    };
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Harness axios={axios} />);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('error'));
    screen.getByRole('button', { name: 'retry' }).click();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('ok:0'));
    errorSpy.mockRestore();
  });

  it('resolves an empty roster as ok (genuinely no clients ≠ error)', async () => {
    const axios = { get: vi.fn().mockResolvedValue({ data: { clients: [] } }) };
    render(<Harness axios={axios} />);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('ok:0'));
  });
});
