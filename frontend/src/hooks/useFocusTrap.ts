/**
 * FILE: useFocusTrap.ts
 * PURPOSE: Shared modal focus contract — initial focus, Tab containment, restore.
 * CREATED: 2026-08-22 · Wave 1 Slice 9 (client-dashboard remediation)
 *
 * WHY THIS EXISTS
 * `focus-trap-react` is not installed, so this contract has been hand-rolled at
 * least three times (PdfApprovalVault, ClientPlanDetailModal, PostSaveHandoff)
 * and was missing entirely from the client mobile navigation drawer — which
 * locked body scroll and closed on Escape but let Tab walk straight out into
 * the page behind it. A keyboard or screen-reader user could not reliably
 * operate the drawer.
 *
 * The behavior here is extracted from the existing PdfApprovalVault
 * implementation so the app has one contract rather than four dialects. The
 * three existing modals are intentionally NOT refactored in this slice — they
 * work, and rewriting them is unrelated to the drawer defect. They are the
 * obvious follow-up.
 *
 * WHAT IT GUARANTEES while `active` is true:
 *   - focus moves into the container on open (preferring `initialFocusRef`)
 *   - Tab and Shift+Tab cycle within the container
 *   - Escape invokes `onEscape`
 *   - focus returns to whatever was focused before opening
 *
 * WHAT IT DOES NOT DO: scroll-lock or `inert` on the background. Callers own
 * those, because they differ per surface (the drawer uses a body class).
 *
 * ONE ACTIVE TRAP AT A TIME. The keydown listener is document-global, so two
 * simultaneously-active traps would each pull focus back on every Tab — a focus
 * war with no winner. Today the drawer is the only caller and the closed drawer
 * sets `visibility: hidden`, which removes it from the tab order, so there is no
 * live conflict. Before migrating the three in-house modals onto this hook
 * (PdfApprovalVault, ClientPlanDetailModal, PostSaveHandoff), add a stack so the
 * most recently activated trap is the only one that acts. Raised by GLM 5.3 on
 * the post-ship panel; recorded here rather than built speculatively for a
 * second caller that does not yet exist.
 *
 * Honors `active` changing at any time; every listener is removed on cleanup.
 */
import { useEffect, type RefObject } from 'react';

/** Matches the selector already used by the in-house modals. */
export const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], iframe, input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface FocusTrapOptions {
  /** Element to focus on open. Falls back to the first focusable child. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Called on Escape. Omit to leave Escape handling to the caller. */
  onEscape?: () => void;
  /** Restore focus to the previously focused element on close. Default true. */
  restoreFocus?: boolean;
}

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  { initialFocusRef, onEscape, restoreFocus = true }: FocusTrapOptions = {},
): void {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const opener = document.activeElement;

    // Visibility filtering is deliberately two-tier.
    //
    // The in-house modals this was extracted from filtered on
    // `el.offsetParent !== null`. That reads as a visibility test but is really
    // a LAYOUT test, and it returns null in any environment that does not do
    // layout — every element in jsdom, so the list came back empty and the trap
    // silently did nothing under test. It is also null for position:fixed
    // elements in real browsers.
    //
    // So: always apply the attribute checks, and apply the layout check only
    // when the environment demonstrably reports layout. Where it does not, the
    // trap degrades to attribute-only rather than to nothing.
    const hasLayout = container.getClientRects?.().length > 0;

    const visibleFocusables = (): HTMLElement[] =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
        if (el === document.activeElement) return true;
        if (el.hasAttribute('hidden')) return false;
        if (el.getAttribute('aria-hidden') === 'true') return false;
        if ((el as HTMLButtonElement).disabled) return false;
        if (hasLayout) return el.offsetParent !== null || el.getClientRects().length > 0;
        return true;
      });

    // Move focus in. rAF lets an entrance transition mount its children first —
    // focusing a not-yet-painted element is a no-op and would leave focus behind.
    const frame = requestAnimationFrame(() => {
      const target = initialFocusRef?.current ?? visibleFocusables()[0] ?? container;
      target.focus?.();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        onEscape();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusables = visibleFocusables();
      if (focusables.length === 0) {
        // Nothing to land on — keep focus from escaping the container.
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement;

      // Focus outside the container (or on the container itself) re-enters at
      // the correct end rather than continuing into the page behind.
      if (!container.contains(activeEl) || activeEl === container) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && activeEl === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeEl === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      if (restoreFocus && opener instanceof HTMLElement && document.contains(opener)) {
        opener.focus();
      }
    };
  }, [active, containerRef, initialFocusRef, onEscape, restoreFocus]);
}

export default useFocusTrap;
