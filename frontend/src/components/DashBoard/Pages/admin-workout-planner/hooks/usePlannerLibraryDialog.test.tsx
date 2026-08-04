import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlannerLibraryDialog } from './usePlannerLibraryDialog';

const installCompactViewport = () => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(max-width: 1279px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
};

const Harness = () => {
  const [requestedOpen, setRequestedOpen] = React.useState(false);
  const close = React.useCallback(() => setRequestedOpen(false), []);
  const { dialogRef, open } = usePlannerLibraryDialog({ requestedOpen, onClose: close });

  return (
    <>
      <button type="button" onClick={() => setRequestedOpen(true)}>Open library</button>
      {open && (
        <div ref={dialogRef} role="dialog" tabIndex={-1}>
          <button type="button" onClick={close}>Close library</button>
          <button type="button">Last action</button>
        </div>
      )}
    </>
  );
};

describe('usePlannerLibraryDialog', () => {
  beforeEach(() => {
    installCompactViewport();
    document.body.style.overflow = '';
  });

  it('locks page scroll, traps focus, closes on Escape, and restores the opener', () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open library' });

    opener.focus();
    fireEvent.click(opener);

    const close = screen.getByRole('button', { name: 'Close library' });
    const last = screen.getByRole('button', { name: 'Last action' });
    expect(document.body.style.overflow).toBe('hidden');
    expect(close).toHaveFocus();

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(close).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
    expect(opener).toHaveFocus();
  });
});
