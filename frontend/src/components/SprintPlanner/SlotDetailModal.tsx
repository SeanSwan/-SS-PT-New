/**
 * ============================================================================
 * FILE: SlotDetailModal.tsx — R-H17, the dialog half (keyboard + focus contract).
 *
 * WHY THIS FILE EXISTS: the register row asks for "focus containment/restoration, Escape" on the
 * Sprint surfaces, and `SlotDetailPanel.tsx` stood at 298 lines against the rule-4 cap of 300, so the
 * contract could not be added in place. The overlay/content shell moved here — that is why the panel
 * shrank rather than grew — and the a11y behaviour lives with the shell that owns it.
 *
 * WHAT THE SHELL USED TO BE, and what was wrong with it:
 *   <ModalOverlay onClick={onClose} role="dialog" aria-modal="true">
 *     <ModalContent onClick={(e) => e.stopPropagation()}>
 * Three problems, all invisible to a jsdom suite that only asserts text:
 *   1. `role="dialog"` sat on the click-to-close BACKDROP rather than on the dialog content, so the
 *      element announced as the dialog was the one that dismisses it.
 *   2. Nothing handled Escape. The only mouse-only path out was clicking the backdrop or Close.
 *   3. Nothing contained or restored focus. Tab walked straight out into the page behind the dialog,
 *      and closing it dropped focus to `<body>`, so a keyboard user lost their place in the list.
 *
 * WHAT IT DOES NOW: `role="dialog" aria-modal="true"` and an accessible name go on the CONTENT;
 * Escape closes; focus moves into the dialog on open, cycles inside it on Tab/Shift+Tab, and returns
 * to whatever was focused before the dialog opened.
 * ============================================================================
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { ModalContent, ModalOverlay } from './SprintPlannerStyles';

interface SlotDetailModalProps {
  onClose: () => void;
  /** Accessible name for the dialog. Required: an unnamed dialog is announced as just "dialog". */
  label: string;
  children: React.ReactNode;
}

/** Everything the dialog should keep focus inside. Order matters: it defines the Tab cycle. */
const FOCUSABLE = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const SlotDetailModal: React.FC<SlotDetailModalProps> = ({ onClose, label, children }) => {
  const contentRef = useRef<HTMLDivElement | null>(null);
  /** What had focus before the dialog opened, so it can be given back on close. */
  const restoreRef = useRef<HTMLElement | null>(null);

  const focusables = useCallback((): HTMLElement[] => {
    const root = contentRef.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
  }, []);

  useEffect(() => {
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Move focus INTO the dialog. The container itself is focused when it holds nothing focusable —
    // otherwise a keyboard user would still be standing in the page behind an open dialog.
    const first = focusables()[0] ?? contentRef.current;
    first?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      // jsdom does not implement native tabbing, and neither does every browser modal pattern, so the
      // cycle is explicit: wrap at both ends and keep the event inside the dialog.
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        contentRef.current?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === contentRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      // Restore LAST, after the listener is gone, so returning focus cannot re-enter this handler.
      const target = restoreRef.current;
      restoreRef.current = null;
      if (target && document.contains(target)) target.focus();
    };
  }, [focusables, onClose]);

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        // Focusable programmatically only (never in the Tab order), so the container can hold focus
        // when it has no focusable child.
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </ModalContent>
    </ModalOverlay>
  );
};

export default SlotDetailModal;
