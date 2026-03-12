/**
 * CrystalNode — Diamond-shaped kinematic joint for AI Form Analysis
 * Rotated 45° for crystalline diamond shape (not circles — per Gemini 3.1 Pro)
 * Ice Wing glow when perfect · Wing Purple glow when adjustment needed
 */
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(96, 192, 240, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(96, 192, 240, 0); }
  100% { box-shadow: 0 0 0 0 rgba(96, 192, 240, 0); }
`;

export const CrystalNode = styled(motion.div)<{ $status: 'perfect' | 'adjust' }>`
  width: 12px;
  height: 12px;
  background: ${({ $status }) =>
    $status === 'perfect' ? '#E0ECF4' : '#C6A84B'}; /* Frost White / Gilded Fern */
  border: 2px solid ${({ $status }) =>
    $status === 'perfect' ? '#60C0F0' : '#8B5CF6'}; /* Ice Wing / Wing Purple */
  transform: rotate(45deg);
  box-shadow: 0 0 12px ${({ $status }) =>
    $status === 'perfect' ? '#60C0F0' : '#8B5CF6'};
  animation: ${pulseGlow} 2s infinite;
  position: absolute;
  z-index: 10;
  pointer-events: none;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
