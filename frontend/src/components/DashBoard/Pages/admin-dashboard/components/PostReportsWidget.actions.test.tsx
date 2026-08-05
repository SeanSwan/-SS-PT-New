/**
 * SWA-138 S2 — behavioral contract for the report lifecycle actions.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PostReportsWidget from './PostReportsWidget';

const mockAuthAxios = {
  get: vi.fn(),
  patch: vi.fn(),
};
const mockNavigate = vi.fn();

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const reportsResponse = {
  data: {
    success: true,
    data: {
      reports: [
        {
          id: 41,
          reason: 'harassment',
          description: 'offensive comment',
          status: 'pending',
          priority: 'high',
          createdAt: new Date().toISOString(),
          reporterName: 'Private Reporter',
          contentPreview: 'preview text',
        },
      ],
      pagination: { total: 3 },
      summary: { pending: 3 },
    },
  },
};

describe('PostReportsWidget actions', () => {
  beforeEach(() => {
    mockAuthAxios.get.mockReset().mockResolvedValue(reportsResponse);
    mockAuthAxios.patch.mockReset();
    mockNavigate.mockReset();
  });

  it('Resolve PATCHes the resolve route with content-flagged and removes the row', async () => {
    mockAuthAxios.patch.mockResolvedValue({ data: { success: true } });
    render(<PostReportsWidget />);

    await screen.findByText('harassment');
    await userEvent.click(screen.getByRole('button', { name: /Resolve report/ }));

    expect(mockAuthAxios.patch).toHaveBeenCalledWith(
      '/api/admin/content/reports/41/resolve',
      { actionTaken: 'content-flagged' },
    );
    await waitFor(() => expect(screen.queryByText('harassment')).not.toBeInTheDocument());
    expect(screen.getByText('No pending reports')).toBeInTheDocument();
  });

  it('Dismiss PATCHes the dismiss route and removes the row', async () => {
    mockAuthAxios.patch.mockResolvedValue({ data: { success: true } });
    render(<PostReportsWidget />);

    await screen.findByText('harassment');
    await userEvent.click(screen.getByRole('button', { name: /Dismiss report/ }));

    expect(mockAuthAxios.patch).toHaveBeenCalledWith('/api/admin/content/reports/41/dismiss', {});
    await waitFor(() => expect(screen.queryByText('harassment')).not.toBeInTheDocument());
  });

  it('a 409 (another admin finalized it) also removes the row — truth wins', async () => {
    mockAuthAxios.patch.mockRejectedValue({ response: { status: 409 } });
    render(<PostReportsWidget />);

    await screen.findByText('harassment');
    await userEvent.click(screen.getByRole('button', { name: /Resolve report/ }));
    await waitFor(() => expect(screen.queryByText('harassment')).not.toBeInTheDocument());
  });

  it('a non-409 failure keeps the row and shows a row-level error', async () => {
    mockAuthAxios.patch.mockRejectedValue({ response: { status: 500 } });
    render(<PostReportsWidget />);

    await screen.findByText('harassment');
    await userEvent.click(screen.getByRole('button', { name: /Dismiss report/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not dismiss the report');
    expect(screen.getByText('harassment')).toBeInTheDocument();
  });

  it('a failed fetch renders the shell error state, never "No pending reports"', async () => {
    mockAuthAxios.get.mockReset().mockRejectedValue(new Error('boom'));
    render(<PostReportsWidget />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Reports data unavailable');
    expect(screen.queryByText('No pending reports')).not.toBeInTheDocument();
  });
});
