/**
 * ForgeButton sheen tier — behaviour + the JS↔CSS name contract (SWA-224)
 * ========================================================================
 * The second suite here is the important one. The pointer engine writes CSS
 * custom properties and the Forge stylesheet reads them, and NOTHING fails when
 * those two sets of names drift apart — the engine writes happily, the stylesheet
 * listens for something else, and the orb simply never moves. That exact bug was
 * introduced and caught by hand during the port; this makes the next one fail a
 * test instead of shipping.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ForgeButton from './ForgeButton';

vi.mock('@swan/forge/tokens/primitive.css', () => ({}));
vi.mock('@swan/forge/tokens/packs/crystalline-swan.css', () => ({}));
vi.mock('@swan/forge/css/button.css', () => ({}));
vi.mock('@swan/forge/css/sheen.css', () => ({}));

describe('ForgeButton — sheen is opt-in', () => {
  it('renders no sheen frame by default, so ~90 existing call sites are untouched', () => {
    const { container } = render(<ForgeButton>Save</ForgeButton>);
    expect(container.querySelector('.sw-sheen')).toBeNull();
  });

  it('renders the frame only when a world is asked for, and hides it from AT', () => {
    const { container } = render(<ForgeButton sheen="chrome">Save</ForgeButton>);
    const frame = container.querySelector('.sw-sheen');
    expect(frame).not.toBeNull();
    expect(frame).toHaveAttribute('aria-hidden', 'true');
    expect(frame).toHaveClass('sw-sheen--chrome');
    // the label is still the accessible name
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('paints a rotating ring for a metal world and parallax bands for a scenic one', () => {
    const metal = render(<ForgeButton sheen="gold">Gold</ForgeButton>);
    expect(metal.container.querySelector('.sw-sheen__spin')).not.toBeNull();
    expect(metal.container.querySelector('.sw-sheen__scene')).toBeNull();
    metal.unmount();

    const scenic = render(<ForgeButton sheen="sky">Sky</ForgeButton>);
    expect(scenic.container.querySelector('.sw-sheen__scene')).not.toBeNull();
    expect(scenic.container.querySelector('.sw-sheen__drift-far')).not.toBeNull();
    expect(scenic.container.querySelector('.sw-sheen__spin')).toBeNull();
  });

  it('gives every world the shimmer, rim and orb layers', () => {
    for (const w of ['chrome', 'gold', 'neon', 'sky'] as const) {
      const { container, unmount } = render(<ForgeButton sheen={w}>{w}</ForgeButton>);
      expect(container.querySelector('.sw-sheen__shim')).not.toBeNull();
      expect(container.querySelector('.sw-sheen__rim')).not.toBeNull();
      expect(container.querySelector('.sw-sheen__orb')).not.toBeNull();
      unmount();
    }
  });
});

describe('the JS↔CSS custom-property contract', () => {
  const sheenCss = readFileSync(
    resolve(__dirname, '../../../../../packages/swan-forge/css/sheen.css'),
    'utf8',
  );
  const forgeButtonSrc = readFileSync(resolve(__dirname, 'ForgeButton.tsx'), 'utf8');

  it('ForgeButton passes the namespace the stylesheet actually reads', () => {
    const passed = forgeButtonSrc.match(/varPrefix:\s*'([^']+)'/);
    expect(passed, 'ForgeButton must declare a varPrefix').not.toBeNull();
    const prefix = passed![1];

    // Every property the engine writes must appear in the stylesheet under that
    // prefix. If someone renames one side, this fails instead of the orb quietly
    // freezing in production.
    for (const suffix of ['px', 'py', 'opac', 'orb']) {
      expect(
        sheenCss.includes(`--${prefix}${suffix}`),
        `css/sheen.css must read --${prefix}${suffix}`,
      ).toBe(true);
    }
  });

  it('every world class ForgeButton can render exists in the stylesheet', () => {
    for (const w of ['chrome', 'gold', 'neon', 'sky']) {
      expect(sheenCss.includes(`.sw-sheen--${w}`), `missing .sw-sheen--${w}`).toBe(true);
    }
  });

  it('every layer class the frame renders is styled', () => {
    for (const layer of ['__spin', '__band', '__scene', '__drift', '__drift-far', '__shim', '__rim', '__orb']) {
      expect(sheenCss.includes(`.sw-sheen${layer}`), `missing .sw-sheen${layer}`).toBe(true);
    }
  });

  it('the stylesheet keeps the reduced-motion and forced-colors escapes', () => {
    expect(sheenCss).toContain('prefers-reduced-motion: reduce');
    expect(sheenCss).toContain('forced-colors: active');
  });
});
