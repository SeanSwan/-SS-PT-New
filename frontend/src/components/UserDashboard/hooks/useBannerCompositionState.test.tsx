import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useBannerCompositionState } from './useBannerCompositionState';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useBannerCompositionState', () => {
  it('persists normalized crop settings', async () => {
    const updateProfile = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useBannerCompositionState({
      profile: null,
      updateProfile,
      uploadBannerCollagePhoto: vi.fn(),
    }));

    await act(async () => {
      await result.current.handleBannerCropCommit({
        position: '140% -20%',
        fit: 'contain',
        scale: 4,
        height: 900,
      });
    });

    expect(updateProfile).toHaveBeenCalledWith({
      bannerObjectPosition: '100% 0%',
      bannerObjectFit: 'contain',
      bannerImageScale: 3,
      bannerFrameHeight: 900,
    });
  });

  it('persists the new 1000px banner height ceiling', async () => {
    const updateProfile = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useBannerCompositionState({
      profile: null,
      updateProfile,
      uploadBannerCollagePhoto: vi.fn(),
    }));

    await act(async () => {
      await result.current.handleBannerCropCommit({
        position: '50% 50%',
        fit: 'cover',
        scale: 1,
        height: 1200,
      });
    });

    expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({
      bannerFrameHeight: 1000,
    }));
  });

  it('accepts small uploaded videos for collage media', async () => {
    const updateProfile = vi.fn().mockResolvedValue(undefined);
    const uploadBannerCollagePhoto = vi.fn().mockResolvedValue('/uploads/banner-clip.mp4');
    const { result } = renderHook(() => useBannerCompositionState({
      profile: null,
      updateProfile,
      uploadBannerCollagePhoto,
    }));

    await act(async () => {
      await result.current.handleBannerCollageFiles([
        new File(['video'], 'banner-clip.mp4', { type: 'video/mp4' }),
      ]);
    });

    expect(uploadBannerCollagePhoto).toHaveBeenCalled();
    expect(updateProfile).toHaveBeenCalledWith({
      bannerCollagePhotos: ['/uploads/banner-clip.mp4'],
      bannerObjectFit: 'collage',
    });
  });

  it('caps collage videos while still accepting photos into remaining slots', async () => {
    const updateProfile = vi.fn().mockResolvedValue(undefined);
    const uploadBannerCollagePhoto = vi.fn()
      .mockResolvedValueOnce('/uploads/third.mp4')
      .mockResolvedValueOnce('/uploads/photo.jpg');
    const profile = {
      bannerObjectFit: 'collage',
      bannerCollagePhotos: ['/uploads/one.mp4', '/uploads/two.webm'],
    } as any;
    const { result } = renderHook(() => useBannerCompositionState({
      profile,
      updateProfile,
      uploadBannerCollagePhoto,
    }));

    await waitFor(() => expect(result.current.bannerCollagePhotos).toHaveLength(2));
    await act(async () => {
      await result.current.handleBannerCollageFiles([
        new File(['video'], 'third.mp4', { type: 'video/mp4' }),
        new File(['video'], 'fourth.mov', { type: 'video/quicktime' }),
        new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }),
      ]);
    });

    expect(uploadBannerCollagePhoto).toHaveBeenCalledTimes(2);
    expect(updateProfile).toHaveBeenCalledWith({
      bannerCollagePhotos: [
        '/uploads/one.mp4',
        '/uploads/two.webm',
        '/uploads/third.mp4',
        '/uploads/photo.jpg',
      ],
      bannerObjectFit: 'collage',
    });
  });

  it('rolls collage uploads back when profile persistence fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const updateProfile = vi.fn().mockRejectedValue(new Error('save failed'));
    const uploadBannerCollagePhoto = vi.fn().mockResolvedValue('/uploads/new.webp');
    const profile = {
      bannerObjectFit: 'cover',
      bannerCollagePhotos: ['/uploads/original.jpg'],
    } as any;
    const { result } = renderHook(() => useBannerCompositionState({
      profile,
      updateProfile,
      uploadBannerCollagePhoto,
    }));

    await waitFor(() => expect(result.current.bannerCollagePhotos).toEqual(['/uploads/original.jpg']));
    await act(async () => {
      await result.current.handleBannerCollageFiles([
        new File(['new'], 'new.webp', { type: 'image/webp' }),
      ]);
    });

    expect(result.current.bannerObjectFit).toBe('cover');
    expect(result.current.bannerCollagePhotos).toEqual(['/uploads/original.jpg']);
  });

  it('rolls collage removals back when profile persistence fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const updateProfile = vi.fn().mockRejectedValue(new Error('save failed'));
    const profile = {
      bannerObjectFit: 'collage',
      bannerCollagePhotos: ['/uploads/one.jpg', '/uploads/two.jpg'],
    } as any;
    const { result } = renderHook(() => useBannerCompositionState({
      profile,
      updateProfile,
      uploadBannerCollagePhoto: vi.fn(),
    }));

    await waitFor(() => expect(result.current.bannerCollagePhotos).toHaveLength(2));
    await act(async () => {
      await result.current.handleBannerCollageRemove(0);
    });

    expect(result.current.bannerCollagePhotos).toEqual(['/uploads/one.jpg', '/uploads/two.jpg']);
  });

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
});
