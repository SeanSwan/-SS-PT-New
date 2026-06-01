import styled, { keyframes } from 'styled-components';

export const PanelWrapper = styled.div`
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 12px;
  background: rgba(0, 20, 60, 0.6);
  backdrop-filter: blur(12px);
  overflow: hidden;
  margin-bottom: 16px;
`;

export const PanelHeader = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 16px;
  min-height: 48px;
  border: none;
  background: rgba(0, 32, 96, 0.5);
  color: #e0ecf4;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(0, 32, 96, 0.7);
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
  background: linear-gradient(135deg, #8b5cf6 0%, #60c0f0 100%);
  color: #002060;
`;

export const HeaderTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #f0f0ff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const HeaderToggle = styled.div`
  color: rgba(255, 255, 255, 0.5);
`;

export const PanelBody = styled.div`
  display: flex;
  flex-direction: column;
  max-height: 400px;
`;

export const MessagesArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 120px;
  max-height: 300px;
`;

export const EmptyHint = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
  padding: 24px 16px;
  color: rgba(255, 255, 255, 0.4);

  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    max-width: 320px;
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
  background: rgba(139, 92, 246, 0.15);
  color: #8b5cf6;
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
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  background: ${(p) =>
    p.$role === 'user'
      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(96, 192, 240, 0.2))'
      : 'rgba(255, 255, 255, 0.06)'};
  color: ${(p) => (p.$role === 'user' ? '#f0f0ff' : '#cbd5e1')};
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
    background: #8b5cf6;
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
  background: rgba(153, 27, 27, 0.3);
  border-top: 1px solid rgba(248, 113, 113, 0.35);
  color: #fca5a5;
  font-size: 12px;

  button {
    min-width: 44px;
    min-height: 44px;
    background: none;
    border: none;
    color: #fca5a5;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

export const InputArea = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
`;

export const ChatInput = styled.textarea`
  flex: 1;
  padding: 10px 12px;
  min-height: 44px;
  max-height: 100px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(0, 32, 96, 0.4);
  color: #f0f0ff;
  font-size: 16px;
  font-family: inherit;
  resize: none;

  @media (min-width: 1280px) {
    font-size: 13px;
  }

  &:focus {
    outline: none;
    border-color: rgba(96, 192, 240, 0.4);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

export const SendButton = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #8b5cf6 0%, #60c0f0 100%);
  color: #002060;
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
`;

export const TtsToggle = styled.button<{ $active: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: none;
  background: ${({ $active }) =>
    $active ? 'rgba(34, 197, 94, 0.15)' : 'transparent'};
  color: ${({ $active }) =>
    $active ? '#22C55E' : 'rgba(255, 255, 255, 0.4)'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;

  &:hover {
    background: ${({ $active }) =>
      $active ? 'rgba(34, 197, 94, 0.25)' : 'rgba(255, 255, 255, 0.08)'};
    color: ${({ $active }) =>
      $active ? '#22C55E' : 'rgba(255, 255, 255, 0.6)'};
  }
`;

export const CompactTrigger = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  min-height: 44px;
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 8px;
  background: rgba(0, 32, 96, 0.3);
  color: #60c0f0;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;

  &:hover {
    background: rgba(0, 32, 96, 0.5);
  }
`;
