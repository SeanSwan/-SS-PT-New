import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import UserDashboardBannerCropControls from './UserDashboardBannerCropControls';

beforeAll(() => {
  [
    ['setPointerCapture', vi.fn()],
    ['hasPointerCapture', vi.fn(() => true)],
    ['releasePointerCapture', vi.fn()],
  ].forEach(([name, value]) => {
    Object.defineProperty(HTMLElement.prototype, name, { configurable: true, value });
  });
});

function renderCropControls(overrides = {}) {
  const props = {
    backgroundImage: '/uploads/test-cover.jpg',
    bannerObjectPosition: '50% 50%',
    bannerObjectFit: 'cover' as const,
    bannerImageScale: 1,
    bannerFrameHeight: 320,
    bannerCollagePhotos: ['/uploads/collage-one.jpg', '/uploads/collage-two.jpg'],
    bannerCollageLayout: 'stream' as const,
    bannerStickyCarousel: false,
    bannerPresets: [],
    showRepositionPanel: true,
    onToggleRepositionPanel: vi.fn(),
    onBannerCropPreview: vi.fn(),
    onBannerCropCommit: vi.fn(),
    onBannerCollageFiles: vi.fn(),
    onBannerCollageRemove: vi.fn(),
    onBannerCollageLayoutCommit: vi.fn(),
    onBannerStickyCarouselCommit: vi.fn(),
    onBannerPresetSave: vi.fn(),
    onBannerPresetApply: vi.fn(),
    onBannerPresetRemove: vi.fn(),
    onBannerCollageShuffle: vi.fn(),
    onBackgroundClick: vi.fn(),
    ...overrides,
  };

  render(<UserDashboardBannerCropControls {...props} />);
  return props;
}

describe('UserDashboardBannerCropControls', () => {
  it('previews and commits manual drag crop coordinates', () => {
    const props = renderCropControls();
    const surface = screen.getByAltText('Profile cover photo').parentElement as HTMLElement;
    vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue({
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

    fireEvent.pointerDown(surface, { pointerId: 1, clientX: 100, clientY: 50 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 120, clientY: 40 });
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 120, clientY: 40 });

    expect(props.onBannerCropPreview).toHaveBeenCalledWith(expect.objectContaining({
      position: '40% 60%',
      fit: 'cover',
      scale: 1,
    }));
    expect(props.onBannerCropCommit).toHaveBeenCalledWith(expect.objectContaining({
      position: '40% 60%',
      fit: 'cover',
      scale: 1,
    }));
  });

  it('switches to fit-whole mode and caps zoom at 100 percent', () => {
    const props = renderCropControls({ bannerImageScale: 2 });

    fireEvent.click(screen.getByRole('button', { name: 'Fit whole' }));

    expect(props.onBannerCropPreview).toHaveBeenCalledWith(expect.objectContaining({
      fit: 'contain',
      scale: 1,
    }));
    expect(props.onBannerCropCommit).toHaveBeenCalledWith(expect.objectContaining({
      fit: 'contain',
      scale: 1,
    }));
  });

  it('switches to smart fit mode and hides crop zoom controls', () => {
    const props = renderCropControls({ bannerImageScale: 2 });

    fireEvent.click(screen.getByRole('button', { name: 'Smart fit' }));

    expect(props.onBannerCropPreview).toHaveBeenCalledWith(expect.objectContaining({
      fit: 'smart',
      scale: 1,
    }));
    expect(props.onBannerCropCommit).toHaveBeenCalledWith(expect.objectContaining({
      fit: 'smart',
      scale: 1,
    }));

    cleanup();
    renderCropControls({ bannerObjectFit: 'smart' as const });
    expect(screen.queryByLabelText('Cover photo zoom')).not.toBeInTheDocument();
  });

  it('switches to tile mode and renders repeated safe image elements', () => {
    const props = renderCropControls({ bannerObjectFit: 'tile' as const });

    expect(screen.getAllByTestId('banner-tile-image')).toHaveLength(360);
    expect(screen.getByText('Tile size')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tile' }));

    expect(props.onBannerCropPreview).toHaveBeenCalledWith(expect.objectContaining({
      fit: 'tile',
    }));
    expect(props.onBannerCropCommit).toHaveBeenCalledWith(expect.objectContaining({
      fit: 'tile',
    }));
  });

  it('previews and commits banner frame height changes', () => {
    const props = renderCropControls();

    fireEvent.change(screen.getByLabelText('Cover banner height'), { target: { value: '460' } });
    fireEvent.blur(screen.getByLabelText('Cover banner height'));

    expect(props.onBannerCropPreview).toHaveBeenCalledWith(expect.objectContaining({
      height: 460,
    }));
    expect(props.onBannerCropCommit).toHaveBeenCalledWith(expect.objectContaining({
      height: 460,
    }));
  });

  it('previews and commits a tall 1000px cinematic banner height', () => {
    const props = renderCropControls({ bannerFrameHeight: 640 });

    fireEvent.change(screen.getByLabelText('Cover banner height'), { target: { value: '1000' } });
    fireEvent.blur(screen.getByLabelText('Cover banner height'));

    expect(props.onBannerCropPreview).toHaveBeenCalledWith(expect.objectContaining({
      height: 1000,
    }));
    expect(props.onBannerCropCommit).toHaveBeenCalledWith(expect.objectContaining({
      height: 1000,
    }));
  });

  it('renders collage photos and exposes add/remove controls', () => {
    const props = renderCropControls({ bannerObjectFit: 'collage' as const });
    const files = [new File(['one'], 'one.jpg', { type: 'image/jpeg' })];

    expect(screen.getAllByTestId('banner-collage-image')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Add collage media'), { target: { files } });
    fireEvent.click(screen.getByRole('button', { name: 'Shuffle collage media' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove collage media 1' }));

    expect(props.onBannerCollageFiles).toHaveBeenCalled();
    expect(props.onBannerCollageShuffle).toHaveBeenCalled();
    expect(props.onBannerCollageRemove).toHaveBeenCalledWith(0);
  });

  it('exposes collage media sizing and focal point controls', () => {
    const props = renderCropControls({ bannerObjectFit: 'collage' as const });

    expect(screen.getByText('Collage media size')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Collage focus top' }));

    expect(props.onBannerCropPreview).toHaveBeenCalledWith(expect.objectContaining({
      fit: 'collage',
      position: '50% 0%',
    }));
    expect(props.onBannerCropCommit).toHaveBeenCalledWith(expect.objectContaining({
      fit: 'collage',
      position: '50% 0%',
    }));
  });

  it('switches between saved collage grid and carousel layouts while keeping the current straight-row option', () => {
    const props = renderCropControls({ bannerObjectFit: 'collage' as const });

    expect(screen.getByRole('button', { name: 'Collage layout stream' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Collage layout mosaic' }));
    fireEvent.click(screen.getByRole('button', { name: 'Collage layout coverflow carousel' }));

    expect(props.onBannerCollageLayoutCommit).toHaveBeenCalledWith('mosaic');
    expect(props.onBannerCollageLayoutCommit).toHaveBeenCalledWith('carousel-coverflow');
  });

  it('can pin carousel layouts as a sticky mini banner while scrolling', () => {
    const props = renderCropControls({
      bannerObjectFit: 'collage' as const,
      bannerCollageLayout: 'carousel-reel' as const,
      bannerStickyCarousel: true,
    });

    expect(screen.getByTestId('banner-sticky-carousel')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Keep mini carousel sticky while scrolling' }));

    expect(props.onBannerStickyCarouselCommit).toHaveBeenCalledWith(false);
  });

  it('hides the full carousel layer when the sticky mini carousel is enabled', () => {
    renderCropControls({
      bannerObjectFit: 'collage' as const,
      bannerCollageLayout: 'carousel-cinema' as const,
      bannerStickyCarousel: true,
      bannerCollagePhotos: ['/uploads/tall.jpg', '/uploads/wide.jpg'],
    });

    expect(screen.getByTestId('banner-sticky-carousel')).toBeInTheDocument();
    expect(screen.getAllByTestId('banner-sticky-carousel-image')).toHaveLength(4);
    expect(screen.queryAllByTestId('banner-collage-image')).toHaveLength(0);
  });

  it('saves, applies, and removes full banner composition presets', () => {
    const preset = {
      id: 'preset-one',
      name: 'Saved banner 1',
      bannerPhoto: '/uploads/preset-cover.jpg',
      bannerObjectPosition: '20% 40%',
      bannerObjectFit: 'collage' as const,
      bannerImageScale: 1.25,
      bannerFrameHeight: 520,
      bannerCollagePhotos: ['/uploads/preset-one.jpg'],
      bannerCollageLayout: 'spotlight' as const,
      bannerStickyCarousel: true,
      createdAt: '2026-05-25T14:00:00.000Z',
    };
    const props = renderCropControls({
      bannerObjectFit: 'collage' as const,
      bannerPresets: [preset],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save banner preset' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply banner preset Saved banner 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove banner preset Saved banner 1' }));

    expect(props.onBannerPresetSave).toHaveBeenCalled();
    expect(props.onBannerPresetApply).toHaveBeenCalledWith('preset-one');
    expect(props.onBannerPresetRemove).toHaveBeenCalledWith('preset-one');
  });

  it('sizes collage frames from loaded media aspect ratios', async () => {
    renderCropControls({
      bannerObjectFit: 'collage' as const,
      bannerCollagePhotos: ['/uploads/wide.jpg', '/uploads/tall.jpg'],
    });

    const image = screen.getAllByTestId('banner-collage-image')[0] as HTMLImageElement;
    Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 1600 });
    Object.defineProperty(image, 'naturalHeight', { configurable: true, value: 900 });

    fireEvent.load(image);

    await waitFor(() => {
      expect(image.parentElement).not.toBeNull();
      const frameStyle = window.getComputedStyle(image.parentElement!);
      expect(frameStyle.getPropertyValue('--banner-collage-aspect-ratio')).toBe('1.778');
      expect(frameStyle.getPropertyValue('--banner-collage-grow')).toBe('1.778');
      expect(frameStyle.getPropertyValue('--banner-collage-basis')).not.toBe('');
    });
  });

  it('lets users start a collage banner before a single cover photo exists', () => {
    const props = renderCropControls({
      backgroundImage: null,
      bannerObjectFit: 'collage' as const,
      bannerCollagePhotos: [],
    });
    const files = [new File(['one'], 'one.webp', { type: 'image/webp' })];

    expect(screen.getByRole('button', { name: 'Design cover banner' })).toBeInTheDocument();
    expect(screen.getByText('Choose a cover mode and frame size.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add photos/videos' })).toBeInTheDocument();
    expect(screen.getByLabelText('Add collage media')).toHaveAttribute(
      'accept',
      'image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime',
    );

    fireEvent.change(screen.getByLabelText('Add collage media'), { target: { files } });

    expect(props.onBannerCollageFiles).toHaveBeenCalled();
  });

  it('renders uploaded short videos inside collage mode', () => {
    renderCropControls({
      bannerObjectFit: 'collage' as const,
      bannerCollagePhotos: ['/uploads/banner-clip.mp4'],
    });

    expect(screen.getByTestId('banner-collage-video')).toBeInTheDocument();
  });

  it('keeps collage capacity at twelve media items before disabling uploads', () => {
    renderCropControls({
      bannerObjectFit: 'collage' as const,
      bannerCollagePhotos: [
        '/uploads/one.jpg',
        '/uploads/two.jpg',
        '/uploads/three.jpg',
        '/uploads/four.jpg',
        '/uploads/five.jpg',
        '/uploads/six.jpg',
        '/uploads/seven.jpg',
        '/uploads/eight.jpg',
        '/uploads/nine.jpg',
        '/uploads/ten.jpg',
        '/uploads/eleven.jpg',
        '/uploads/twelve.jpg',
      ],
    });

    expect(screen.getByRole('button', { name: 'Full' })).toBeDisabled();
  });
});
