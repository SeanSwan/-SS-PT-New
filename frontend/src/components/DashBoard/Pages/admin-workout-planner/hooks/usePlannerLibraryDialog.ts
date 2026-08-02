/**
 * HOOK: usePlannerLibraryDialog
 * PURPOSE: Gives the compact Workout Planner exercise library complete modal
 * keyboard behavior without changing the desktop workbench. It activates only
 * below the V2 compact breakpoint, traps focus, closes on Escape, locks page
 * scroll, and returns focus to the control that opened the library.
 */
import React from 'react';

const COMPACT_QUERY = '(max-width: 1279px)';
const FOCUSABLE = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface PlannerLibraryDialogOptions {
  requestedOpen: boolean;
  onClose: () => void;
}

const readsCompactViewport = (): boolean => (
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia(COMPACT_QUERY).matches
);

export const usePlannerLibraryDialog = ({ requestedOpen, onClose }: PlannerLibraryDialogOptions) => {
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const openerRef = React.useRef<HTMLElement | null>(null);
  const [compact, setCompact] = React.useState(readsCompactViewport);

  React.useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia(COMPACT_QUERY);
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const open = requestedOpen && compact;

  React.useEffect(() => {
    if (!open) return undefined;
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    openerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter(element => element.getAttribute('aria-hidden') !== 'true');
    focusable()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = focusable();
      if (controls.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (openerRef.current?.isConnected) openerRef.current.focus();
    };
  }, [onClose, open]);

  return { dialogRef, open };
};
