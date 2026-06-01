import styled, { css, keyframes } from 'styled-components';
import { CS, withAlpha } from './WorkoutLoggerCS';

export const VOICE_MEMO_ACCENT = CS.secondary;
export const VOICE_MEMO_MUTED_ICON = CS.textMuted;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const waveAnimation = keyframes`
  0%, 100% { height: 8px; }
  50% { height: 32px; }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

export const Container = styled.div<{ $uploading?: boolean }>`
  background: ${withAlpha(CS.text, 0.03)};
  border: 2px dashed ${withAlpha(VOICE_MEMO_ACCENT, 0.25)};
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  transition: all 0.3s;
  cursor: pointer;

  &:hover,
  &.drag-over {
    border-color: ${VOICE_MEMO_ACCENT};
    background: ${withAlpha(VOICE_MEMO_ACCENT, 0.04)};
  }

  ${({ $uploading }) =>
    $uploading &&
    css`
      background: linear-gradient(
        90deg,
        ${withAlpha(VOICE_MEMO_ACCENT, 0.02)} 25%,
        ${withAlpha(VOICE_MEMO_ACCENT, 0.08)} 50%,
        ${withAlpha(VOICE_MEMO_ACCENT, 0.02)} 75%
      );
      background-size: 200% 100%;
      animation: ${shimmer} 2s infinite linear;
      border-color: ${withAlpha(VOICE_MEMO_ACCENT, 0.4)};
      cursor: default;
    `}
`;

export const WaveContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  margin-bottom: 16px;
`;

export const WaveBar = styled.div<{ $delay: string }>`
  width: 4px;
  background: ${VOICE_MEMO_ACCENT};
  border-radius: 2px;
  animation: ${waveAnimation} 1.2s ease-in-out infinite;
  animation-delay: ${(p) => p.$delay};
  box-shadow: 0 0 8px ${VOICE_MEMO_ACCENT};
`;

export const DropLabel = styled.p`
  color: ${CS.textSecondary};
  font-size: 0.9rem;
  margin: 12px 0 4px;
`;

export const PulsingDropLabel = styled(DropLabel)`
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

export const SubLabel = styled.p`
  color: ${CS.textMuted};
  font-size: 0.78rem;
  margin: 0;
`;

export const HiddenInput = styled.input`
  display: none;
`;

export const StatusBar = styled.div<{ $variant: 'info' | 'success' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  margin-top: 16px;
  font-size: 0.85rem;
  color: ${(p) =>
    p.$variant === 'success'
      ? CS.successText
      : p.$variant === 'error'
        ? CS.errorText
        : CS.textMuted};
  background: ${(p) =>
    p.$variant === 'success'
      ? CS.successBg
      : p.$variant === 'error'
        ? CS.errorBg
        : CS.infoBg};
`;

export const ConfidenceBadge = styled.span<{ $level: 'high' | 'medium' | 'low' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${(p) =>
    p.$level === 'high'
      ? CS.successBg
      : p.$level === 'medium'
        ? CS.warningBg
        : CS.errorBg};
  color: ${(p) =>
    p.$level === 'high'
      ? CS.successText
      : p.$level === 'medium'
        ? CS.warningText
        : CS.errorText};
`;

export const PainFlagList = styled.div`
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const PainFlag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${CS.errorBg};
  color: ${CS.errorText};
`;

export const TranscriptBox = styled.details`
  margin-top: 16px;
  background: ${CS.inputBg};
  border: 1px solid ${CS.glassBorder};
  border-radius: 12px;
  overflow: hidden;

  summary {
    cursor: pointer;
    color: ${VOICE_MEMO_ACCENT};
    font-size: 0.85rem;
    font-weight: 600;
    padding: 12px 16px;
    user-select: none;
    background: ${withAlpha(VOICE_MEMO_ACCENT, 0.05)};
    transition: background 0.2s;

    &:hover {
      background: ${withAlpha(VOICE_MEMO_ACCENT, 0.1)};
    }
  }

  pre {
    margin: 0;
    padding: 16px;
    color: ${CS.text};
    font-size: 0.85rem;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 250px;
    overflow-y: auto;
    border-top: 1px solid ${CS.glassBorder};

    &::-webkit-scrollbar { width: 6px; }
    &::-webkit-scrollbar-track { background: ${withAlpha(CS.bgDeep, 0.2)}; }
    &::-webkit-scrollbar-thumb {
      background: ${withAlpha(VOICE_MEMO_ACCENT, 0.3)};
      border-radius: 3px;
    }
  }
`;

export const ActionRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 16px;
  justify-content: flex-end;
`;

export const ActionButton = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  min-height: 44px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  border: ${(p) => (p.$primary ? 'none' : `1px solid ${withAlpha(CS.text, 0.15)}`)};
  background: ${(p) =>
    p.$primary
      ? `linear-gradient(135deg, ${VOICE_MEMO_ACCENT}, ${CS.gaming})`
      : withAlpha(CS.text, 0.04)};
  color: ${(p) => (p.$primary ? CS.bgDeep : CS.text)};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    ${(p) => p.$primary && `box-shadow: 0 6px 24px ${withAlpha(VOICE_MEMO_ACCENT, 0.4)};`}
  }

  &:focus-visible {
    outline: 2px solid ${CS.glow};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
