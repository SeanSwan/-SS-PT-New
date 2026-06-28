import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import SocialCoverEditor from './SocialCoverEditor';

const mocks = vi.hoisted(() => {
  const profile = {
    bannerPhoto: '/uploads/cover.jpg',
    bannerObjectPosition: '50% 50%',
    bannerObjectFit: 'collage' as const,
    bannerImageScale: 1,
    bannerFrameHeight: 320,
    bannerCollagePhotos: ['/uploads/one.jpg', '/uploads/two.jpg'],
    bannerCollageLayout: 'carousel-reel' as const,
    bannerStickyCarousel: true,
    bannerPresets: [],
  };

  const resetProfile = () => Object.assign(profile, {
    bannerPhoto: '/uploads/cover.jpg',
    bannerObjectPosition: '50% 50%',
    bannerObjectFit: 'collage' as const,
    bannerImageScale: 1,
    bannerFrameHeight: 320,
    bannerCollagePhotos: ['/uploads/one.jpg', '/uploads/two.jpg'],
    bannerCollageLayout: 'carousel-reel' as const,
    bannerStickyCarousel: true,
    bannerPresets: [],
  });

  return {
    updateProfile: vi.fn(async () => undefined),
    uploadBannerPhoto: vi.fn(async () => '/uploads/new-cover.jpg'),
    uploadBannerCollagePhoto: vi.fn(async () => '/uploads/new-collage.jpg'),
    profile,
    resetProfile,
  };
});

vi.mock('../../../../hooks/profile/useProfile', () => ({
  useProfile: () => ({
    profile: mocks.profile,
    updateProfile: mocks.updateProfile,
    uploadBannerPhoto: mocks.uploadBannerPhoto,
    uploadBannerCollagePhoto: mocks.uploadBannerCollagePhoto,
    isUploading: false,
  }),
}));

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
    configurable: true,
    value: vi.fn(() => true),
  });
  Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
    configurable: true,
    value: vi.fn(),
  });
});

beforeEach(() => {
  mocks.resetProfile();
  mocks.updateProfile.mockClear();
});

describe('SocialCoverEditor drag positioning', () => {
  it('docks the live preview beside the cover controls', () => {
    render(<SocialCoverEditor onClose={vi.fn()} />);

    expect(screen.getByTestId('cover-editor-workspace')).toContainElement(screen.getByTestId('cover-editor-preview-frame'));
    expect(screen.getByTestId('cover-editor-workspace')).toContainElement(screen.getByTestId('cover-editor-controls'));
    expect(screen.getByRole('button', { name: 'Accept cover changes' })).toBeInTheDocument();
  });

  it('switches single-photo covers to smart fit and caps zoom at 100 percent', async () => {
    Object.assign(mocks.profile, {
      bannerObjectFit: 'cover' as const,
      bannerImageScale: 2,
      bannerCollageLayout: 'stream' as const,
      bannerCollagePhotos: [],
    });

    render(<SocialCoverEditor onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Smart fit' }));

    await waitFor(() => {
      expect(mocks.updateProfile).toHaveBeenCalledWith(expect.objectContaining({
        bannerObjectFit: 'smart',
        bannerImageScale: 1,
      }));
    });
  });

  it('renders smart fit as a whole-image layer over matched fill', () => {
    Object.assign(mocks.profile, {
      bannerObjectFit: 'smart' as const,
      bannerImageScale: 2,
      bannerCollageLayout: 'stream' as const,
      bannerCollagePhotos: [],
    });

    render(<SocialCoverEditor onClose={vi.fn()} />);

    expect(screen.getByTestId('banner-smart-fit-layer')).toBeInTheDocument();
    expect(screen.getByAltText('Profile cover photo')).toBeInTheDocument();
    expect(screen.queryByLabelText('Cover zoom')).not.toBeInTheDocument();
  });

  it('saves dragged carousel focal position through the profile update lane', async () => {
    render(<SocialCoverEditor onClose={vi.fn()} />);
    const preview = screen.getByTestId('cover-editor-preview-frame');
    vi.spyOn(preview, 'getBoundingClientRect').mockReturnValue({
      width: 200,
      height: 100,
      top: 0,
      left: 0,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.pointerDown(preview, { pointerId: 7, clientX: 100, clientY: 50 });
    fireEvent.pointerMove(preview, { pointerId: 7, clientX: 120, clientY: 40 });
    fireEvent.pointerUp(preview, { pointerId: 7, clientX: 120, clientY: 40 });

    await waitFor(() => {
      expect(mocks.updateProfile).toHaveBeenCalledWith(expect.objectContaining({
        bannerObjectPosition: '40% 60%',
        bannerObjectFit: 'collage',
        bannerImageScale: 1,
        bannerFrameHeight: 320,
      }));
    });
  });

  it('does not save when the preview is clicked without movement', async () => {
    render(<SocialCoverEditor onClose={vi.fn()} />);
    const preview = screen.getByTestId('cover-editor-preview-frame');

    fireEvent.pointerDown(preview, { pointerId: 9, clientX: 100, clientY: 50 });
    fireEvent.pointerUp(preview, { pointerId: 9, clientX: 100, clientY: 50 });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });

  it('keeps carousel behavior editable from the active cover editor', async () => {
    render(<SocialCoverEditor onClose={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Carousel/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'In cover' }));

    await waitFor(() => {
      expect(mocks.updateProfile).toHaveBeenCalledWith(expect.objectContaining({
        bannerStickyCarousel: false,
      }));
    });
  });
});
