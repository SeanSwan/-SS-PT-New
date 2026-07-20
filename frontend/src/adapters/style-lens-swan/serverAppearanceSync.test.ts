/**
 * FUSION F1 — serverAppearanceSync adapter contract.
 * fetchProfile: GET /api/appearance/profile -> {profile, overlay, updatedAt}
 * (nulls on first visit; null result on transport failure — never throws).
 * pushProfile: PUT -> boolean (false on failure — never throws).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/api.service', () => ({
  default: { get: vi.fn(), put: vi.fn() },
}));

import apiService from '../../services/api.service';
import { fetchProfile, pushProfile } from './serverAppearanceSync';

const PROFILE = {
  profileSchemaVersion: 1,
  paletteThemeId: 'crystalline-dark',
  styleLensId: 'candy-glass-arcade',
  motionMode: 'auto' as const,
  density: 'comfortable' as const,
  updatedAt: '2026-07-16T02:00:00.000Z',
};

describe('serverAppearanceSync', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetchProfile maps the roundtrip payload', async () => {
    (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { success: true, profile: PROFILE, overlay: null, updatedAt: PROFILE.updatedAt },
    });
    await expect(fetchProfile()).resolves.toEqual({
      profile: PROFILE,
      overlay: null,
      updatedAt: PROFILE.updatedAt,
    });
    expect(apiService.get).toHaveBeenCalledWith('/api/appearance/profile');
  });

  it('first visit (null profile) and transport failure both resolve safely', async () => {
    (apiService.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { success: true, profile: null, overlay: null, updatedAt: null },
    });
    await expect(fetchProfile()).resolves.toEqual({ profile: null, overlay: null, updatedAt: null });

    (apiService.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));
    await expect(fetchProfile()).resolves.toBeNull();
  });

  it('pushProfile PUTs the profile and reports success/failure as a boolean', async () => {
    (apiService.put as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { success: true } });
    await expect(pushProfile(PROFILE)).resolves.toBe(true);
    expect(apiService.put).toHaveBeenCalledWith('/api/appearance/profile', { profile: PROFILE });

    (apiService.put as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));
    await expect(pushProfile(PROFILE)).resolves.toBe(false);
  });

  it('R2-2 poison guard: pushProfile sends the picked 6-key projection — stray keys never reach the strict server', async () => {
    (apiService.put as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { success: true } });
    const poisoned = { ...PROFILE, legacyJunk: 'boom' } as typeof PROFILE;
    await expect(pushProfile(poisoned)).resolves.toBe(true);
    const [, body] = (apiService.put as ReturnType<typeof vi.fn>).mock.calls.at(-1)!;
    expect(Object.keys(body.profile).sort()).toEqual([
      'density', 'motionMode', 'paletteThemeId', 'profileSchemaVersion', 'styleLensId', 'updatedAt',
    ]);
    expect(body.profile).not.toHaveProperty('legacyJunk');
  });
});
