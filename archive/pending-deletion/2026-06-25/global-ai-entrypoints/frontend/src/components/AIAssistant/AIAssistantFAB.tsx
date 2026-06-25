/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: AIAssistantFAB (Floating Action Button)          ║
 * ║  PURPOSE: Global AI entry point — FAB (mobile) + Cmd+K bar   ║
 * ║  OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-21         ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * Desktop (1024px+):
 * ┌──────────────────────────────────────────────────────┐
 * │                                    [⌘K AI Assistant] │ CmdKBar (fixed bottom-right)
 * └──────────────────────────────────────────────────────┘
 *
 * Mobile/Tablet (<1024px):
 * ┌──────────────────────────────────────────────────────┐
 * │                                           [🦢 FAB]   │ Swan logo (fixed bottom-right)
 * │                                           ↑ nebula   │ Breathing glow animation
 * └──────────────────────────────────────────────────────┘
 *
 * CLICK OUTCOMES:
 * FAB tap / Cmd+K → opens AIAssistantDrawer (lazy-loaded)
 * Escape → closes drawer
 *
 * DATA FLOW:
 * Props In:  { userRole, defaultContext?, onOpenChange? }
 * State:     { isOpen }
 * Children:  AIAssistantDrawer (lazy)
 *
 * ARCHITECTURE:
 * graph TD
 *   FAB[AIAssistantFAB] -->|lazy| Drawer[AIAssistantDrawer]
 *   FAB -->|Cmd+K| Drawer
 *   FAB -->|Escape| Close
 *
 * Gemini 3.1 Pro design specs:
 *   - "Nebula Glow" = breathing box-shadow using Wing Purple + Ice Wing
 *   - Idle: subtle float animation
 *   - Listening/Processing: pulsing nebula glow
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

  /* Mobile dashboards use in-context Swan Coach actions to avoid content overlap. */
  @media (max-width: 768px) {
    display: none;
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
  background: rgba(0, 32, 96, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(139, 92, 246, 0.4);
  border-radius: 14px;
  color: #E0ECF4;
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
  background: rgba(0, 48, 128, 0.9);
  border: 1px solid rgba(96, 192, 240, 0.5);
  border-radius: 6px;
  font-size: 12px;
  font-family: inherit;
  color: #FFFFFF;
  font-weight: 600;
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

  // Use ref for open state in keyboard handler to avoid listener churn
  const openRef = React.useRef(open);
  React.useEffect(() => { openRef.current = open; }, [open]);
  const onOpenChangeRef = React.useRef(onOpenChange);
  React.useEffect(() => { onOpenChangeRef.current = onOpenChange; }, [onOpenChange]);

  const setOpen = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    setInternalOpen(prev => {
      const newVal = typeof val === 'function' ? val(prev) : val;
      onOpenChangeRef.current?.(newVal);
      return newVal;
    });
  }, []);

  // Cmd+K / Ctrl+K keyboard shortcut (stable — no deps that change)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen((prev: boolean) => !prev);
    }
    // Escape to close
    if (e.key === 'Escape' && openRef.current) {
      setOpen(false);
    }
  }, [setOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      {!open && (
        <>
          {/* Desktop: Cmd+K trigger bar with Swan logo */}
          <CmdKBar onClick={() => setOpen(true)} aria-label="Open Swan Coach Assistant (Ctrl+K)" style={lowEnd ? { animation: 'none' } : undefined}>
            <img src="/Logo.png" alt="" aria-hidden="true" />
            <span>Swan Coach...</span>
            <KbdStyle>
              <Command size={11} />K
            </KbdStyle>
          </CmdKBar>

          {/* Mobile/Tablet: Swan logo FAB — positioned above Windows taskbar */}
          <MobileFABWrapper>
            <FAB onClick={() => setOpen(true)} aria-label="Open Swan Coach Assistant" title="Swan Coach Assistant" style={lowEnd ? { animation: 'none', backdropFilter: 'none' } : undefined}>
              <img src="/Logo.png" alt="Swan Coach Assistant" />
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

// ── Error Boundary wrapper (prevents AI crash from taking down app) ──
class AIAssistantErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[AIAssistant] Caught error:', error);
  }

  render() {
    if (this.state.hasError) {
      return null; // Silently hide — main app continues working
    }
    return this.props.children;
  }
}

const AIAssistantFABSafe: React.FC<AIAssistantFABProps> = (props) => (
  <AIAssistantErrorBoundary>
    <AIAssistantFAB {...props} />
  </AIAssistantErrorBoundary>
);

export default AIAssistantFABSafe;
