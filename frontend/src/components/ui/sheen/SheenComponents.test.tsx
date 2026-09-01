/**
 * SheenButton / SheenCard — behaviour and house-rule tests (SWA-224)
 * ===================================================================
 * These lock the invariants that a future edit could plausibly break without
 * anything else failing: the Dual-Button Glow pairing, the decorative layers
 * staying out of the accessibility tree, keyboard activation on an interactive
 * card, and the per-surface token split that decisions 2 and 3 turned into
 * tokens rather than constants.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SheenButton } from './SheenButton';
import { SheenCard } from './SheenCard';
import { SHEEN, sheenFrameWidth, sheenShimmerFor } from '../../../styles/sheenPackTokens';
import * as pointerModule from '../../../hooks/useSheenPointer';

// Spy, not stub: the real hook still runs, we only observe what it is handed.
const pointerSpy = vi.spyOn(pointerModule, 'useSheenPointer');

describe('SheenButton', () => {
  it('renders a real button element with the label', () => {
    render(<SheenButton>Start session</SheenButton>);
    const btn = screen.getByRole('button', { name: 'Start session' });
    expect(btn.tagName).toBe('BUTTON');
  });

  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<SheenButton>Save</SheenButton>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });

  it('keeps an explicit type when one is given', () => {
    render(<SheenButton type="submit">Submit</SheenButton>);
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute('type', 'submit');
  });

  it('hides the decorative world layers from assistive tech', () => {
    const { container } = render(<SheenButton>Go</SheenButton>);
    const win = container.querySelector('.sheen-window');
    expect(win).not.toBeNull();
    expect(win).toHaveAttribute('aria-hidden', 'true');
    // the label must still be reachable
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
  });

  it('exposes the selected world for styling and diagnosis', () => {
    render(<SheenButton world="gold">Buy</SheenButton>);
    expect(screen.getByRole('button', { name: 'Buy' })).toHaveAttribute('data-sheen-world', 'gold');
  });

  it('fires onClick, and does not when disabled', () => {
    const onClick = vi.fn();
    const { rerender } = render(<SheenButton onClick={onClick}>Tap</SheenButton>);
    fireEvent.click(screen.getByRole('button', { name: 'Tap' }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <SheenButton onClick={onClick} disabled>
        Tap
      </SheenButton>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tap' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('forwards a ref to the underlying button', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<SheenButton ref={ref}>Ref</SheenButton>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});

describe('SheenCard', () => {
  it('is a plain container by default — no button role, not focusable', () => {
    render(<SheenCard>Body copy</SheenCard>);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Body copy').closest('[tabindex]')).toBeNull();
  });

  it('becomes a real control when interactive', () => {
    render(<SheenCard interactive>Body copy</SheenCard>);
    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('tabindex', '0');
  });

  it('activates on Enter AND on Space, not just the mouse', () => {
    const onClick = vi.fn();
    render(
      <SheenCard interactive onClick={onClick}>
        Open
      </SheenCard>,
    );
    const card = screen.getByRole('button');

    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(card, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('ignores keyboard activation when it is not interactive', () => {
    const onClick = vi.fn();
    const { container } = render(<SheenCard onClick={onClick}>Static</SheenCard>);
    const root = container.firstElementChild as HTMLElement;
    fireEvent.keyDown(root, { key: 'Enter' });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('still calls a caller-supplied onKeyDown', () => {
    const onKeyDown = vi.fn();
    render(
      <SheenCard interactive onKeyDown={onKeyDown}>
        Keys
      </SheenCard>,
    );
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it('hides its decorative layers too', () => {
    const { container } = render(<SheenCard>Body</SheenCard>);
    expect(container.querySelector('.sheen-window')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('SheenCard — Swan Card Standard: data cards must not track the pointer', () => {
  // CLAUDE.md: "Client/data cards ... must stay low-motion: no pointer tracking."
  // The Forge encodes the same split as .sw-card--showcase vs .sw-card--data.
  //
  // This asserts REGISTRATION, not rendered style. An earlier version of this
  // suite checked that --px was never written, which passed even with the
  // violation reintroduced: jsdom reports zero-size rects, the engine skips any
  // surface with no width, and so nothing is ever written for EITHER surface.
  // The assertion was true for a reason unrelated to the fix. Spying on what the
  // component hands the hook is the thing that actually differs.
  it('hands the pointer engine a null ref for a data card, and the real node for a showcase card', () => {
    const seen = pointerSpy.mock.calls.length;

    render(<SheenCard>Client record</SheenCard>);
    const dataRef = pointerSpy.mock.calls[seen][0] as React.RefObject<HTMLElement | null>;
    expect(dataRef.current).toBeNull();

    render(<SheenCard surface="showcase">Store item</SheenCard>);
    const showcaseRef = pointerSpy.mock.calls[seen + 1][0] as React.RefObject<HTMLElement | null>;
    expect(showcaseRef.current).toBeInstanceOf(HTMLElement);
  });

  it('defaults to the low-motion data surface', () => {
    const { container } = render(<SheenCard>Client record</SheenCard>);
    expect(container.firstElementChild).toHaveAttribute('data-sheen-surface', 'data');
  });

  it('opts in explicitly for a showcase card', () => {
    const { container } = render(<SheenCard surface="showcase">Store item</SheenCard>);
    expect(container.firstElementChild).toHaveAttribute('data-sheen-surface', 'showcase');
  });
});

describe('SheenWorldLayers — the layer set follows world KIND, not a hardcoded id', () => {
  // The dedupe replaced `world === 'sky'` with a kind lookup. If a future scenic
  // world is added and this branch is wrong, it renders a metal ring over scenery
  // and nothing else fails.
  it('paints scenery layers for a scenic world', () => {
    const { container } = render(<SheenButton world="sky">Sky</SheenButton>);
    const win = container.querySelector('.sheen-window')!;
    expect(win.querySelector('i.sky')).not.toBeNull();
    expect(win.querySelector('i.cl2')).not.toBeNull();
    expect(win.querySelector('i.spin')).toBeNull();
  });

  it('paints a rotating ring for a metal world', () => {
    const { container } = render(<SheenButton world="chrome">Chrome</SheenButton>);
    const win = container.querySelector('.sheen-window')!;
    expect(win.querySelector('i.spin')).not.toBeNull();
    expect(win.querySelector('i.hz')).not.toBeNull();
    expect(win.querySelector('i.sky')).toBeNull();
  });

  it('gives every world the shimmer and machined rim', () => {
    for (const w of ['chrome', 'gold', 'neon', 'sky'] as const) {
      const { container, unmount } = render(<SheenButton world={w}>{w}</SheenButton>);
      const win = container.querySelector('.sheen-window')!;
      expect(win.querySelector('i.shim')).not.toBeNull();
      expect(win.querySelector('i.rim')).not.toBeNull();
      unmount();
    }
  });
});

describe('token split — decisions 2 and 3 must stay per-surface, not per-app', () => {
  it('gives the card a heavier frame than the button', () => {
    expect(sheenFrameWidth('button')).toBe('4.5px');
    expect(sheenFrameWidth('card')).toBe('6px');
    expect(parseFloat(sheenFrameWidth('card'))).toBeGreaterThan(
      parseFloat(sheenFrameWidth('button')),
    );
  });

  it('shimmers harder over metal than over scenery', () => {
    expect(sheenShimmerFor('chrome')).toBe(SHEEN.shimmer.metal);
    expect(sheenShimmerFor('gold')).toBe(SHEEN.shimmer.metal);
    expect(sheenShimmerFor('neon')).toBe(SHEEN.shimmer.metal);
    expect(sheenShimmerFor('sky')).toBe(SHEEN.shimmer.scenic);
    // the documented failure was shimmer erasing scenery, so scenic must stay lower
    expect(SHEEN.shimmer.scenic).toBeLessThan(SHEEN.shimmer.metal);
  });

  it('keeps the cursor catch-up at the value that preserves the trail', () => {
    // Raising this erases candidate B's trailing orb — the mechanism that was chosen.
    expect(SHEEN.pointer.catchUp).toBe(0.22);
  });
});
