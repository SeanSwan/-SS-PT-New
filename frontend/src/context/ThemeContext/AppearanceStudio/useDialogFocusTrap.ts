/** Keyboard containment for the portaled Appearance Studio modal. */
import { useCallback, useEffect, useRef } from 'react';

const FOCUSABLE = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export const useDialogFocusTrap = (onDismiss: () => void) => {
  const dialogRef = useRef<HTMLElement>(null);

  const focusables = useCallback(
    () => Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
    ).filter((element) => element.getAttribute('aria-hidden') !== 'true'),
    [],
  );

  useEffect(() => {
    focusables()[0]?.focus();
  }, [focusables]);

  const onDialogKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onDismiss();
        return;
      }
      if (event.key !== 'Tab') return;

      const elements = focusables();
      if (elements.length === 0) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [focusables, onDismiss],
  );

  return { dialogRef, onDialogKeyDown };
};
