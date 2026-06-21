import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BadgeMarketplacePanel from './BadgeMarketplacePanel';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}));

vi.mock('../../services/api.service', () => ({
  default: {
    get: apiMocks.get,
    patch: apiMocks.patch,
    post: apiMocks.post,
  },
}));

const marketplaceBadges = [
  {
    id: 'badge/alpha 1',
    name: 'Crystal Finisher',
    description: 'Complete the finish line set.',
    imageUrl: '',
    rarity: 'rare',
    isAnimated: false,
    createdAt: '2026-06-20T00:00:00.000Z',
  },
];

describe('BadgeMarketplacePanel', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.patch.mockReset();
    apiMocks.post.mockReset();
    apiMocks.get.mockResolvedValue({
      data: { success: true, data: marketplaceBadges },
    });
  });

  it('shows safe claim failure copy without leaking raw backend messages', async () => {
    apiMocks.post.mockResolvedValue({
      data: {
        success: false,
        message: 'SequelizeConnectionError: password authentication failed for user "swanadmin"',
      },
    });
    const user = userEvent.setup();

    render(<BadgeMarketplacePanel />);

    await user.click(await screen.findByRole('button', { name: /claim crystal finisher/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Unable to claim badge. Refresh the marketplace and try again.'
    );
    expect(screen.queryByText(/SequelizeConnectionError/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/swanadmin/i)).not.toBeInTheDocument();
  });

  it('shows safe network failure copy without leaking transport details', async () => {
    apiMocks.post.mockRejectedValue(new Error('fetch failed against private host'));
    const user = userEvent.setup();

    render(<BadgeMarketplacePanel />);

    await user.click(await screen.findByRole('button', { name: /claim crystal finisher/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Badge marketplace service is temporarily unavailable. Please try again.'
    );
    expect(screen.queryByText(/private host/i)).not.toBeInTheDocument();
  });

  it('blocks concurrent claims before React can rerender the disabled state', async () => {
    const pendingClaims: Array<() => void> = [];
    apiMocks.post.mockImplementation(() => new Promise((resolve) => {
      pendingClaims.push(() => resolve({ data: { success: true } }));
    }));

    render(<BadgeMarketplacePanel />);
    const button = await screen.findByRole('button', { name: /claim crystal finisher/i });

    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });

    expect(apiMocks.post).toHaveBeenCalledTimes(1);
    pendingClaims.forEach((resolve) => resolve());
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Claimed "Crystal Finisher"! Check your gallery.'
    );
    expect(screen.getByRole('button', { name: /crystal finisher already claimed/i })).toBeDisabled();
  });

  it('drops malformed marketplace badge rows instead of crashing or leaking backend copy', async () => {
    apiMocks.get.mockResolvedValue({
      data: {
        success: true,
        data: [
          null,
          { message: 'private marketplace badge table leaked' },
          { ...marketplaceBadges[0], id: 'badge-clean', name: 'Clean Shared Badge' },
        ],
      },
    });

    render(<BadgeMarketplacePanel />);

    expect(await screen.findByRole('button', { name: /claim clean shared badge/i })).toBeInTheDocument();
    expect(screen.getByText('1 shared')).toBeInTheDocument();
    expect(screen.queryByText(/private marketplace badge table leaked/i)).not.toBeInTheDocument();
  });

  it('encodes the badge id before posting the claim request', async () => {
    apiMocks.post.mockResolvedValue({ data: { success: true } });
    const user = userEvent.setup();

    render(<BadgeMarketplacePanel />);

    await user.click(await screen.findByRole('button', { name: /claim crystal finisher/i }));

    expect(apiMocks.post).toHaveBeenCalledWith(
      '/api/admin/badge-creator/marketplace/claim/badge%2Falpha%201',
      undefined,
      expect.any(Object)
    );
  });
});
