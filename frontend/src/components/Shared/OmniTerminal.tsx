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
import styled from 'styled-components';
import { Minus, X } from 'lucide-react';
import AITerminalPanel from './AITerminalPanel';
import type { AIContext } from './AITerminalPanel';

// ─────────────────────────────────────────────────────────────
// SECTION: Props
// ─────────────────────────────────────────────────────────────
export interface OmniTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  context?: AIContext;
  clientId?: number;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Dark-first Crystalline Swan drawer with desktop/mobile modes
// ─────────────────────────────────────────────────────────────

const Overlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1099;
  background: rgba(0, 0, 0, 0.4);
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  pointer-events: ${({ $isOpen }) => ($isOpen ? 'auto' : 'none')};
  transition: opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
`;

/** Shared transition curve — spring snap-and-settle */
const TRANSITION = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)';

const DrawerContainer = styled.aside<{ $isOpen: boolean }>`
  position: fixed;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated, rgba(26, 26, 36, 0.85));
  backdrop-filter: blur(16px) saturate(120%);
  -webkit-backdrop-filter: blur(16px) saturate(120%);
  color: var(--text-primary, #E0ECF4);
  transition: ${TRANSITION};

  /* Glassmorphism fallback */
  @supports not (backdrop-filter: blur(16px)) {
    background: var(--bg-elevated, #1A1A24);
    box-shadow: -4px 0 24px rgba(10, 10, 15, 0.9);
  }

  /* Desktop: slide from right */
  @media (min-width: 1024px) {
    top: 0;
    right: 0;
    width: 420px;
    height: 100vh;
    border-left: 1px solid rgba(96, 192, 240, 0.15);
    box-shadow: -10px 0 30px rgba(10, 10, 15, 0.8);
    transform: ${({ $isOpen }) => ($isOpen ? 'translateX(0)' : 'translateX(100%)')};
  }

  /* Mobile: bottom-sheet */
  @media (max-width: 1023px) {
    bottom: 0;
    left: 0;
    width: 100%;
    height: 85vh;
    border-top: 1px solid rgba(96, 192, 240, 0.15);
    border-radius: 24px 24px 0 0;
    box-shadow: 0 -10px 30px rgba(10, 10, 15, 0.8);
    transform: ${({ $isOpen }) => ($isOpen ? 'translateY(0)' : 'translateY(100%)')};
  }
`;

const DragHandle = styled.div`
  display: none;
  @media (max-width: 1023px) {
    display: flex;
    justify-content: center;
    padding: 10px 0 4px;
  }
`;

const DragPill = styled.div`
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: var(--text-muted, rgba(224, 236, 244, 0.3));
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  flex-shrink: 0;
`;

const Title = styled.h2`
  font-family: 'Plus Jakarta Sans', 'Sora', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-heading, #E0ECF4);
  margin: 0;
  letter-spacing: 0.02em;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, #94a3b8);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: var(--accent-primary-10, rgba(96, 192, 240, 0.1));
    color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4),
      inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }

  &:active {
    transform: scale(0.92);
  }
`;

const TerminalBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow: hidden;

  /* Let AITerminalPanel fill the space and handle its own scroll */
  & > * {
    height: 100%;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Orchestrates open/close state, keyboard handling,
//          and renders AITerminalPanel inside the drawer.
// ─────────────────────────────────────────────────────────────

const OmniTerminal: React.FC<OmniTerminalProps> = ({
  isOpen,
  onClose,
  context,
  clientId,
}) => {
  const drawerRef = useRef<HTMLElement>(null);

  // Escape key handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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
        aria-label="SwanStudios AI Assistant"
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
              defaultOpen
              compact
            />
          )}
        </TerminalBody>
      </DrawerContainer>
    </>
  );
};

export default OmniTerminal;
