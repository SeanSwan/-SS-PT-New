/**
 * AIAssistantFAB (Floating Action Button)
 * ========================================
 * Renders the AI assistant trigger button + drawer.
 * Drop this into any dashboard — it manages its own state.
 *
 * Gemini 3.1 Pro design specs:
 *   - Desktop (1024px+): Cmd+K / Ctrl+K keyboard shortcut
 *   - Mobile: 64x64 FAB with Nebula Glow breathing animation
 *   - "Nebula Glow" = breathing box-shadow using Swan Cyan + Cosmic Purple
 *   - Idle: subtle float animation
 *   - Listening/Processing: pulsing nebula glow
 *
 * Usage:
 *   <AIAssistantFAB userRole="client" />
 *   <AIAssistantFAB userRole="trainer" defaultContext="workout_generation" />
 */
import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Sparkles, Command } from 'lucide-react';
import type { AIContext } from '../../hooks/useAIChat';

const AIAssistantDrawer = lazy(() => import('./AIAssistantDrawer'));

// ── Nebula Glow Animation (Gemini 3.1 Pro spec) ──
const nebulaGlow = keyframes`
  0%, 100% {
    box-shadow: 0 4px 18px rgba(0, 255, 255, 0.35),
                0 0 24px rgba(120, 81, 169, 0.15);
  }
  50% {
    box-shadow: 0 4px 28px rgba(0, 255, 255, 0.55),
                0 0 48px rgba(120, 81, 169, 0.3),
                0 0 64px rgba(0, 255, 255, 0.1);
  }
`;

// ── Subtle float animation (idle state) ──
const floatIdle = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`;

const FAB = styled.button`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1250;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 2px solid rgba(0, 255, 255, 0.4);
  background: linear-gradient(135deg, #00FFFF 0%, #7851A9 100%);
  color: #0a0a1a;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
  animation: ${nebulaGlow} 3s ease-in-out infinite,
             ${floatIdle} 2s ease-in-out infinite;

  &:hover {
    transform: scale(1.08);
    box-shadow: 0 6px 32px rgba(0, 255, 255, 0.6),
                0 0 40px rgba(120, 81, 169, 0.35);
  }

  &:active {
    transform: scale(0.95);
  }

  @media (max-width: 768px) {
    bottom: 16px;
    right: 16px;
    width: 56px;
    height: 56px;
  }
`;

// ── Desktop Cmd+K Trigger Bar ──
const CmdKBar = styled.button`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1250;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: rgba(10, 10, 26, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 14px;
  color: rgba(224, 236, 244, 0.6);
  cursor: pointer;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
  animation: ${nebulaGlow} 4s ease-in-out infinite;

  &:hover {
    border-color: rgba(0, 255, 255, 0.5);
    color: rgba(224, 236, 244, 0.9);
    background: rgba(10, 10, 26, 0.8);
  }

  @media (max-width: 1023px) {
    display: none;
  }
`;

const KbdStyle = styled.kbd`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 7px;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.25);
  border-radius: 6px;
  font-size: 12px;
  font-family: inherit;
  color: #00FFFF;
  line-height: 1;
`;

const SparkleIcon = styled(Sparkles)`
  color: #00FFFF;
  flex-shrink: 0;
`;

// ── Mobile-only wrapper ──
const MobileFABWrapper = styled.div`
  @media (min-width: 1024px) {
    display: none;
  }
`;

interface AIAssistantFABProps {
  userRole: 'client' | 'trainer' | 'admin';
  defaultContext?: AIContext;
}

const AIAssistantFAB: React.FC<AIAssistantFABProps> = ({ userRole, defaultContext = 'general' }) => {
  const [open, setOpen] = useState(false);

  // Cmd+K / Ctrl+K keyboard shortcut
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen(prev => !prev);
    }
    // Escape to close
    if (e.key === 'Escape' && open) {
      setOpen(false);
    }
  }, [open]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      {!open && (
        <>
          {/* Desktop: Cmd+K trigger bar */}
          <CmdKBar onClick={() => setOpen(true)} aria-label="Open AI Assistant (Ctrl+K)">
            <SparkleIcon size={18} />
            <span>Ask Swan AI...</span>
            <KbdStyle>
              <Command size={11} />K
            </KbdStyle>
          </CmdKBar>

          {/* Mobile: Nebula Glow FAB */}
          <MobileFABWrapper>
            <FAB onClick={() => setOpen(true)} aria-label="Open AI Assistant" title="AI Assistant">
              <Sparkles size={26} />
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
