/**
 * FILE: profileService.test.ts
 * PURPOSE: Lock the profile transport boundary against credential leakage,
 * malformed envelopes, and backend/frontend response-shape drift.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}));

vi.mock('./api.service', () => ({
  default: {
    get: apiMocks.get,
    post: apiMocks.post,
    put: apiMocks.put,
  },
}));

import profileService from './profileService';

describe('profileService transport boundary', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    apiMocks.put.mockReset();
  });

  it('logs a sanitized Axios error and preserves the server response message', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    apiMocks.get.mockRejectedValueOnce({
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 503,
        data: { message: 'Profile temporarily unavailable' },
      },
      config: {
        url: '/api/profile',
        method: 'get',
        headers: { Authorization: 'Bearer TEST-SECRET' },
        data: '{"email":"private@example.test"}',
      },
    });

    await expect(profileService.getCurrentProfile())
      .rejects.toThrow('Profile temporarily unavailable');

    const logged = JSON.stringify(consoleError.mock.calls);
    expect(logged).not.toContain('TEST-SECRET');
    expect(logged).not.toContain('Authorization');
    expect(logged).not.toContain('private@example.test');
    expect(logged).toContain('/api/profile');
    consoleError.mockRestore();
  });

  it('preserves a failed success-envelope message instead of replacing it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    apiMocks.get.mockResolvedValueOnce({
      data: { success: false, message: 'Profile is still provisioning' },
    });

    await expect(profileService.getCurrentProfile())
      .rejects.toThrow('Profile is still provisioning');

    vi.restoreAllMocks();
  });

  it('normalizes the mixed backend follow ratio to a number', async () => {
    apiMocks.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          followers: { count: 3, list: [] },
          following: { count: 2, list: [] },
          ratio: '1.50',
        },
      },
    });

    await expect(profileService.getFollowStats()).resolves.toMatchObject({
      ratio: 1.5,
    });
  });

  it('does not invent a user object for banner-only upload responses', async () => {
    apiMocks.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: { bannerPhoto: '/photos/banners/42/banner.webp' },
      },
    });

    await expect(profileService.uploadBannerPhoto(new File(['banner'], 'banner.webp')))
      .resolves.toEqual({ bannerPhoto: '/photos/banners/42/banner.webp' });
  });

  it('does not expose the dead uploadImage method for an unmounted API route', () => {
    expect('uploadImage' in profileService).toBe(false);
  });
});
