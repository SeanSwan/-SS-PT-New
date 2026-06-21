import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReadyPlayerMeAvatar from './ReadyPlayerMeAvatar';

const apiMocks = vi.hoisted(() => ({
  patch: vi.fn(),
}));

vi.mock('../../services/api.service', () => ({
  default: {
    patch: apiMocks.patch,
  },
}));

describe('ReadyPlayerMeAvatar', () => {
  beforeEach(() => {
    apiMocks.patch.mockReset();
  });

  it('gives the avatar URL input an explicit accessible label', () => {
    render(<ReadyPlayerMeAvatar currentUrl={null} onAvatarUpdate={vi.fn()} />);

    expect(screen.getByLabelText(/ready player me avatar url/i)).toBeInTheDocument();
  });

  it('shows safe save failure copy without leaking raw backend messages', async () => {
    apiMocks.patch.mockResolvedValue({
      data: {
        success: false,
        message: 'SequelizeConnectionError: password authentication failed for user "swanadmin"',
      },
    });
    const user = userEvent.setup();

    render(<ReadyPlayerMeAvatar currentUrl={null} onAvatarUpdate={vi.fn()} />);

    await user.type(
      screen.getByPlaceholderText(/paste your .glb avatar url here/i),
      'https://models.readyplayer.me/example.glb'
    );
    await user.click(screen.getByRole('button', { name: /^link$/i }));

    await waitFor(() => expect(apiMocks.patch).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Unable to link avatar. Please check the URL and try again.'
    );
    expect(screen.queryByText(/SequelizeConnectionError/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/swanadmin/i)).not.toBeInTheDocument();
  });

  it('blocks concurrent link saves before React can rerender the disabled state', async () => {
    const pendingPatches: Array<() => void> = [];
    apiMocks.patch.mockImplementation(() => new Promise((resolve) => {
      pendingPatches.push(() => resolve({
        data: {
          success: true,
          data: { readyPlayerMeUrl: 'https://models.readyplayer.me/example.glb' },
        },
      }));
    }));
    const onAvatarUpdate = vi.fn();

    render(<ReadyPlayerMeAvatar currentUrl={null} onAvatarUpdate={onAvatarUpdate} />);
    fireEvent.change(screen.getByPlaceholderText(/paste your .glb avatar url here/i), {
      target: { value: 'https://models.readyplayer.me/example.glb' },
    });
    const button = screen.getByRole('button', { name: /^link$/i });

    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });

    expect(apiMocks.patch).toHaveBeenCalledTimes(1);
    pendingPatches.forEach((resolve) => resolve());
    await waitFor(() => expect(onAvatarUpdate).toHaveBeenCalledTimes(1));
  });

  it('rejects unsafe successful avatar URLs before updating the page state', async () => {
    apiMocks.patch.mockResolvedValue({
      data: {
        success: true,
        data: { readyPlayerMeUrl: 'javascript:readyplayer.me/example.glb' },
      },
    });
    const onAvatarUpdate = vi.fn();
    const user = userEvent.setup();

    render(<ReadyPlayerMeAvatar currentUrl={null} onAvatarUpdate={onAvatarUpdate} />);

    await user.type(
      screen.getByPlaceholderText(/paste your .glb avatar url here/i),
      'https://models.readyplayer.me/example.glb'
    );
    await user.click(screen.getByRole('button', { name: /^link$/i }));

    await waitFor(() => expect(apiMocks.patch).toHaveBeenCalledTimes(1));
    expect(onAvatarUpdate).not.toHaveBeenCalled();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Unable to link avatar. Please check the URL and try again.'
    );
    expect(screen.queryByText(/javascript:readyplayer\.me/i)).not.toBeInTheDocument();
  });

  it('shows safe network failure copy without leaking transport details', async () => {
    apiMocks.patch.mockRejectedValue(new Error('fetch failed against private host'));
    const user = userEvent.setup();

    render(<ReadyPlayerMeAvatar currentUrl={null} onAvatarUpdate={vi.fn()} />);

    await user.type(
      screen.getByPlaceholderText(/paste your .glb avatar url here/i),
      'https://models.readyplayer.me/example.glb'
    );
    await user.click(screen.getByRole('button', { name: /^link$/i }));

    await waitFor(() => expect(apiMocks.patch).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Avatar link service is temporarily unavailable. Please try again.'
    );
    expect(screen.queryByText(/private host/i)).not.toBeInTheDocument();
  });
});
