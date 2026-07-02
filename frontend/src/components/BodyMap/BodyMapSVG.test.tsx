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
    expect(photoImages[0].getAttribute('clip-path') ?? photoImages[0].getAttribute('clipPath')).toBe('url(#body-map-profile-head-clip)');
    expect(photoImages[0].getAttribute('pointer-events')).toBe('none');
    expect(overlay).not.toBeNull();
    expect(overlay?.getAttribute('aria-hidden')).toBe('true');
    expect(overlay?.getAttribute('pointer-events')).toBe('none');
    expect(svgs[0].querySelector('[data-testid="body-map-profile-head-image"]')).not.toBeNull();
    expect(svgs[1].querySelector('[data-testid="body-map-profile-head-image"]')).toBeNull();
  });
});