import styled, { keyframes } from 'styled-components';
import { Loader } from 'lucide-react';

const pulseRing = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.6;
  }

  100% {
    transform: scale(2.2);
    opacity: 0;
  }
`;

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

export const Overlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  background: color-mix(in srgb, var(--bg-base, #030712) 92%, transparent);
  backdrop-filter: blur(12px);
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  pointer-events: ${({ $isOpen }) => ($isOpen ? 'auto' : 'none')};
  transition: opacity 0.3s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const OrbContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const RecordingOrb = styled.button<{ $recording: boolean }>`
  width: 80px;
  height: 80px;
  min-width: 80px;
  min-height: 80px;
  border-radius: 50%;
  border: 0;
  background: ${({ $recording }) =>
    $recording
      ? 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0))'
      : 'var(--bg-elevated, #141419)'};
  color: var(--text-primary, #E0ECF4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  z-index: 1;
  transition: background 0.3s ease;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const PulseRing = styled.span`
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 2px solid var(--accent-primary, #60C0F0);
  animation: ${pulseRing} 1.5s ease-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0;
  }
`;

export const DurationText = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 24px;
  color: var(--text-primary, #E0ECF4);
`;

export const StatusText = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  text-align: center;
  max-width: 300px;
  min-height: 20px;
`;

export const ButtonRow = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 12px;
  flex-wrap: wrap;
  justify-content: center;
`;

export const ActionBtn = styled.button<{ $variant?: 'primary' | 'ghost' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  min-height: 48px;
  border-radius: 12px;
  border: ${({ $variant }) =>
    $variant === 'ghost'
      ? '1px solid var(--border-soft, rgba(96, 192, 240, 0.12))'
      : '0'};
  background: ${({ $variant }) =>
    $variant === 'ghost'
      ? 'transparent'
      : 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0))'};
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    opacity: 0.9;
  }

  &:active {
    transform: scale(0.97);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: opacity 0.2s ease;

    &:hover,
    &:active {
      transform: none;
    }
  }
`;

export const SpinIcon = styled(Loader)`
  animation: ${spin} 1s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
