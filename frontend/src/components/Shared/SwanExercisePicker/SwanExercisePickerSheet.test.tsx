/**
 * SwanExercisePickerSheet tests (Phase 2.3b)
 *
 * Locks the hardened overlay contract (house pattern): body portal, dialog
 * semantics, Escape + backdrop close, body scroll lock + restore, initial
 * focus on the close control, and reduced-motion source discipline.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import SwanExercisePickerSheet from './SwanExercisePickerSheet';

describe('SwanExercisePickerSheet', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
  });

  it('portals a labelled dialog to document.body and locks scroll', () => {
    render(
      <div data-testid="host">
        <SwanExercisePickerSheet title="Goblet Squat" onClose={vi.fn()}>
          <p>Sheet content</p>
        </SwanExercisePickerSheet>
      </div>,
    );

    const dialog = screen.getByRole('dialog', { name: /goblet squat/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByTestId('host')).not.toContainElement(dialog);
    expect(screen.getByText('Sheet content')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('closes on Escape and restores scroll on unmount', () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <SwanExercisePickerSheet title="Goblet Squat" onClose={onClose}>
        <p>Sheet content</p>
      </SwanExercisePickerSheet>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('closes on backdrop press but not on panel press, and focuses the close control', () => {
    const onClose = vi.fn();
    render(
      <SwanExercisePickerSheet title="Goblet Squat" onClose={onClose}>
        <p>Sheet content</p>
      </SwanExercisePickerSheet>,
    );

    expect(document.activeElement).toBe(screen.getByRole('button', { name: /close goblet squat preview/i }));
    fireEvent.mouseDown(screen.getByText('Sheet content'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByTestId('swan-picker-sheet-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('honors reduced motion and portals (source locks)', () => {
    const sheet = readFileSync(resolve(__dirname, 'SwanExercisePickerSheet.tsx'), 'utf8');
    expect(sheet).toContain('createPortal');
    const overlayStyles = readFileSync(resolve(__dirname, 'styles.overlay.ts'), 'utf8');
    expect(overlayStyles).toContain('prefers-reduced-motion');
    expect(overlayStyles).toContain('z-index: 2200');
  });
});
