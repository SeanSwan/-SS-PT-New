/**
 * CelebrationToggles — Sound & Retro Mode controls
 * ===================================================
 * Floating toggle buttons for Sound (muted by default) and Retro Mode.
 * 44px minimum touch targets per spec.
 * Positioned in bottom-left to avoid conflict with FABs.
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Volume2, VolumeX, Gamepad2 } from 'lucide-react';
import { useCelebration } from '../../context/CelebrationContext';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const TogglesWrapper = styled.div`
  position: fixed;
  bottom: 16px;
  left: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 100;
  animation: ${fadeIn} 0.3s ease-out;

  @media (max-width: 768px) {
    bottom: 80px; /* Above mobile nav */
  }
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1.5px solid ${p => (p.$active ? '#8B5CF6' : 'rgba(224, 236, 244, 0.2)')};
  background: ${p =>
    p.$active ? 'rgba(139, 92, 246, 0.2)' : 'rgba(0, 32, 96, 0.6)'};
  backdrop-filter: blur(8px);
  color: ${p => (p.$active ? '#8B5CF6' : '#E0ECF4')};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.3);
    border-color: #8B5CF6;
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.3);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }
`;

const CelebrationToggles: React.FC = () => {
  const { soundMuted, setSoundMuted, retroMode, setRetroMode } = useCelebration();

  return (
    <TogglesWrapper>
      <ToggleButton
        $active={!soundMuted}
        onClick={() => setSoundMuted(!soundMuted)}
        title={soundMuted ? 'Enable sounds' : 'Mute sounds'}
        aria-label={soundMuted ? 'Enable celebration sounds' : 'Mute celebration sounds'}
      >
        {soundMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </ToggleButton>

      <ToggleButton
        $active={retroMode}
        onClick={() => setRetroMode(!retroMode)}
        title={retroMode ? 'Disable retro mode' : 'Enable retro mode'}
        aria-label={retroMode ? 'Disable retro arcade mode' : 'Enable retro arcade mode'}
      >
        <Gamepad2 size={20} />
      </ToggleButton>
    </TogglesWrapper>
  );
};

export default CelebrationToggles;
