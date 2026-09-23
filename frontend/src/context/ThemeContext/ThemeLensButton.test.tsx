/**
 * ThemeLensButton.test.tsx
 * =========================
 *
 * The accessibility contract of the header lens itself.
 *
 * WHY THIS EXISTS
 * HY4 round 3 (#4, MEDIUM): the tooltip was `role="presentation"`, which strips an
 * element's SEMANTICS but leaves its TEXT in the accessibility tree — so a screen
 * reader announced the theme twice, once from the bubble and once from the button's
 * own `aria-label`. It is now `aria-hidden="true"`.
 *
 * WHAT THIS GATE DOES AND DOES NOT PROVE
 * jsdom does not expose the computed accessibility tree, so the strongest available
 * assertion is the attribute contract plus the absence of any `presentation` role in
 * the subtree. The a11y-tree behaviour itself was checked in a real browser by the
 * lens harness; anything beyond the attributes is marked UNVERIFIED here rather than
 * implied.
 */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import UniversalThemeProvider from './UniversalThemeContext';
import ThemeLensButton from './ThemeLensButton';

const renderLens = () => {
  render(
    <UniversalThemeProvider defaultTheme="crystalline-dark">
      <ThemeLensButton isPickerOpen={false} onOpenPicker={vi.fn()} onCycle={vi.fn()} />
    </UniversalThemeProvider>
  );
  return screen.getByRole('button', { name: /Activate to choose a theme/ });
};

/**
 * The bubble appears 300ms after hover or focus — deliberately, so it does not flash
 * while the pointer crosses the header. It used to be hover-only, so keyboard and
 * touch users never saw it; hovering here is just the shortest route to it.
 */
const revealTooltip = async (button: HTMLElement): Promise<HTMLElement> => {
  fireEvent.mouseEnter(button);
  await waitFor(() => expect(document.querySelector('[data-theme-tooltip]')).toBeTruthy(), {
    timeout: 2000,
  });
  return document.querySelector('[data-theme-tooltip]') as HTMLElement;
};

describe('theme lens button', () => {
  it('names itself with the active theme and the interaction hint', () => {
    const button = renderLens();

    expect(button.getAttribute('aria-label')).toBe(
      'Theme: Crystalline Dark. Activate to choose a theme.'
    );
    expect(button.getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('keeps the decorative tooltip out of the accessibility tree', async () => {
    const bubble = await revealTooltip(renderLens());

    expect(bubble.getAttribute('aria-hidden')).toBe('true');
    // The round-3 defect, asserted directly: presentation strips semantics but not
    // text, so it is the wrong tool for "this is decorative".
    expect(bubble.getAttribute('role')).toBeNull();
  });

  it('exposes no element claiming the presentation role', async () => {
    await revealTooltip(renderLens());

    expect(screen.queryAllByRole('presentation')).toHaveLength(0);
  });

  it('still carries the theme name visually, so hiding it costs nothing', async () => {
    // aria-hidden must not be a way of deleting the tooltip. If this ever fails,
    // the bubble was removed rather than hidden.
    const bubble = await revealTooltip(renderLens());

    expect(bubble.textContent).toContain('Crystalline Dark');
  });

  it('announces theme changes through a live region instead of the tooltip', () => {
    renderLens();

    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toContain('Crystalline Dark');
  });
});
