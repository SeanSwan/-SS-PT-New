import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AvatarHomePage from './AvatarHomePage';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
}));

vi.mock('../../services/api.service', () => ({
  default: {
    get: apiMocks.get,
    patch: apiMocks.patch,
  },
}));

const profileResponse = {
  data: {
    success: true,
    data: {
      id: 42,
      level: 22,
    },
  },
};

describe('AvatarHomePage payload safety', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.patch.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('rejects malformed root home payloads with safe copy', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/api/avatar-home') {
        return Promise.resolve({
          data: {
            success: true,
            data: 'private home payload leaked by provider',
          },
        });
      }
      if (url === '/api/gamification/profile') return Promise.resolve(profileResponse);
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });

    render(<AvatarHomePage />);

    expect(await screen.findByText('Unable to load Avatar Home. Please try again later.')).toBeInTheDocument();
    expect(screen.queryByText(/private home payload/i)).not.toBeInTheDocument();
  });

  it('normalizes malformed home fields before rendering child views', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/api/avatar-home') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              unlocked: true,
              avatarBodyType: 77,
              avatarSkinTone: null,
              avatarHairStyle: 'short',
              avatarOutfit: 'starter_workout',
              homeTier: { privateTier: 'vault' },
              activeRoom: 'private_room',
              furniture: {
                bedroom: {
                  bed: { privateItem: 'leak' },
                  decor: 'basic_poster',
                },
                training_room: 'private training room leak',
              },
              minimalistMode: true,
              readyPlayerMeUrl: 'javascript:readyplayer.me/example.glb',
            },
          },
        });
      }
      if (url === '/api/gamification/profile') return Promise.resolve(profileResponse);
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });

    render(<AvatarHomePage />);

    expect(await screen.findByText(/Home - Starter/i)).toBeInTheDocument();
    expect(screen.getByText('Active Room')).toBeInTheDocument();
    expect(screen.getByText('Training Room')).toBeInTheDocument();
    expect(screen.getByText('Decor')).toBeInTheDocument();
    expect(screen.getByText('Basic Poster')).toBeInTheDocument();
    expect(screen.queryByText(/private|vault|leak|javascript/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\[object Object\]/i)).not.toBeInTheDocument();
  });

  it('uses Avatar Home meta level for locked progress when profile lookup fails', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/api/avatar-home') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              unlocked: false,
              avatarBodyType: 'athletic',
              avatarSkinTone: '#C68642',
              avatarHairStyle: 'short',
              avatarOutfit: 'starter_workout',
              homeTier: 'starter',
              activeRoom: 'training_room',
              furniture: {},
              minimalistMode: false,
              readyPlayerMeUrl: null,
            },
            meta: {
              currentLevel: 7,
            },
          },
        });
      }
      if (url === '/api/gamification/profile') return Promise.reject(new Error('profile unavailable'));
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });

    render(<AvatarHomePage />);

    expect(await screen.findByText('Level 7 / 10')).toBeInTheDocument();
    expect(screen.queryByText('Level 1 / 10')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /avatar home unlock progress/i }))
      .toHaveAttribute('aria-valuenow', '7');
  });

  it('rejects malformed Avatar Home and profile levels before rendering unlock progress', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/api/avatar-home') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              unlocked: false,
              avatarBodyType: 'athletic',
              avatarSkinTone: '#C68642',
              avatarHairStyle: 'short',
              avatarOutfit: 'starter_workout',
              homeTier: 'starter',
              activeRoom: 'training_room',
              furniture: {},
              minimalistMode: false,
              readyPlayerMeUrl: null,
            },
            meta: {
              currentLevel: [7],
            },
          },
        });
      }
      if (url === '/api/gamification/profile') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              id: 42,
              level: '1e2',
            },
          },
        });
      }
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });

    render(<AvatarHomePage />);

    expect(await screen.findByText('Unable to verify Avatar Home unlock progress. Please try again later.')).toBeInTheDocument();
    expect(screen.queryByText('Level 7 / 10')).not.toBeInTheDocument();
    expect(screen.queryByText('Level 100 / 10')).not.toBeInTheDocument();
  });

  it('waits for fallback profile level before showing a locked-progress outage', async () => {
    let resolveProfile: (value: typeof profileResponse) => void = () => {};
    const lockedProfileResponse = {
      data: {
        success: true,
        data: {
          id: 42,
          level: 8,
        },
      },
    };

    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/api/avatar-home') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              unlocked: false,
              avatarBodyType: 'athletic',
              avatarSkinTone: '#C68642',
              avatarHairStyle: 'short',
              avatarOutfit: 'starter_workout',
              homeTier: 'starter',
              activeRoom: 'training_room',
              furniture: {},
              minimalistMode: false,
              readyPlayerMeUrl: null,
            },
          },
        });
      }
      if (url === '/api/gamification/profile') {
        return new Promise((resolve) => {
          resolveProfile = resolve;
        });
      }
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });

    render(<AvatarHomePage />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText('Verifying unlock progress...')).toBeInTheDocument();
    expect(screen.queryByText('Unable to verify Avatar Home unlock progress. Please try again later.'))
      .not.toBeInTheDocument();

    await act(async () => {
      resolveProfile(lockedProfileResponse);
    });

    expect(await screen.findByText('Level 8 / 10')).toBeInTheDocument();
  });

  it('shows safe feedback when Avatar Home mode persistence fails', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/api/avatar-home') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              unlocked: true,
              avatarBodyType: 'athletic',
              avatarSkinTone: '#C68642',
              avatarHairStyle: 'short',
              avatarOutfit: 'starter_workout',
              homeTier: 'starter',
              activeRoom: 'training_room',
              furniture: {},
              minimalistMode: false,
              readyPlayerMeUrl: null,
            },
          },
        });
      }
      if (url === '/api/gamification/profile') return Promise.resolve(profileResponse);
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });
    apiMocks.patch.mockRejectedValueOnce(new Error('private Avatar Home mode host failed'));

    render(<AvatarHomePage />);

    fireEvent.click(await screen.findByRole('button', { name: /3d mode/i }));

    expect(await screen.findByText('Unable to update Avatar Home. Please try again.')).toBeInTheDocument();
    expect(screen.queryByText(/private Avatar Home mode host/i)).not.toBeInTheDocument();
  });
});
