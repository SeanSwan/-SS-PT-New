/**
 * Trust guard for the transformation showcase.
 *
 * WHY: this component rendered "Upload Progress Photos" / "Update Photos"
 * buttons gated on `isOwnProfile && onUpload`. All three live mount sites passed
 * `isOwnProfile` and none passed `onUpload`, so the affordance could never
 * render — and there was no upload path to wire it to: `POST /api/photos/:userId`
 * is a RECORD endpoint requiring an `storageKey` already present in R2 under
 * `photos/{category}/{clientId}/`, and no member-reachable upload leg exists
 * (the admin PhotoManager makes a human type the URL and key by hand).
 *
 * These tests assert the surface makes no promise it cannot keep.
 */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TransformationPhotoShowcase from './TransformationPhotoShowcase';
import type { TransformationPhoto } from './TransformationPhotoTypes';

const photo = (id: string, photoType: TransformationPhoto['photoType'], takenAt: string): TransformationPhoto => ({
  id,
  url: `https://example.test/${id}.jpg`,
  photoType,
  takenAt,
}) as TransformationPhoto;

describe('TransformationPhotoShowcase trust surface', () => {
  it('offers no upload control when the owner has no photos', () => {
    render(<TransformationPhotoShowcase photos={[]} visibility="private" isOwnProfile />);

    expect(screen.queryByRole('button', { name: /upload/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /update photos/i })).not.toBeInTheDocument();
  });

  it('offers no upload control when a comparison is rendered', () => {
    render(
      <TransformationPhotoShowcase
        photos={[photo('a', 'front', '2026-01-01'), photo('b', 'front', '2026-04-01')]}
        visibility="private"
        isOwnProfile
      />
    );

    expect(screen.getByRole('slider', { name: /before and after/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /upload/i })).not.toBeInTheDocument();
  });

  it('describes the empty state without instructing an action the screen cannot perform', () => {
    render(<TransformationPhotoShowcase photos={[]} visibility="private" isOwnProfile />);

    // "Upload ... photos" told the member to do something with no control to do it.
    expect(screen.queryByText(/track your transformation journey/i)).not.toBeInTheDocument();
    expect(screen.getByText(/will appear here as a before & after comparison/i)).toBeInTheDocument();
  });

  it('is keyboard-operable wherever the comparison renders', () => {
    render(
      <TransformationPhotoShowcase
        photos={[photo('a', 'front', '2026-01-01'), photo('b', 'front', '2026-04-01')]}
        visibility="private"
        isOwnProfile
      />
    );

    const slider = screen.getByRole('slider', { name: /before and after/i });
    expect(slider).toHaveAttribute('tabindex', '0');
    expect(slider.style.getPropertyValue('--swan-slider-pos')).toBe('50%');
  });
});

describe('TransformationPhotoShowcase comparison mechanism', () => {
  const pair = [photo('a', 'front', '2026-01-01'), photo('b', 'front', '2026-04-01')];

  it('drives the shared position variable from the keyboard', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<TransformationPhotoShowcase photos={pair} visibility="private" isOwnProfile />);

    const slider = screen.getByRole('slider', { name: /before and after/i });
    slider.focus();

    // The dashboard viewer never had keyboard operation before the shared hook.
    await user.keyboard('{ArrowRight}');
    expect(slider).toHaveAttribute('aria-valuenow', '52');
    expect(slider.style.getPropertyValue('--swan-slider-pos')).toBe('52%');

    await user.keyboard('{End}');
    expect(slider.style.getPropertyValue('--swan-slider-pos')).toBe('95%');
  });

  it('renders both photo layers so the clip has something to reveal', () => {
    const { container } = render(
      <TransformationPhotoShowcase photos={pair} visibility="private" isOwnProfile />
    );
    const slider = container.querySelector('[role="slider"]');
    expect(slider?.querySelectorAll('div[class]').length).toBeGreaterThanOrEqual(2);
  });
});
