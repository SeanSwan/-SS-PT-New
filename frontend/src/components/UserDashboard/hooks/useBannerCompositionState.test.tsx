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

  it('rolls crop previews back when crop persistence fails', async () => {
    const updateProfile = vi.fn().mockRejectedValue(new Error('save failed'));
    const profile = {
      bannerObjectPosition: '25% 40%',
      bannerObjectFit: 'cover',
      bannerImageScale: 1.5,
      bannerFrameHeight: 420,
    } as any;
    const { result } = renderHook(() => useBannerCompositionState({
      profile,
      updateProfile,
      uploadBannerCollagePhoto: vi.fn(),
    }));

    await waitFor(() => expect(result.current.bannerFrameHeight).toBe(420));
    await act(async () => {
      await result.current.handleBannerCropCommit({
        position: '80% 10%',
        fit: 'contain',
        scale: 2,
        height: 700,
      });
    });

    expect(result.current.bannerObjectPosition).toBe('25% 40%');
    expect(result.current.bannerObjectFit).toBe('cover');
    expect(result.current.bannerImageScale).toBe(1.5);
    expect(result.current.bannerFrameHeight).toBe(420);
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
      bannerCollageLayout: 'smart-carousel',
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
      bannerCollageLayout: 'smart-carousel',
    });
  });

  it('shuffles selected collage media and keeps Smart Carousel active', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const updateProfile = vi.fn().mockResolvedValue(undefined);
    const profile = {
      bannerObjectFit: 'cover',
      bannerCollageLayout: 'smart-carousel',
      bannerCollagePhotos: ['/uploads/one.jpg', '/uploads/two.jpg', '/uploads/three.jpg'],
    } as any;
    const { result } = renderHook(() => useBannerCompositionState({
      profile,
      updateProfile,
      uploadBannerCollagePhoto: vi.fn(),
    }));

    await waitFor(() => expect(result.current.bannerCollagePhotos).toHaveLength(3));
    await act(async () => {
      await result.current.handleBannerCollageShuffle();
    });

    expect(updateProfile).toHaveBeenCalledWith({
      bannerCollagePhotos: ['/uploads/two.jpg', '/uploads/three.jpg', '/uploads/one.jpg'],
      bannerObjectFit: 'collage',
      bannerCollageLayout: 'smart-carousel',
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

});
