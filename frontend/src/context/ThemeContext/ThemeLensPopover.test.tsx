/**
 * ThemeLensPopover.test.tsx
 * =========================
 *
 * The gate for the picker, authored from the failure artefacts it must reject:
 *
 *   1. "the radiogroup is 28 tab stops — every option is tabbable, so Tab walks
 *       through all 28 themes instead of leaving the popover, and the group has no
 *       single tab stop the way a radio group is supposed to."
 *
 *   2. "arrow keys move focus but do not select, so `aria-checked` goes stale and
 *       a screen reader is told the wrong theme is active."
 *
 * Both are the same mistake seen from two sides: the group was built as 28 buttons
 * that happen to carry `role="radio"`, not as a radiogroup. Rendering 28 tabbable
 * options passed every other check — the role was right, the count was right,
 * aria-checked was right, every option was named.
 */

import { describe, expect, it, vi } from 'vitest';
import { createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import UniversalThemeProvider, { themeCycle } from './UniversalThemeContext';
import ThemeLensPopover from './ThemeLensPopover';

const renderPicker = (activeTheme: (typeof themeCycle)[number]) => {
  const onSelect = vi.fn();
  const onPreview = vi.fn();
  const onClose = vi.fn();
  const onCycle = vi.fn();

  render(
    <UniversalThemeProvider defaultTheme={activeTheme}>
      <ThemeLensPopover
        activeTheme={activeTheme}
        onSelect={onSelect}
        onPreview={onPreview}
        onClose={onClose}
        onCycle={onCycle}
      />
    </UniversalThemeProvider>
  );

  return { onSelect, onPreview, onClose, onCycle };
};

/** The panel focuses the active option once on open; wait for that to settle. */
const focusedIndex = async (radios: HTMLElement[], activeTheme: string) => {
  const start = themeCycle.indexOf(activeTheme as (typeof themeCycle)[number]);
  await waitFor(() => expect(document.activeElement).toBe(radios[start]));
  return start;
};

describe('theme picker popover', () => {
  it('presents every registered theme as a radio option', () => {
    renderPicker('crystalline-dark');

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(themeCycle.length);
  });

  it('is a dialog containing one radiogroup', () => {
    renderPicker('crystalline-dark');

    expect(screen.getByRole('dialog', { name: /choose a theme/i })).toBeTruthy();
    expect(screen.getAllByRole('radiogroup')).toHaveLength(1);
  });

  /**
   * THE load-bearing assertion for the roving tabindex. Without
   * `tabIndex={index === focusedIndex ? 0 : -1}` this finds 28 tabbable options.
   */
  it('opens with exactly one tab stop, on the active theme', () => {
    renderPicker('crystalline-dark');

    const radios = screen.getAllByRole('radio');
    const tabbable = radios.filter((radio) => radio.getAttribute('tabindex') === '0');

    expect(
      tabbable.length,
      `${tabbable.length} tabbable options — a radiogroup has one tab stop`
    ).toBe(1);
    expect(tabbable[0].getAttribute('aria-checked')).toBe('true');
    expect(tabbable[0].getAttribute('aria-label')).toBe('Crystalline Dark');
  });

  it('opens on whichever theme is active', () => {
    renderPicker('solar-gold');

    const radios = screen.getAllByRole('radio');
    const tabbable = radios.filter((radio) => radio.getAttribute('tabindex') === '0');

    expect(tabbable).toHaveLength(1);
    expect(tabbable[0].getAttribute('aria-label')).toBe('Solar Gold');
  });

  /**
   * The tab stop follows FOCUS, not selection. If it were bound to `selected` it
   * would still be one tab stop and every check above would still pass — while the
   * user's Tab key went somewhere other than where their focus was.
   */
  it('moves the single tab stop to the option focus lands on', async () => {
    renderPicker('crystalline-dark');
    const radios = screen.getAllByRole('radio');
    const start = await focusedIndex(radios, 'crystalline-dark');

    fireEvent.keyDown(radios[start], { key: 'ArrowRight' });

    expect(radios[start + 1].getAttribute('tabindex')).toBe('0');
    expect(radios[start].getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(radios[start + 1]);
  });

  /**
   * The load-bearing assertion for the arrow behaviour. Focus-only navigation
   * (the shipped state) leaves `onPreview` uncalled and fails here.
   */
  it('arrow keys apply the theme without closing, as a native radio group does', async () => {
    const { onSelect, onPreview, onClose } = renderPicker('crystalline-dark');
    const radios = screen.getAllByRole('radio');
    const start = await focusedIndex(radios, 'crystalline-dark');

    fireEvent.keyDown(radios[start], { key: 'ArrowRight' });

    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(onPreview).toHaveBeenCalledWith(themeCycle[start + 1]);
    // Arrows preview. Committing-and-closing on the first keypress would make the
    // grid unusable for a keyboard user.
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('walks backwards with ArrowLeft and wraps at the ends', async () => {
    const { onPreview } = renderPicker(themeCycle[0]);
    const radios = screen.getAllByRole('radio');
    const start = await focusedIndex(radios, themeCycle[0]);

    fireEvent.keyDown(radios[start], { key: 'ArrowLeft' });

    // Wraps to the last theme rather than sticking at the first.
    expect(onPreview).toHaveBeenCalledWith(themeCycle[themeCycle.length - 1]);
  });

  it('jumps to the ends with Home and End', async () => {
    const { onPreview } = renderPicker('crystalline-dark');
    const radios = screen.getAllByRole('radio');
    const start = await focusedIndex(radios, 'crystalline-dark');

    fireEvent.keyDown(radios[start], { key: 'End' });
    expect(onPreview).toHaveBeenLastCalledWith(themeCycle[themeCycle.length - 1]);

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Home' });
    expect(onPreview).toHaveBeenLastCalledWith(themeCycle[0]);
  });

  it('marks exactly one option as checked', () => {
    renderPicker('enchanted-forest');

    const checked = screen
      .getAllByRole('radio')
      .filter((radio) => radio.getAttribute('aria-checked') === 'true');

    expect(checked).toHaveLength(1);
    expect(checked[0].getAttribute('aria-label')).toBe('Enchanted Forest');
  });

  it('names every option, so none is an unlabelled swatch', () => {
    renderPicker('crystalline-dark');

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio.getAttribute('aria-label')?.trim()).toBeTruthy();
    }
  });

  it('commits and closes on click', async () => {
    const { onSelect, onPreview } = renderPicker('crystalline-dark');
    const radios = screen.getAllByRole('radio');
    const target = themeCycle.indexOf('solar-gold');

    fireEvent.click(radios[target]);

    expect(onSelect).toHaveBeenCalledWith('solar-gold');
    // A click commits; it does not go through the preview path.
    expect(onPreview).not.toHaveBeenCalled();
  });

  it('reports the follow-system preference as a switch', () => {
    renderPicker('crystalline-dark');

    const toggle = screen.getByRole('switch', { name: /system colour scheme/i });
    expect(toggle.getAttribute('aria-checked')).toMatch(/^(true|false)$/);
  });

  /**
   * The focus-restore contract, which has TWO directions and only one of them was
   * implemented. `closePicker(restoreFocus = true)` returns focus to the lens — right
   * for Escape, where the popover owned focus. Wrong for an outside click: the
   * browser has just focused whatever the user aimed at, and a restore in the next
   * frame YANKS focus back to the lens, so the element they clicked never activates.
   */
  it('closes WITHOUT restoring focus when the user clicks outside', () => {
    const { onClose } = renderPicker('crystalline-dark');

    fireEvent.mouseDown(document.body);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith(false);
  });

  it('closes WITH a focus restore on Escape, because the popover owned focus', async () => {
    const { onClose } = renderPicker('crystalline-dark');
    const radios = screen.getAllByRole('radio');
    const start = await focusedIndex(radios, 'crystalline-dark');

    fireEvent.keyDown(radios[start], { key: 'Escape' });

    expect(onClose).toHaveBeenCalledWith(true);
  });

  it('prevents the default Tab move so the focus restore cannot fight it', async () => {
    const { onClose } = renderPicker('crystalline-dark');
    const radios = screen.getAllByRole('radio');
    const start = await focusedIndex(radios, 'crystalline-dark');

    const event = createEvent.keyDown(radios[start], { key: 'Tab' });
    fireEvent(radios[start], event);

    // Without preventDefault the browser moves focus and the next-frame restore
    // fights it, which reads to the user as a focus jump.
    expect(event.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledWith(true);
  });

  /**
   * HY4 round 3 (#2, HIGH) — the counterpart to the test above, and the reason it
   * needed one.
   *
   * The panel focuses the grid's active option on open, and the grid is the LAST
   * focusable thing in the panel. So the only keyboard route to the "Match system"
   * switch and the "Next" cycle button is BACKWARDS, with Shift+Tab. Closing on
   * Shift+Tab — which is what handling every Tab the same way did — unmounted the
   * panel and restored focus to the lens before either control could be reached.
   * Two controls, permanently unreachable by keyboard: WCAG 2.1.1.
   */
  it('leaves Shift+Tab alone, so the switch and cycle button stay reachable', async () => {
    const { onClose } = renderPicker('crystalline-dark');
    const radios = screen.getAllByRole('radio');
    const start = await focusedIndex(radios, 'crystalline-dark');

    const event = createEvent.keyDown(radios[start], { key: 'Tab', shiftKey: true });
    fireEvent(radios[start], event);

    expect(event.defaultPrevented).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });

  /**
   * The other half of #2: with Shift+Tab allowed through, focus can genuinely leave
   * the panel, and an orphaned panel would otherwise sit open behind the header.
   * It must close WITHOUT restoring focus — focus has already moved, which is why
   * focusout fired at all, and pulling it back would undo the user's move.
   */
  it('closes without restoring focus when focus leaves the panel for the page', () => {
    const { onClose } = renderPicker('crystalline-dark');
    const panel = screen.getByRole('dialog', { name: /choose a theme/i });
    const outside = document.createElement('button');
    document.body.appendChild(outside);

    fireEvent.focusOut(panel, { relatedTarget: outside });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith(false);

    outside.remove();
  });

  it('does not close when focus only moves between controls inside the panel', () => {
    const { onClose } = renderPicker('crystalline-dark');
    const panel = screen.getByRole('dialog', { name: /choose a theme/i });
    const radios = screen.getAllByRole('radio');

    fireEvent.focusOut(panel, { relatedTarget: radios[1] });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not close when the whole window loses focus', () => {
    // relatedTarget is null when focus leaves the document (alt-tab, devtools).
    // Closing there would dismiss the picker for switching windows.
    const { onClose } = renderPicker('crystalline-dark');
    const panel = screen.getByRole('dialog', { name: /choose a theme/i });

    fireEvent.focusOut(panel, { relatedTarget: null });

    expect(onClose).not.toHaveBeenCalled();
  });
});
