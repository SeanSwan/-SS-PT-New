import styled, { keyframes } from 'styled-components';

export const PanelWrapper = styled.div`
  border: 1px solid var(--ai-terminal-panel-border, rgba(96, 192, 240, 0.15));
  border-radius: 12px;
  background: var(--ai-terminal-panel-bg, rgba(0, 20, 60, 0.78));
  backdrop-filter: blur(12px);
  overflow: hidden;
  margin-bottom: 16px;
`;

export const PanelHeader = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px 18px;
  min-height: 48px;
  border: none;
  background: var(--ai-terminal-header-bg, rgba(0, 32, 96, 0.5));
  color: var(--ai-terminal-header-text, #e0ecf4);
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: var(--ai-terminal-header-bg-hover, rgba(0, 32, 96, 0.7));
  }

  &:focus-visible {
    outline: 2px solid var(--ai-terminal-focus-ring, #8b5cf6);
    outline-offset: -2px;
  }
`;

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  overflow: hidden;
`;

export const AiBadge = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--ai-terminal-badge-bg-a, #8b5cf6) 0%, var(--ai-terminal-badge-bg-b, #60c0f0) 100%);
  color: var(--ai-terminal-badge-text, #002060);
`;

export const HeaderTitle = styled.span`
  font-size: 16px;
  font-weight: 800;
  color: var(--ai-terminal-title-text, #f0f0ff);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const HeaderToggle = styled.div`
  color: var(--ai-terminal-toggle-text, #cbd5e1);
`;

export const PanelBody = styled.div`
  display: flex;
  flex-direction: column;
  min-height: clamp(360px, 42vh, 560px);
  max-height: clamp(440px, 56vh, 680px);
`;

export const MessagesArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 220px;
  max-height: clamp(260px, 40vh, 500px);
`;

export const EmptyHint = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
  padding: 24px 16px;
  color: var(--ai-terminal-empty-text, #cbd5e1);

  p {
    margin: 0;
    font-size: 15px;
    line-height: 1.5;
    max-width: 420px;
  }
`;

export const MessageBubble = styled.div<{ $role: string }>`
  display: flex;
  gap: 8px;
  align-items: flex-start;
  justify-content: ${(p) => (p.$role === 'user' ? 'flex-end' : 'flex-start')};
`;

export const BubbleIcon = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--ai-terminal-bubble-icon-bg, rgba(139, 92, 246, 0.15));
  color: var(--ai-terminal-bubble-icon-text, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
`;

export const BubbleContent = styled.div<{ $role: string }>`
  max-width: 80%;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  background: ${(p) =>
    p.$role === 'user'
      ? 'linear-gradient(135deg, var(--ai-terminal-user-bubble-bg-a, rgba(139, 92, 246, 0.3)), var(--ai-terminal-user-bubble-bg-b, rgba(96, 192, 240, 0.2)))'
      : 'var(--ai-terminal-assistant-bubble-bg, rgba(255, 255, 255, 0.06))'};
  color: ${(p) => (p.$role === 'user' ? 'var(--ai-terminal-user-bubble-text, #f0f0ff)' : 'var(--ai-terminal-assistant-bubble-text, #cbd5e1)')};
`;

const typingBounce = keyframes`
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-4px); }
`;

export const TypingDots = styled.div`
  display: flex;
  gap: 4px;
  padding: 4px 0;

  span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--ai-terminal-typing-dot, #8b5cf6);
    animation: ${typingBounce} 1.2s ease-in-out infinite;

    &:nth-child(2) {
      animation-delay: 0.15s;
    }
    &:nth-child(3) {
      animation-delay: 0.3s;
    }
  }
`;

export const ErrorBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: var(--ai-terminal-error-bg, rgba(153, 27, 27, 0.3));
  border-top: 1px solid var(--ai-terminal-error-border, rgba(248, 113, 113, 0.35));
  color: var(--ai-terminal-error-text, #fca5a5);
  font-size: 12px;

  button {
    min-width: 44px;
    min-height: 44px;
    background: none;
    border: none;
    color: var(--ai-terminal-error-text, #fca5a5);
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

export const InputArea = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid var(--ai-terminal-input-border-top, rgba(255, 255, 255, 0.06));
  min-width: 0;

  @media (max-width: 430px) { flex-wrap: wrap; }
`;

export const ChatInput = styled.textarea`
  flex: 1;
  min-width: min(100%, 14rem);
  padding: 12px 14px;
  min-height: 48px;
  max-height: 132px;
  border: 1px solid var(--ai-terminal-input-border, rgba(96, 192, 240, 0.25));
  border-radius: 12px;
  background: var(--ai-terminal-input-bg, rgba(0, 32, 96, 0.62));
  color: var(--ai-terminal-input-text, #f8fbff);
  font-size: 16px;
  line-height: 1.4;
  font-family: inherit;
  resize: none;

  @media (min-width: 1280px) {
    font-size: 15px;
  }

  &:focus {
    outline: none;
    border-color: var(--ai-terminal-input-border-focus, rgba(96, 192, 240, 0.4));
  }

  &::placeholder {
    color: var(--ai-terminal-input-placeholder, rgba(255, 255, 255, 0.5));
  }

  @media (max-width: 430px) { flex-basis: 100%; order: -1; }
`;

export const SendButton = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, var(--ai-terminal-send-bg-a, #8b5cf6) 0%, var(--ai-terminal-send-bg-b, #60c0f0) 100%);
  color: var(--ai-terminal-send-text, #002060);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: opacity 0.15s;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:not(:disabled):hover {
    opacity: 0.85;
  }

  &:focus-visible { outline: 2px solid var(--ai-terminal-focus-ring, #8b5cf6); outline-offset: 2px; }
`;

export const TtsToggle = styled.button<{ $active: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: none;
  background: ${({ $active }) =>
    $active ? 'var(--ai-terminal-tts-active-bg, rgba(34, 197, 94, 0.15))' : 'transparent'};
  color: ${({ $active }) =>
    $active ? 'var(--ai-terminal-tts-active-text, #22C55E)' : 'var(--ai-terminal-tts-text, #cbd5e1)'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;

  &:hover {
    background: ${({ $active }) =>
      $active ? 'var(--ai-terminal-tts-active-bg-hover, rgba(34, 197, 94, 0.25))' : 'var(--ai-terminal-tts-bg-hover, rgba(255, 255, 255, 0.08))'};
    color: ${({ $active }) =>
      $active ? 'var(--ai-terminal-tts-active-text, #22C55E)' : 'var(--ai-terminal-tts-text-hover, rgba(255, 255, 255, 0.6))'};
  }
  &:focus-visible { outline: 2px solid var(--ai-terminal-focus-ring, #8b5cf6); outline-offset: 2px; }
`;
export const CompactTrigger = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  min-height: 44px;
  border: 1px solid var(--ai-terminal-compact-border, rgba(96, 192, 240, 0.2));
  border-radius: 8px;
  background: var(--ai-terminal-compact-bg, rgba(0, 32, 96, 0.3));
  color: var(--ai-terminal-compact-text, #60c0f0);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;

  &:hover {
    background: var(--ai-terminal-compact-bg-hover, rgba(0, 32, 96, 0.5));
  }

  &:focus-visible { outline: 2px solid var(--ai-terminal-focus-ring, #8b5cf6); outline-offset: 2px; }
`;
