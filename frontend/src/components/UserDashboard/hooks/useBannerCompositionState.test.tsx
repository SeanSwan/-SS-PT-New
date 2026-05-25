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
      bannerFrameHeight: 640,
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
