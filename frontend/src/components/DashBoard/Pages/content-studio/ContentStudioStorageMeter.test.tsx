/**
 * ContentStudioStorageMeter.test.tsx
 * Locks the graceful-degrade contract: render on success, self-hide on any
 * failure (404 not-deployed / 403 non-admin / network / bad shape), refresh re-fetches.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ContentStudioStorageMeter from './ContentStudioStorageMeter';

const mockGet = vi.fn();
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: { get: mockGet } }),
}));

const payload = (over: Record<string, number> = {}) => ({
  data: { data: { totalBytes: 2 * 1024 ** 3, objectCount: 12, estMonthlyUsd: 0.4, ...over } },
});

beforeEach(() => mockGet.mockReset());

describe('ContentStudioStorageMeter', () => {
  it('renders the storage strip on a valid response', async () => {
    mockGet.mockResolvedValueOnce(payload());
    render(<ContentStudioStorageMeter />);
    expect(await screen.findByRole('status')).toBeTruthy();
    expect(screen.getByText('R2 storage')).toBeTruthy();
    expect(screen.getByText('2.0 GB')).toBeTruthy();
    expect(screen.getByText('12 clips')).toBeTruthy();
    expect(screen.getByText('~$0.40/mo')).toBeTruthy();
  });

  it('self-hides when the endpoint is not deployed / forbidden (rejected)', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 404 } });
    const { container } = render(<ContentStudioStorageMeter />);
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('self-hides when the response shape is wrong', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: { totalBytes: 'oops' } } });
    render(<ContentStudioStorageMeter />);
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  it('singularizes "clip" for a single object', async () => {
    mockGet.mockResolvedValueOnce(payload({ objectCount: 1 }));
    render(<ContentStudioStorageMeter />);
    expect(await screen.findByText('1 clip')).toBeTruthy();
  });

  it('re-fetches when refresh is clicked', async () => {
    mockGet.mockResolvedValueOnce(payload({ objectCount: 1 }));
    render(<ContentStudioStorageMeter />);
    expect(await screen.findByText('1 clip')).toBeTruthy();

    mockGet.mockResolvedValueOnce(payload({ objectCount: 5 }));
    fireEvent.click(screen.getByRole('button', { name: /refresh storage usage/i }));
    expect(await screen.findByText('5 clips')).toBeTruthy();
    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});
