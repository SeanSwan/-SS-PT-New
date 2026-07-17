/**
 * ProcessingOverlay — Deep-Ocean Vault payment processing state
 * ==============================================================
 * Full-screen overlay shown during payment processing.
 * Shows transaction ID, premium spinner, and 15s escape hatch.
 * Crystalline Swan theme: Royal Depth surface + Ice Wing accents.
 */
import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';

interface ProcessingOverlayProps {
  transactionId?: string;
  onContactSupport?: () => void;
}

const smoothSpin = keyframes`
  100% { transform: rotate(360deg); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const Container = styled.div`
  position: fixed;
  inset: 0;
  padding: 24px;
  box-sizing: border-box;
  background: var(--overlay-deep, rgba(0, 16, 48, 0.92));
  backdrop-filter: blur(6px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: ${fadeIn} 300ms cubic-bezier(0.4, 0, 0.2, 1);

  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const Card = styled.div`
  width: min(100%, 480px);
  box-sizing: border-box;
  background: var(--royal-depth, #003080);
  border: 1px solid var(--ice-wing, #60C0F0);
  border-radius: 12px;
  padding: clamp(28px, 8vw, 48px);
  color: var(--frost-white, #E0ECF4);
  text-align: center;
  box-shadow: 0 8px 32px var(--ice-glow, rgba(96, 192, 240, 0.3));
`;

const Spinner = styled.svg`
  width: 64px;
  height: 64px;
  color: var(--ice-wing, #60C0F0);
  animation: ${smoothSpin} 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  filter: drop-shadow(0 0 8px var(--ice-glow, rgba(96, 192, 240, 0.4)));

  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const StatusText = styled.p`
  margin: 24px 0 16px;
  color: var(--frost-white, #E0ECF4);
  font: 600 18px/1.5 'Plus Jakarta Sans', sans-serif;
`;

const TransactionId = styled.code`
  display: block;
  margin-top: 8px;
  color: var(--arctic-cyan, #50A0F0);
  font: 500 14px/1.5 'Fira Code', monospace;
  overflow-wrap: anywhere;
`;

const EscapeButton = styled.button`
  min-height: 44px;
  margin-top: 32px;
  padding: 12px 24px;
  border: 1px solid var(--gilded-fern, #C6A84B);
  border-radius: 8px;
  color: var(--frost-white, #E0ECF4);
  background: transparent;
  cursor: pointer;
  font: 700 16px 'Plus Jakarta Sans', sans-serif;
  transition: background-color 200ms ease, transform 120ms ease;
  animation: ${fadeIn} 500ms cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: var(--gold-wash, rgba(198, 168, 75, 0.1));
  }

  &:active { transform: scale(0.98); }

  &:focus-visible {
    outline: 2px solid var(--wing-purple, #8B5CF6);
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
  }
`;
const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  transactionId,
  onContactSupport,
}) => {
  const [showEscape, setShowEscape] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowEscape(true), 15000);
    return () => clearTimeout(timer);
  }, []);

  // Focus trap: move focus into modal on mount, restore on unmount
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement;
    containerRef.current?.focus();
    return () => { previouslyFocused?.focus?.(); };
  }, []);

  // Trap Tab key within modal
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = el.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) { e.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showEscape]);

  return (
    <Container ref={containerRef} role="dialog" aria-modal="true" aria-label="Payment processing" tabIndex={-1}>
      <Card role="status" aria-live="polite">
        <Spinner viewBox="0 0 64 64">
          <circle
            cx="32" cy="32" r="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="140 40"
          />
        </Spinner>
        <StatusText>Securing Your Investment...</StatusText>
        {transactionId && (
          <TransactionId>TXN-{transactionId}</TransactionId>
        )}
        {showEscape && (
          <EscapeButton onClick={onContactSupport || (() => window.location.href = '/support')}>
            Contact Support
          </EscapeButton>
        )}
      </Card>
    </Container>
  );
};

export default ProcessingOverlay;
