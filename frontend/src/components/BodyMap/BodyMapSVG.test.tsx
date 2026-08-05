import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import BodyMapSVG from './BodyMapSVG';

const renderBodyMapSvg = (profilePhotoUrl?: string | null) => render(
  <BodyMapSVG
    painEntries={[]}
    selectedRegion={null}
    onRegionClick={() => {}}
    gender="male"
    labelMode="off"
    profilePhotoUrl={profilePhotoUrl}
  />,
);

describe('BodyMapSVG profile photo overlay', () => {
  it('renders without a profile photo overlay by default', () => {
    const { container } = renderBodyMapSvg();

    expect(container.querySelector('[data-testid="body-map-profile-head-image"]')).toBeNull();
  });

  it('renders one clipped, non-interactive profile photo image on the front anatomy view when provided', () => {
    const { container } = renderBodyMapSvg('/uploads/client-headshot.jpg');

    const svgs = container.querySelectorAll('svg');
    const photoImages = container.querySelectorAll('[data-testid="body-map-profile-head-image"]');
    const overlay = container.querySelector('[data-testid="body-map-profile-head-overlay"]');

    expect(photoImages).toHaveLength(1);
    expect(photoImages[0].getAttribute('href')).toBe('/uploads/client-headshot.jpg');
    // Slice 2 (A6): the clip id is per-mount (useId), no longer a static
    // DOM id that collides when two BodyMaps render on one page.
    const clipRef = photoImages[0].getAttribute('clip-path') ?? photoImages[0].getAttribute('clipPath') ?? '';
    expect(clipRef).toMatch(/^url\(#bm-head-/);
    const clipId = clipRef.slice(5, -1);
    expect(container.querySelector(`clipPath[id="${clipId}"]`)).not.toBeNull();
    expect(photoImages[0].getAttribute('pointer-events')).toBe('none');
    expect(overlay).not.toBeNull();
    expect(overlay?.getAttribute('aria-hidden')).toBe('true');
    expect(overlay?.getAttribute('pointer-events')).toBe('none');
    expect(svgs[0].querySelector('[data-testid="body-map-profile-head-image"]')).not.toBeNull();
    expect(svgs[1].querySelector('[data-testid="body-map-profile-head-image"]')).toBeNull();
  });

  it('gives two mounted BodyMaps distinct head-clip ids (A6 regression)', () => {
    const first = renderBodyMapSvg('/uploads/a.jpg');
    const second = renderBodyMapSvg('/uploads/b.jpg');
    const clipOf = (c: HTMLElement) =>
      c.querySelector('[data-testid="body-map-profile-head-image"]')?.getAttribute('clip-path');
    expect(clipOf(first.container as HTMLElement)).not.toBe(clipOf(second.container as HTMLElement));
  });
});

describe('BodyMapSVG neutral figure (Slice 2, A5)', () => {
  it('renders outline-only for the neutral figure — no anatomy PNG layer', () => {
    const { container } = render(
      <BodyMapSVG
        painEntries={[]}
        selectedRegion={null}
        onRegionClick={() => {}}
        gender="neutral"
        labelMode="off"
        profilePhotoUrl={null}
      />,
    );
    const anatomyImages = Array.from(container.querySelectorAll('image'));
    expect(anatomyImages).toHaveLength(0);
  });
});