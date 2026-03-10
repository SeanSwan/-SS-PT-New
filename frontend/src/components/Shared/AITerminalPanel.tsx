/**
 * AITerminalPanel — Inline AI Chat for Workout Builders
 * ======================================================
 * Embeddable AI chat panel that uses useAIChat hook with
 * context-aware props. Designed for Workout Logger, Bootcamp
 * Builder, and Long Horizon Builder.
 *
 * Galaxy-Swan theme: Midnight Sapphire, Swan Cyan, 44px touch targets.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { Bot, ChevronDown, ChevronUp, Send, Sparkles, X } from 'lucide-react';
import { useAIChat } from '../../hooks/useAIChat';

// ── Types ─────────────────────────────────────────────────────────────

type AIContext =
  | 'general'
  | 'macro_logging'
  | 'form_tips'
  | 'workout_suggestions'
  | 'workout_generation'
  | 'client_review'
  | 'data_management';

export interface AITerminalPanelProps {
  context?: AIContext;
  clientId?: number;
  equipmentProfileId?: number | null;
  placeholder?: string;
  compact?: boolean;
  defaultOpen?: boolean;
  onExerciseSelected?: (exercise: any) => void;
  onWorkoutGenerated?: (workout: any) => void;
}

// ── Component ─────────────────────────────────────────────────────────

const AITerminalPanel: React.FC<AITerminalPanelProps> = ({
  context = 'workout_generation',
  clientId,
  equipmentProfileId,
  placeholder = 'Ask Swan AI to help build your workout...',
  compact = false,
  defaultOpen = false,
  onExerciseSelected,
  onWorkoutGenerated,
}) => {
  const {
    messages,
    activeConversation,
    sending,
    error,
    createConversation,
    sendMessage,
    clearError,
  } = useAIChat();

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationStartedRef = useRef(false);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Create conversation when panel opens — pass clientId as targetUserId for AI enrichment
  useEffect(() => {
    if (isOpen && !activeConversation && !conversationStartedRef.current) {
      conversationStartedRef.current = true;
      createConversation(context, `Workout Builder — ${context}`, clientId || null);
    }
  }, [isOpen, activeConversation, context, createConversation, clientId]);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || sending) return;

    // Inject context into the message
    let enrichedMessage = text;
    if (clientId) {
      enrichedMessage += `\n[Context: clientId=${clientId}]`;
    }
    if (equipmentProfileId) {
      enrichedMessage += `\n[Context: equipmentProfileId=${equipmentProfileId}]`;
    }

    setInputValue('');
    await sendMessage(enrichedMessage);
  }, [inputValue, sending, clientId, equipmentProfileId, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  if (compact) {
    return (
      <CompactTrigger onClick={() => setIsOpen(!isOpen)} type="button">
        <Bot size={16} />
        <span>AI Assistant</span>
        {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </CompactTrigger>
    );
  }

  return (
    <PanelWrapper>
      <PanelHeader onClick={() => setIsOpen(!isOpen)}>
        <HeaderLeft>
          <AiBadge>
            <Sparkles size={14} />
          </AiBadge>
          <HeaderTitle>Swan AI Assistant</HeaderTitle>
        </HeaderLeft>
        <HeaderToggle>
          {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </HeaderToggle>
      </PanelHeader>

      {isOpen && (
        <PanelBody>
          <MessagesArea>
            {messages.length === 0 && (
              <EmptyHint>
                <Bot size={24} />
                <p>
                  Ask me to generate exercises, suggest modifications, or build
                  a complete workout plan based on your client&apos;s profile and
                  available equipment.
                </p>
              </EmptyHint>
            )}
            {messages.map((msg, i) => (
              <MessageBubble key={i} $role={msg.role}>
                {msg.role === 'assistant' && (
                  <BubbleIcon>
                    <Bot size={14} />
                  </BubbleIcon>
                )}
                <BubbleContent $role={msg.role}>
                  {msg.content}
                </BubbleContent>
              </MessageBubble>
            ))}
            {sending && (
              <MessageBubble $role="assistant">
                <BubbleIcon>
                  <Bot size={14} />
                </BubbleIcon>
                <BubbleContent $role="assistant">
                  <TypingDots>
                    <span />
                    <span />
                    <span />
                  </TypingDots>
                </BubbleContent>
              </MessageBubble>
            )}
            <div ref={messagesEndRef} />
          </MessagesArea>

          {error && (
            <ErrorBar>
              <span>{error}</span>
              <button onClick={clearError}>
                <X size={14} />
              </button>
            </ErrorBar>
          )}

          <InputArea>
            <ChatInput
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              disabled={sending}
            />
            <SendButton
              onClick={handleSend}
              disabled={!inputValue.trim() || sending}
              type="button"
            >
              <Send size={16} />
            </SendButton>
          </InputArea>
        </PanelBody>
      )}
    </PanelWrapper>
  );
};

export default AITerminalPanel;

// ── Styled Components ─────────────────────────────────────────────────

const PanelWrapper = styled.div`
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 12px;
  background: rgba(0, 20, 60, 0.6);
  backdrop-filter: blur(12px);
  overflow: hidden;
  margin-bottom: 16px;
`;

const PanelHeader = styled.button`
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

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const AiBadge = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #8b5cf6 0%, #60c0f0 100%);
  color: #002060;
`;

const HeaderTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #f0f0ff;
`;

const HeaderToggle = styled.div`
  color: rgba(255, 255, 255, 0.5);
`;

const PanelBody = styled.div`
  display: flex;
  flex-direction: column;
  max-height: 400px;
`;

const MessagesArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 120px;
  max-height: 300px;
`;

const EmptyHint = styled.div`
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

const MessageBubble = styled.div<{ $role: string }>`
  display: flex;
  gap: 8px;
  align-items: flex-start;
  justify-content: ${(p) => (p.$role === 'user' ? 'flex-end' : 'flex-start')};
`;

const BubbleIcon = styled.div`
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

const BubbleContent = styled.div<{ $role: string }>`
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

const TypingDots = styled.div`
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

const ErrorBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: rgba(255, 71, 87, 0.1);
  border-top: 1px solid rgba(255, 71, 87, 0.2);
  color: #ff6b6b;
  font-size: 12px;

  button {
    background: none;
    border: none;
    color: #ff6b6b;
    cursor: pointer;
    padding: 2px;
  }
`;

const InputArea = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
`;

const ChatInput = styled.textarea`
  flex: 1;
  padding: 10px 12px;
  min-height: 44px;
  max-height: 100px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(0, 32, 96, 0.4);
  color: #f0f0ff;
  font-size: 13px;
  font-family: inherit;
  resize: none;

  &:focus {
    outline: none;
    border-color: rgba(96, 192, 240, 0.4);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const SendButton = styled.button`
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

const CompactTrigger = styled.button`
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
