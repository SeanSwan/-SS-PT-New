import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CrystallineMarketplace from './CrystallineMarketplace';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('../../services/api.service', () => ({
  default: {
    get: apiMocks.get,
    post: apiMocks.post,
  },
}));

const catalog = [
  { id: 'bench', type: 'furniture', name: 'Crystal Bench', price: 25, rarity: 'rare' },
];

const mockLoadedMarketplace = () => {
  apiMocks.get.mockImplementation((url: string) => {
    if (url === '/api/avatar-home/marketplace') {
      return Promise.resolve({ data: { success: true, data: catalog } });
    }
    if (url === '/api/avatar-home/crystals') {
      return Promise.resolve({
        data: { success: true, data: { balance: 100, ownedItems: [] } },
      });
    }
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
};

describe('CrystallineMarketplace', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    mockLoadedMarketplace();
  });

  it('shows safe purchase failure copy without leaking raw backend messages', async () => {
    apiMocks.post.mockResolvedValue({
      data: {
        success: false,
        message: 'SequelizeConnectionError: password authentication failed for user "swanadmin"',
      },
    });
    const user = userEvent.setup();

    render(<CrystallineMarketplace />);

    await user.click(await screen.findByRole('button', { name: /buy for 25/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Unable to complete purchase. Check your crystals and try again.'
    );
    expect(screen.queryByText(/SequelizeConnectionError/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/swanadmin/i)).not.toBeInTheDocument();
  });

  it('shows safe network failure copy without leaking transport details', async () => {
    apiMocks.post.mockRejectedValue(new Error('fetch failed against private host'));
    const user = userEvent.setup();

    render(<CrystallineMarketplace />);

    await user.click(await screen.findByRole('button', { name: /buy for 25/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Marketplace service is temporarily unavailable. Please try again.'
    );
    expect(screen.queryByText(/private host/i)).not.toBeInTheDocument();
  });

  it('drops malformed read payload collections instead of crashing the mounted marketplace', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/api/avatar-home/marketplace') {
        return Promise.resolve({
          data: {
            success: true,
            data: { message: 'private marketplace table leaked' },
          },
        });
      }
      if (url === '/api/avatar-home/crystals') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              balance: 'private-balance',
              ownedItems: { message: 'private owned item table leaked' },
            },
          },
        });
      }
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });

    render(<CrystallineMarketplace />);

    expect(await screen.findByText(/Crystalline Marketplace/i)).toBeInTheDocument();
    expect(screen.getByText('Marketplace balances are unavailable. Please try again later.'))
      .toBeInTheDocument();
    expect(screen.getByText(/Balance unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/0 Crystals/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/private marketplace table leaked/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/private owned item table leaked/i)).not.toBeInTheDocument();
  });

  it('rejects malformed purchase success bodies with safe copy', async () => {
    apiMocks.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          item: null,
          crystalBalance: 'private-balance',
        },
      },
    });
    const user = userEvent.setup();

    render(<CrystallineMarketplace />);

    await user.click(await screen.findByRole('button', { name: /buy for 25/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Unable to complete purchase. Check your crystals and try again.'
    );
    expect(screen.getByText(/100 Crystals/i)).toBeInTheDocument();
    expect(screen.queryByText(/private-balance/i)).not.toBeInTheDocument();
  });

  it('blocks concurrent purchases before React can rerender the disabled state', async () => {
    const pendingPosts: Array<() => void> = [];
    apiMocks.post.mockImplementation(() => new Promise((resolve) => {
      pendingPosts.push(() => resolve({
        data: {
          success: true,
          data: {
            item: { id: 'bench', type: 'furniture', name: 'Crystal Bench', rarity: 'rare', equippedIn: null },
            crystalBalance: 75,
          },
        },
      }));
    }));

    render(<CrystallineMarketplace />);
    const button = await screen.findByRole('button', { name: /buy for 25/i });

    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });

    expect(apiMocks.post).toHaveBeenCalledTimes(1);
    pendingPosts.forEach((resolve) => resolve());
    await waitFor(() => expect(screen.getByText(/75 crystals/i)).toBeInTheDocument());
  });

  it('does not present an unavailable crystal balance as zero crystals', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/api/avatar-home/marketplace') {
        return Promise.resolve({ data: { success: true, data: catalog } });
      }
      if (url === '/api/avatar-home/crystals') {
        return Promise.reject(new Error('balance service unavailable'));
      }
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });

    render(<CrystallineMarketplace />);

    expect(await screen.findByText('Marketplace balances are unavailable. Please try again later.'))
      .toBeInTheDocument();
    expect(screen.getAllByText(/Balance unavailable/i)).toHaveLength(2);
    expect(screen.queryByText(/0 Crystals/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /balance unavailable/i })).toBeDisabled();
  });
});
