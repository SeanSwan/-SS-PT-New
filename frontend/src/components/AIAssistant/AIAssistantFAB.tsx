/**
 * AIAssistantFAB (Floating Action Button)
 * ========================================
 * Renders the AI assistant trigger button + drawer.
 * Drop this into any dashboard — it manages its own state.
 *
 * Usage:
 *   <AIAssistantFAB userRole="client" />
 *   <AIAssistantFAB userRole="trainer" defaultContext="workout_generation" />
 */
import React, { useState, lazy, Suspense } from 'react';
import styled, { keyframes } from 'styled-components';
import { Sparkles } from 'lucide-react';
import type { AIContext } from '../../hooks/useAIChat';

const AIAssistantDrawer = lazy(() => import('./AIAssistantDrawer'));

const breathe = keyframes`
  0%, 100% { box-shadow: 0 4px 18px rgba(0, 255, 255, 0.35); }
  50% { box-shadow: 0 4px 28px rgba(0, 255, 255, 0.55), 0 0 48px rgba(0, 255, 255, 0.15); }
`;

const FAB = styled.button`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1300;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid rgba(0, 255, 255, 0.4);
  background: linear-gradient(135deg, #00FFFF, #00aadd);
  color: #0a0a1a;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  animation: ${breathe} 3s ease-in-out infinite;

  &:hover {
    transform: scale(1.08);
    box-shadow: 0 6px 32px rgba(0, 255, 255, 0.6);
  }

  &:active {
    transform: scale(0.95);
  }

  @media (max-width: 768px) {
    bottom: 16px;
    right: 16px;
    width: 52px;
    height: 52px;
  }
`;

interface AIAssistantFABProps {
  userRole: 'client' | 'trainer' | 'admin';
  defaultContext?: AIContext;
}

const AIAssistantFAB: React.FC<AIAssistantFABProps> = ({ userRole, defaultContext = 'general' }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {!open && (
        <FAB onClick={() => setOpen(true)} aria-label="Open AI Assistant" title="AI Assistant">
          <Sparkles size={24} />
        </FAB>
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
