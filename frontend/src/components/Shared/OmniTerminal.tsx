/**
 * ============================================================================
 * FILE: OmniTerminal.tsx
 * PURPOSE: Persistent slide-in AI terminal drawer accessible from all pages
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-26
 * AI VILLAGE VALIDATED: 2026-03-26
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides a global slide-in drawer that wraps
 * AITerminalPanel. Desktop slides from the right; mobile rises as a
 * bottom-sheet with a drag handle. Escape key closes it.
 *
 * HOW IT FITS IN THE APP: Any page can open this via isOpen/onClose props.
 * It passes context and clientId through to AITerminalPanel.
 *
 * KEY DECISIONS: Used CSS transforms for GPU-composited open/close
 * animation. Overlay traps focus and prevents background scroll.
 *
 * ┌─── SUB-COMPONENT: OmniTerminal ────────────────────────────┐
 * │ PARENT: Any dashboard page / layout                         │
 * │ PURPOSE: Slide-in AI assistant accessible globally           │
 * │ WIREFRAME (Desktop):                                        │
 * │ ┌──────────────────────────────────────────┐                │
 * │ │ [SwanStudios Assistant]    [—] [X]       │ Header         │
 * │ ├──────────────────────────────────────────┤                │
 * │ │                                          │                │
 * │ │       <AITerminalPanel />                │ Body           │
 * │ │                                          │                │
 * │ └──────────────────────────────────────────┘                │
 * │ Props: { isOpen, onClose, context?, clientId? }             │
 * │ CLICK-OUTCOMES:                                              │
 * │ [Overlay] -> onClose()                                      │
 * │ [X button] -> onClose()                                     │
 * │ [Minimize] -> onClose()                                     │
 * │ [Escape key] -> onClose()                                   │
 * └──────────────────────────────────────────────────────────────┘
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { Minus, X } from 'lucide-react';
import AITerminalPanel from './AITerminalPanel';
import type { AIContext } from './AITerminalPanel';
import {
  DrawerContainer,
  DragHandle,
  DragPill,
  Header,
  HeaderActions,
  IconButton,
  Overlay,
  TerminalBody,
  Title,
} from './OmniTerminal.styles';
import { useGlobalClient } from '../../context/GlobalClientContext';

// ─────────────────────────────────────────────────────────────
// SECTION: Props
// ─────────────────────────────────────────────────────────────
export interface OmniTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  context?: AIContext;
  clientId?: number;
  initialPrompt?: string;
  initialPromptSendImmediately?: boolean;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Dark-first Crystalline Swan drawer with desktop/mobile modes
// ─────────────────────────────────────────────────────────────

/** Shared transition curve — spring snap-and-settle */
// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Orchestrates open/close state, keyboard handling,
//          and renders AITerminalPanel inside the drawer.
// ─────────────────────────────────────────────────────────────

const OmniTerminal: React.FC<OmniTerminalProps> = ({
  isOpen,
  onClose,
  context,
  clientId: propClientId,
  initialPrompt,
  initialPromptSendImmediately,
}) => {
  const drawerRef = useRef<HTMLElement>(null);
  // Use GlobalClientContext if no explicit clientId prop
  const { activeClient } = useGlobalClient();
  const clientId = propClientId ?? activeClient?.id;

  // ── Focus trap + keyboard handler (AI Village consensus fix) ──
  useEffect(() => {
    if (!isOpen) {
      // Delay aria-hidden removal to match exit animation (350ms)
      const timer = setTimeout(() => {
        document.getElementById('root')?.removeAttribute('aria-hidden');
      }, 350);
      return () => clearTimeout(timer);
    }

    // Hide main app from screen readers when drawer is open
    document.getElementById('root')?.setAttribute('aria-hidden', 'true');

    // Auto-focus first focusable element
    requestAnimationFrame(() => {
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable && focusable.length > 0) {
        focusable[0].focus();
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Focus trap: Tab cycles within drawer (queries dynamically for new elements)
      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(
            'button:not(:disabled), [href], input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      <Overlay $isOpen={isOpen} onClick={onClose} aria-hidden="true" />
      <DrawerContainer
        ref={drawerRef}
        $isOpen={isOpen}
        role="dialog"
        aria-modal="true"
        aria-label="Swan Coach Assistant"
      >
        {/* Mobile drag handle */}
        <DragHandle>
          <DragPill />
        </DragHandle>

        {/* Header */}
        <Header>
          <Title>SwanStudios Assistant</Title>
          <HeaderActions>
            <IconButton onClick={onClose} aria-label="Minimize">
              <Minus size={18} />
            </IconButton>
            <IconButton onClick={onClose} aria-label="Close assistant">
              <X size={18} />
            </IconButton>
          </HeaderActions>
        </Header>

        {/* AI Terminal */}
        <TerminalBody>
          {isOpen && (
            <AITerminalPanel
              context={context}
              clientId={clientId}
              initialPrompt={initialPrompt}
              initialPromptSendImmediately={initialPromptSendImmediately}
              defaultOpen
            />
          )}
        </TerminalBody>
      </DrawerContainer>
    </>
  );
};

export default OmniTerminal;
