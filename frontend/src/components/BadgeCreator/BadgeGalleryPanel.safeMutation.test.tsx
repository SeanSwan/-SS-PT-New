import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BadgeGalleryPanel from './BadgeGalleryPanel';

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

const badge = {
  id: 'badge/alpha 1',
  name: 'Crystal Finisher',
  description: 'Finish strong.',
  imageUrl: '',
  rarity: 'rare',
  category: 'general',
  xpReward: 25,
  assignedTo: null,
  assignedTarget: null,
  isShared: false,
  isAnimated: false,
  createdAt: '2026-06-20T00:00:00.000Z',
};

const openSelectedBadge = async () => {
  render(<BadgeGalleryPanel />);
  await userEvent.setup().click(await screen.findByRole('button', { name: /select crystal finisher badge/i }));
};

describe('BadgeGalleryPanel', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.patch.mockReset();
    apiMocks.post.mockReset();
    apiMocks.get.mockResolvedValue({ data: { success: true, data: [badge] } });
  });

  it('shows safe assign failure copy without leaking raw backend messages', async () => {
    apiMocks.patch.mockResolvedValue({
      data: {
        success: false,
        message: 'SequelizeConnectionError: password authentication failed for user "swanadmin"',
      },
    });
    const user = userEvent.setup();

    render(<BadgeGalleryPanel />);
    await user.click(await screen.findByRole('button', { name: /select crystal finisher badge/i }));
    await user.type(screen.getByPlaceholderText(/achievement name/i), 'Finisher');
    await user.click(screen.getByRole('button', { name: /^assign$/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Unable to assign badge. Check the target and try again.'
    );
    expect(screen.queryByText(/SequelizeConnectionError/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/swanadmin/i)).not.toBeInTheDocument();
  });

  it('encodes the badge id before posting assignment requests', async () => {
    apiMocks.patch.mockResolvedValue({ data: { success: true } });
    const user = userEvent.setup();

    render(<BadgeGalleryPanel />);
    await user.click(await screen.findByRole('button', { name: /select crystal finisher badge/i }));
    await user.type(screen.getByPlaceholderText(/achievement name/i), 'Finisher');
    await user.click(screen.getByRole('button', { name: /^assign$/i }));

    expect(apiMocks.patch).toHaveBeenCalledWith(
      '/api/admin/badge-creator/badge%2Falpha%201/assign',
      { assignedTo: 'achievement', assignedTarget: 'Finisher' },
      expect.any(Object)
    );
  });

  it('blocks concurrent assignment submits before React can rerender disabled state', async () => {
    const pendingAssigns: Array<() => void> = [];
    apiMocks.patch.mockImplementation(() => new Promise((resolve) => {
      pendingAssigns.push(() => resolve({ data: { success: true } }));
    }));

    await openSelectedBadge();
    fireEvent.change(screen.getByPlaceholderText(/achievement name/i), {
      target: { value: 'Finisher' },
    });
    const assignButton = screen.getByRole('button', { name: /^assign$/i });

    act(() => {
      fireEvent.click(assignButton);
      fireEvent.click(assignButton);
    });

    expect(apiMocks.patch).toHaveBeenCalledTimes(1);
    pendingAssigns.forEach((resolve) => resolve());
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(
      '"Crystal Finisher" assignment saved.'
    ));
  });

  it('shows safe marketplace share failure copy without leaking raw backend messages', async () => {
    apiMocks.post.mockResolvedValue({
      data: {
        success: false,
        message: 'SequelizeDatabaseError: relation "Badges" does not exist',
      },
    });

    await openSelectedBadge();
    await userEvent.setup().click(screen.getByRole('button', { name: /share to marketplace/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Unable to update marketplace sharing. Refresh the gallery and try again.'
    );
    expect(screen.queryByText(/SequelizeDatabaseError/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Badges/i)).not.toBeInTheDocument();
  });

  it('drops malformed gallery badge rows instead of crashing or leaking backend copy', async () => {
    apiMocks.get.mockResolvedValue({
      data: {
        success: true,
        data: [
          null,
          { message: 'private badge table leaked' },
          { ...badge, id: 'badge-clean', name: 'Clean Badge' },
        ],
      },
    });

    render(<BadgeGalleryPanel />);

    expect(await screen.findByRole('button', { name: /select clean badge badge/i })).toBeInTheDocument();
    expect(screen.queryByText(/private badge table leaked/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No badges yet/i)).not.toBeInTheDocument();
  });

  it('blocks concurrent share submits before React can rerender disabled state', async () => {
    const pendingShares: Array<() => void> = [];
    apiMocks.post.mockImplementation(() => new Promise((resolve) => {
      pendingShares.push(() => resolve({ data: { success: true } }));
    }));

    await openSelectedBadge();
    const shareButton = screen.getByRole('button', { name: /share to marketplace/i });

    act(() => {
      fireEvent.click(shareButton);
      fireEvent.click(shareButton);
    });

    expect(apiMocks.post).toHaveBeenCalledTimes(1);
    pendingShares.forEach((resolve) => resolve());
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(
      '"Crystal Finisher" shared to marketplace.'
    ));
  });
  it('saves badge edits and optional replacement image through dedicated admin routes', async () => {
    apiMocks.patch.mockResolvedValue({ data: { success: true } });
    apiMocks.post.mockResolvedValue({
      data: { success: true, data: { imageUrl: '/uploads/products/replacement.webp' } },
    });
    const user = userEvent.setup();

    render(<BadgeGalleryPanel />);
    await user.click(await screen.findByRole('button', { name: /select crystal finisher badge/i }));
    await user.clear(screen.getByLabelText(/^badge name$/i));
    await user.type(screen.getByLabelText(/^badge name$/i), 'Swan Glacier Guardian');
    await user.clear(screen.getByLabelText(/description/i));
    await user.type(screen.getByLabelText(/description/i), 'Updated badge copy.');
    await user.selectOptions(screen.getByLabelText(/rarity/i), 'epic');
    await user.clear(screen.getByLabelText(/xp reward/i));
    await user.type(screen.getByLabelText(/xp reward/i), '180');
    await user.selectOptions(screen.getByLabelText(/connect to/i), 'achievement');
    await user.clear(screen.getByLabelText(/assignment target/i));
    await user.type(screen.getByLabelText(/assignment target/i), 'swan_level_100');
    const replacement = new File(['replacement'], 'replacement.webp', { type: 'image/webp' });
    await user.upload(screen.getByLabelText(/replacement image/i), replacement);
    await user.click(screen.getByRole('button', { name: /save details/i }));

    expect(apiMocks.patch).toHaveBeenCalledWith(
      '/api/admin/badge-creator/badge%2Falpha%201',
      expect.objectContaining({
        name: 'Swan Glacier Guardian',
        description: 'Updated badge copy.',
        rarity: 'epic',
        abilityPoints: '180',
        assignment: { assignedTo: 'achievement', assignedTarget: 'swan_level_100' },
      }),
      expect.any(Object)
    );
    expect(apiMocks.post).toHaveBeenCalledWith(
      '/api/admin/badge-creator/badge%2Falpha%201/image',
      expect.any(FormData),
      expect.any(Object)
    );
    const imagePayload = apiMocks.post.mock.calls.find(([path]) => path === '/api/admin/badge-creator/badge%2Falpha%201/image')?.[1] as FormData;
    expect(imagePayload.get('image')).toBe(replacement);
    expect(await screen.findByRole('status')).toHaveTextContent('Badge "Swan Glacier Guardian" saved.');
  });
});
