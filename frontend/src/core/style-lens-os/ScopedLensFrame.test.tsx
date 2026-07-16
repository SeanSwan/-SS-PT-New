/**
 * ScopedLensFrame contract.
 * Locks the three-layer attribute nesting the lens stylesheet depends on:
 * lens-var node → shell node → scroll-root node, with children inside.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScopedLensFrame } from './ScopedLensFrame';

describe('ScopedLensFrame', () => {
  it('renders the lens attribute layers nested like the live dashboard', () => {
    const { container, getByText } = render(
      <ScopedLensFrame styleLensId="tempo-forge" aria-label="preview frame">
        <p>stage content</p>
      </ScopedLensFrame>,
    );

    const root = container.querySelector('[data-scoped-lens-frame]');
    expect(root).toHaveClass('style-lens-frame');
    expect(root).not.toHaveAttribute('style');
    expect(root).not.toBeNull();
    expect(root!.getAttribute('data-style-lens')).toBe('tempo-forge');
    expect(root!.getAttribute('data-density')).toBe('comfortable');
    expect(root!.getAttribute('data-motion-mode')).toBe('full');

    const shell = root!.querySelector('[data-style-lens-shell]');
    expect(shell).toHaveClass('style-lens-frame__shell');
    expect(shell).not.toBeNull();
    const scroll = shell!.querySelector('[data-dashboard-scroll-root]');
    expect(scroll).toHaveClass('style-lens-frame__scroll-root');
    expect(scroll).not.toBeNull();
    expect(scroll!.contains(getByText('stage content'))).toBe(true);
  });

  it('renders sibling frames with independent lens identities (A/B compare)', () => {
    const { container } = render(
      <>
        <ScopedLensFrame styleLensId="quiet-meridian">
          <span>a</span>
        </ScopedLensFrame>
        <ScopedLensFrame styleLensId="candy-glass-arcade" density="compact" motionMode="off">
          <span>b</span>
        </ScopedLensFrame>
      </>,
    );

    const frames = container.querySelectorAll('[data-scoped-lens-frame]');
    expect(frames).toHaveLength(2);
    expect(frames[0].getAttribute('data-style-lens')).toBe('quiet-meridian');
    expect(frames[1].getAttribute('data-style-lens')).toBe('candy-glass-arcade');
    expect(frames[1].getAttribute('data-density')).toBe('compact');
    expect(frames[1].getAttribute('data-motion-mode')).toBe('off');
  });
});
