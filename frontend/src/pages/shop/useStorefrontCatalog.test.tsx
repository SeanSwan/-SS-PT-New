import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import useStorefrontCatalog from './useStorefrontCatalog';

const mockApiGet = vi.hoisted(() => vi.fn());
const authState = vi.hoisted(() => ({
  isAuthenticated: true,
  user: { id: 'client-1' } as { id: string } | null,
}));

vi.mock('../../services/api.service', () => ({ default: { get: mockApiGet } }));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ ...authState }),
}));

const Probe = () => {
  const catalog = useStorefrontCatalog();
  return (
    <div>
      <output data-testid="status">{catalog.status}</output>
      <output data-testid="count">{catalog.items.length}</output>
      <output data-testid="price">{String(catalog.items[0]?.displayPrice ?? 'null')}</output>
      <button type="button" onClick={catalog.retry}>Retry</button>
    </div>
  );
};

describe('useStorefrontCatalog', () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    authState.isAuthenticated = true;
    authState.user = { id: 'client-1' };
  });

  it('normalizes a live response and exposes an explicit retry state', async () => {
    mockApiGet.mockResolvedValueOnce({
      data: {
        pricesVisible: true,
        items: [{ id: 4, name: 'Four sessions', packageType: 'fixed', totalCost: '17.25' }],
      },
    });

    render(<Probe />);
    expect(screen.getByTestId('status')).toHaveTextContent('loading');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('price')).toHaveTextContent('17.25');
  });

  it('ignores a response started under a prior identity after logout', async () => {
    let resolveRequest: (value: unknown) => void = () => undefined;
    mockApiGet.mockReturnValueOnce(new Promise((resolve) => { resolveRequest = resolve; }));

    const { rerender } = render(<Probe />);
    await waitFor(() => expect(mockApiGet).toHaveBeenCalledTimes(1));

    authState.isAuthenticated = false;
    authState.user = null;
    rerender(<Probe />);
    resolveRequest({
      data: {
        pricesVisible: true,
        items: [{ id: 9, name: 'Stale private plan', totalCost: '999.00' }],
      },
    });

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
    expect(screen.getByTestId('price')).toHaveTextContent('null');
  });
});
