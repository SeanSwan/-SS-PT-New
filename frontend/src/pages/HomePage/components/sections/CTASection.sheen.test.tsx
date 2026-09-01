/**
 * CTASection — sheen is a hierarchy signal, not decoration (SWA-224)
 * ===================================================================
 * The closing ask on the homepage is the first production surface to carry the
 * Forge sheen tier. This locks the intent behind that: exactly ONE of the two
 * buttons wears the metal frame. If someone later adds it to the secondary, the
 * pair stops expressing a hierarchy and the sheen becomes noise — and nothing
 * else in the suite would notice.
 *
 * Mounted-surface receipt (Rule 26) for this file:
 *   App.tsx:116               createBrowserRouter([MainRoutes])
 *   main-routes.tsx:356       index: true  ->  HomePage
 *   main-routes.tsx:60        HomePage     ->  HomePage.V4
 *   HomePage.V4.tsx:111       renders <CTASection />
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CTASection from './CTASection';

vi.mock('@swan/forge/tokens/primitive.css', () => ({}));
vi.mock('@swan/forge/tokens/packs/crystalline-swan.css', () => ({}));
vi.mock('@swan/forge/css/button.css', () => ({}));
vi.mock('@swan/forge/css/sheen.css', () => ({}));

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

describe('CTASection — the closing ask', () => {
  it('renders both calls to action', () => {
    render(<CTASection tier="essential" />);
    expect(screen.getByRole('button', { name: /join swanstudios/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /contact us/i })).toBeInTheDocument();
  });

  it('puts the sheen on the primary ask and NOT on the secondary', () => {
    const { container } = render(<CTASection tier="essential" />);

    const primary = screen.getByRole('button', { name: /join swanstudios/i });
    const secondary = screen.getByRole('button', { name: /contact us/i });

    expect(primary.querySelector('.sw-sheen')).not.toBeNull();
    expect(secondary.querySelector('.sw-sheen')).toBeNull();

    // exactly one sheen frame in the whole section
    expect(container.querySelectorAll('.sw-sheen')).toHaveLength(1);
  });

  it('keeps the sheen frame out of the accessibility tree', () => {
    render(<CTASection tier="essential" />);
    const frame = screen
      .getByRole('button', { name: /join swanstudios/i })
      .querySelector('.sw-sheen');
    expect(frame).toHaveAttribute('aria-hidden', 'true');
    // the button's accessible name is still just its label
    expect(screen.getByRole('button', { name: 'Join SwanStudios' })).toBeInTheDocument();
  });
});
