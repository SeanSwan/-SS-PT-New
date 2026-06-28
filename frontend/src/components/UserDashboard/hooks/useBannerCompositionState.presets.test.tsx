import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useBannerCompositionState } from './useBannerCompositionState';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useBannerCompositionState carousel presets', () => {
  it('persists carousel layout choices and enables collage mode', async () => {
    const updateProfile = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useBannerCompositionState({
      profile: null,
      updateProfile,
      uploadBannerCollagePhoto: vi.fn(),
    }));

    await act(async () => {
      await result.current.handleBannerCollageLayoutCommit('carousel-coverflow');
    });

    expect(updateProfile).toHaveBeenCalledWith({
      bannerCollageLayout: 'carousel-coverflow',
      bannerObjectFit: 'collage',
    });
  });

  it('persists the optional sticky mini carousel toggle', async () => {
    const updateProfile = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useBannerCompositionState({
      profile: null,
      updateProfile,
      uploadBannerCollagePhoto: vi.fn(),
    }));

    await act(async () => {
      await result.current.handleBannerStickyCarouselCommit(true);
    });

    expect(updateProfile).toHaveBeenCalledWith({ bannerStickyCarousel: true });
  });

  it('saves and reapplies full banner presets', async () => {
    const updateProfile = vi.fn().mockResolvedValue(undefined);
    const onBannerPhotoPreview = vi.fn();
    const profile = {
      bannerPhoto: '/uploads/cover.jpg',
      bannerPresets: [],
    } as any;
    const { result } = renderHook(() => useBannerCompositionState({
      profile,
      updateProfile,
      uploadBannerCollagePhoto: vi.fn(),
      onBannerPhotoPreview,
    }));

    await act(async () => {
      await result.current.handleBannerCollageLayoutCommit('carousel-reel');
      await result.current.handleBannerStickyCarouselCommit(true);
      await result.current.handleBannerPresetSave();
    });

    const savedPresets = updateProfile.mock.calls.at(-1)?.[0].bannerPresets;
    expect(savedPresets).toHaveLength(1);
    expect(savedPresets[0]).toEqual(expect.objectContaining({
      bannerPhoto: '/uploads/cover.jpg',
      bannerObjectFit: 'collage',
      bannerCollageLayout: 'carousel-reel',
      bannerStickyCarousel: true,
    }));

    updateProfile.mockClear();
    await act(async () => {
      await result.current.handleBannerPresetApply(savedPresets[0].id);
    });

    expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({
      bannerPhoto: '/uploads/cover.jpg',
      bannerObjectFit: 'collage',
      bannerCollageLayout: 'carousel-reel',
      bannerStickyCarousel: true,
    }));
    expect(onBannerPhotoPreview).toHaveBeenCalledWith('/uploads/cover.jpg');
  });

  it('rolls back visible banner state when preset apply persistence fails', async () => {
    const updateProfile = vi.fn().mockRejectedValue(new Error('save failed'));
    const onBannerPhotoPreview = vi.fn();
    const profile = {
      bannerPhoto: '/uploads/current.jpg',
      bannerObjectPosition: '20% 30%',
      bannerObjectFit: 'cover',
      bannerImageScale: 1.25,
      bannerFrameHeight: 360,
      bannerCollagePhotos: ['/uploads/current-a.jpg'],
      bannerCollageLayout: 'mosaic',
      bannerStickyCarousel: false,
      bannerPresets: [{
        id: 'preset-1',
        name: 'Preset one',
        bannerPhoto: '/uploads/preset.jpg',
        bannerObjectPosition: '90% 10%',
        bannerObjectFit: 'collage',
        bannerImageScale: 2,
        bannerFrameHeight: 800,
        bannerCollagePhotos: ['/uploads/preset-a.jpg'],
        bannerCollageLayout: 'carousel-reel',
        bannerStickyCarousel: true,
        createdAt: '2026-06-19T00:00:00.000Z',
      }],
    } as any;
    const { result } = renderHook(() => useBannerCompositionState({
      profile,
      updateProfile,
      uploadBannerCollagePhoto: vi.fn(),
      onBannerPhotoPreview,
    }));

    await waitFor(() => expect(result.current.bannerPresets).toHaveLength(1));
    await act(async () => {
      await result.current.handleBannerPresetApply('preset-1');
    });

    expect(result.current.bannerObjectPosition).toBe('20% 30%');
    expect(result.current.bannerObjectFit).toBe('cover');
    expect(result.current.bannerImageScale).toBe(1.25);
    expect(result.current.bannerFrameHeight).toBe(360);
    expect(result.current.bannerCollagePhotos).toEqual(['/uploads/current-a.jpg']);
    expect(result.current.bannerCollageLayout).toBe('mosaic');
    expect(result.current.bannerStickyCarousel).toBe(false);
    expect(onBannerPhotoPreview).toHaveBeenLastCalledWith('/uploads/current.jpg');
  });
});
