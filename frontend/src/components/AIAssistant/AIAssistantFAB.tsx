/**
 * AIAssistantFAB (Floating Action Button)
 * ========================================
 * Renders the AI assistant trigger button + drawer.
 * Drop this into any dashboard — it manages its own state.
 *
 * Gemini 3.1 Pro design specs:
 *   - Desktop (1024px+): Cmd+K / Ctrl+K keyboard shortcut bar (bottom-right)
 *   - Mobile/Tablet: Swan logo FAB with Nebula Glow (bottom-right, above taskbar)
 *   - "Nebula Glow" = breathing box-shadow using Swan Cyan + Cosmic Purple
 *   - Idle: subtle float animation
 *   - Listening/Processing: pulsing nebula glow
 *
 * Also exported: openAIAssistant callback for sidebar integration.
 *
 * Usage:
 *   <AIAssistantFAB userRole="client" />
 *   <AIAssistantFAB userRole="trainer" defaultContext="workout_generation" />
 */
import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import styled, { keyframes } from 'styled-components';
import { Command } from 'lucide-react';
import type { AIContext } from '../../hooks/useAIChat';

const AIAssistantDrawer = lazy(() => import('./AIAssistantDrawer'));

// ── Nebula Glow Animation (Gemini 3.1 Pro spec) ──
const nebulaGlow = keyframes`
  0%, 100% {
    box-shadow: 0 4px 18px rgba(139, 92, 246, 0.35),
                0 0 24px rgba(139, 92, 246, 0.15);
  }
  50% {
    box-shadow: 0 4px 28px rgba(139, 92, 246, 0.55),
                0 0 48px rgba(139, 92, 246, 0.3),
                0 0 64px rgba(139, 92, 246, 0.1);
  }
`;

// ── Subtle float animation (idle state) ──
const floatIdle = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`;

const FAB = styled.button`
  position: fixed;
  bottom: 80px;
  right: 20px;
  z-index: 1250;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid rgba(139, 92, 246, 0.4);
  background: rgba(0, 32, 96, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #002060;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
  will-change: transform;
  animation: ${nebulaGlow} 3s ease-in-out infinite,
             ${floatIdle} 2s ease-in-out infinite;
  padding: 0;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    filter: drop-shadow(0 0 6px rgba(139, 92, 246, 0.4));
  }

  &:hover {
    transform: scale(1.08);
    box-shadow: 0 6px 32px rgba(139, 92, 246, 0.6),
                0 0 40px rgba(139, 92, 246, 0.35);
  }

  &:active {
    transform: scale(0.95);
  }

  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: 3px;
  }

  /* Desktop: slightly larger, well clear of Windows taskbar */
  @media (min-width: 1024px) {
    bottom: 90px;
    right: 24px;
    width: 56px;
    height: 56px;
  }

  /* Mobile: above browser chrome & Windows taskbar (80px up) */
  @media (max-width: 768px) {
    bottom: 72px;
    right: 16px;
    width: 48px;
    height: 48px;
  }

  /* Reduce animations for accessibility / low-end devices */
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    will-change: auto;
  }
`;

// ── Desktop Cmd+K Trigger Bar ──
const CmdKBar = styled.button`
  position: fixed;
  bottom: 90px;
  right: 24px;
  z-index: 1250;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: rgba(0, 32, 96, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 14px;
  color: rgba(224, 236, 244, 0.6);
  cursor: pointer;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
  animation: ${nebulaGlow} 4s ease-in-out infinite;

  img {
    width: 20px;
    height: 20px;
    object-fit: contain;
    filter: drop-shadow(0 0 4px rgba(139, 92, 246, 0.4));
  }

  &:hover {
    border-color: rgba(139, 92, 246, 0.5);
    color: rgba(224, 236, 244, 0.9);
    background: rgba(0, 32, 96, 0.8);
  }

  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: 2px;
  }

  @media (max-width: 1023px) {
    display: none;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const KbdStyle = styled.kbd`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 7px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.25);
  border-radius: 6px;
  font-size: 12px;
  font-family: inherit;
  color: #8B5CF6;
  line-height: 1;
`;

// ── Mobile-only wrapper ──
const MobileFABWrapper = styled.div`
  @media (min-width: 1024px) {
    display: none;
  }
`;

export interface AIAssistantFABProps {
  userRole: 'client' | 'trainer' | 'admin';
  defaultContext?: AIContext;
  /** If true, hide the FAB (used when opened from sidebar instead) */
  externalOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Detect low-end devices for animation reduction
function isLowEndDevice(): boolean {
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as any).deviceMemory ?? 4;
  return cores < 4 || mem < 4;
}

const AIAssistantFAB: React.FC<AIAssistantFABProps> = ({
  userRole,
  defaultContext = 'general',
  externalOpen,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const lowEnd = useMemo(() => isLowEndDevice(), []);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;

  const setOpen = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    const newVal = typeof val === 'function' ? val(open) : val;
    setInternalOpen(newVal);
    onOpenChange?.(newVal);
  }, [open, onOpenChange]);

  // Cmd+K / Ctrl+K keyboard shortcut
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen((prev: boolean) => !prev);
    }
    // Escape to close
    if (e.key === 'Escape' && open) {
      setOpen(false);
    }
  }, [open, setOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      {!open && (
        <>
          {/* Desktop: Cmd+K trigger bar with Swan logo */}
          <CmdKBar onClick={() => setOpen(true)} aria-label="Open AI Assistant (Ctrl+K)" style={lowEnd ? { animation: 'none' } : undefined}>
            <img src="/Logo.png" alt="" aria-hidden="true" />
            <span>AI Assistant...</span>
            <KbdStyle>
              <Command size={11} />K
            </KbdStyle>
          </CmdKBar>

          {/* Mobile/Tablet: Swan logo FAB — positioned above Windows taskbar */}
          <MobileFABWrapper>
            <FAB onClick={() => setOpen(true)} aria-label="Open AI Assistant" title="SwanStudios AI Assistant" style={lowEnd ? { animation: 'none', backdropFilter: 'none' } : undefined}>
              <img src="/Logo.png" alt="AI Assistant" />
            </FAB>
          </MobileFABWrapper>
        </>
      )}
      <Suspense fallback={null}>
        <AIAssistantDrawer
          open={open}
          onClose={() => setOpen(false)}
          userRole={userRole}
          defaultContext={defaultContext}
        />
      </Suspense>
    </>
  );
};

export default AIAssistantFAB;
