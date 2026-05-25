import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import UserDashboardBannerCropControls from './UserDashboardBannerCropControls';

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

function renderCropControls(overrides = {}) {
  const props = {
    backgroundImage: '/uploads/test-cover.jpg',
    bannerObjectPosition: '50% 50%',
    bannerObjectFit: 'cover' as const,
    bannerImageScale: 1,
    showRepositionPanel: true,
    onToggleRepositionPanel: vi.fn(),
    onBannerCropPreview: vi.fn(),
    onBannerCropCommit: vi.fn(),
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
});
