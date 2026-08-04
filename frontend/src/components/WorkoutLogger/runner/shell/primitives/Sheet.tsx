/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Sheet — the SESSION SHELL's shared overlay primitive.       │
 * │ Every sheet/drawer in the shell (rolodex, coach, keypad,    │
 * │ plan source) mounts through this so the anti-jump laws are  │
 * │ structural, not per-surface convention:                     │
 * │  law 1 — stores activeElement on open, restores on close,   │
 * │          traps Tab while open, ESC closes                   │
 * │  law 4 — pushes ONE history entry; mobile/browser back      │
 * │          closes the sheet (never leaves the page); UI close │
 * │          consumes its own entry                             │
 * │  law 6 — reduced-motion: entrance is opacity-only → none    │
 * │  M3    — fixed overlay, overscroll-contained panel; the     │
 * │          page scroll NEVER moves                            │
 * │ Source: SESSION-SHELL-HANDOFF-2026-07-30 §3 anti-jump laws. │
 * └─────────────────────────────────────────────────────────────┘
 */
import React, { useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const sheetIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: color-mix(in srgb, var(--world-bg, #030712) 62%, transparent);

  @media (min-width: 768px) {
    align-items: center;
  }
`;

const Panel = styled.div`
  width: 100%;
  max-width: 640px;
  max-height: 85dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--world-panel, #1a1a24);
  border: 1px solid color-mix(in srgb, var(--world-text, #e0ecf4) 12%, transparent);
  border-radius: 16px 16px 0 0;
  padding: 16px;
  animation: ${sheetIn} 160ms ease-out;
  outline: none;

  @media (min-width: 768px) {
    border-radius: 16px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Accessible dialog name. */
  label: string;
  /** History-entry identity (anti-jump law 4). */
  historyKey?: string;
  children: React.ReactNode;
}

const Sheet: React.FC<SheetProps> = ({ open, onClose, label, historyKey = 'sheet', children }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  /** True when the browser back button already consumed our history entry. */
  const closedByPopRef = useRef(false);

  useEffect(() => {
    if (!open) return undefined;
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closedByPopRef.current = false;
    window.history.pushState({ ssSheet: historyKey }, '');

    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (firstFocusable ?? panel)?.focus();

    const handlePop = (event: PopStateEvent) => {
      if ((event.state as { ssSheet?: string } | null)?.ssSheet === historyKey) return;
      closedByPopRef.current = true;
      onCloseRef.current();
    };
    window.addEventListener('popstate', handlePop);

    return () => {
      window.removeEventListener('popstate', handlePop);
      // UI close still owns a live history entry — consume it so back
      // never resurrects a closed sheet. A pop-driven close already did,
      // and a route change means our entry is no longer on top: back()
      // would then eat someone ELSE's entry, so verify it is ours first.
      const topState = window.history.state as { ssSheet?: string } | null;
      if (!closedByPopRef.current && topState?.ssSheet === historyKey) window.history.back();
      returnTo?.focus();
    };
  }, [open, historyKey]);

  if (!open) return null;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onCloseRef.current();
      return;
    }
    if (event.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <Overlay
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCloseRef.current();
      }}
    >
      <Panel
        ref={panelRef}
        role='dialog'
        aria-modal='true'
        aria-label={label}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {children}
      </Panel>
    </Overlay>
  );
};

export default Sheet;
