/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: AITerminalPanel                                   ║
 * ║  PURPOSE: Embeddable AI chat for ALL dashboard tabs           ║
 * ║  OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-21         ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌──────────────────────────────────────────────────────┐
 * │ [🤖 SwanStudios AI] [context badge]    [▲/▼] [✕]   │ PanelHeader (collapsible)
 * ├──────────────────────────────────────────────────────┤
 * │ ┌── Messages Area (scrollable) ──────────────────┐  │
 * │ │ 🤖 AI: Welcome! How can I help with [context]? │  │
 * │ │ 👤 User: Generate a workout for Jackie         │  │
 * │ │ 🤖 AI: Here's a Phase 2 workout...             │  │
 * │ │ ... (auto-scroll, smart near-bottom detection)  │  │
 * │ └────────────────────────────────────────────────┘  │
 * │ [Error bar] ← on API error (CS.errorText tokens)   │
 * │ [Type a message...                          ] [➤]   │ InputArea
 * └──────────────────────────────────────────────────────┘
 *
 * EMBEDS IN (auto-context per tab):
 * | Dashboard Tab      | AI Context          | Route                    |
 * |-------------------|---------------------|--------------------------|
 * | Overview          | general             | /dashboard/default       |
 * | Schedule          | scheduling          | /dashboard/schedule      |
 * | Training Sessions | workout_generation  | /dashboard/admin-sessions|
 * | Client Progress   | progress_analysis   | /dashboard/client-progress|
 * | Client Management | client_review       | /dashboard/client-management|
 * | NASM Exercises    | exercise_library    | /dashboard/nasm-exercises|
 * | Reports           | data_analysis       | /dashboard/reports       |
 *
 * CLICK OUTCOMES:
 * Header chevron → toggle panel collapse/expand
 * Close (✕) → hide panel entirely
 * Send (➤) → send message via useAIChat
 * Error retry → clear error + retry last message
 *
 * DATA FLOW:
 * Props In:  { context, title?, clientId?, onClose? }
 * State:     { collapsed, inputText }
 * Hook:      useAIChat (conversations, messages, send, create)
 * Events:    CustomEvent('ai-workout-generated') for WorkoutLogger integration
 *
 * ARCHITECTURE:
 * graph TD
 *   Tab[Dashboard Tab] --> Panel[AITerminalPanel]
 *   Panel --> Hook[useAIChat]
 *   Hook --> API[/api/ai-chat/*]
 *   Panel -->|CustomEvent| Logger[WorkoutLogger]
 *
 * NOTE: 453 lines — exceeds 300-line rule. TODO: extract styled
 * components to AITerminalPanelStyles.ts, types to shared AITypes.ts
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { Bot, ChevronDown, ChevronUp, Send, Sparkles, X } from 'lucide-react';
import { useAIChat } from '../../hooks/useAIChat';

// ── Types ─────────────────────────────────────────────────────────────

export type AIContext =
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
  label?: string;
  emptyHint?: string;
  compact?: boolean;
  defaultOpen?: boolean;
  onExerciseSelected?: (exercise: any) => void;
  onWorkoutGenerated?: (workout: any) => void;
}

// ── Component ─────────────────────────────────────────────────────────

const CONTEXT_LABELS: Record<string, string> = {
  general: 'AI Assistant',
  macro_logging: 'Nutrition Assistant',
  form_tips: 'Form Coach',
  workout_suggestions: 'Workout Assistant',
  workout_generation: 'Workout Builder',
  client_review: "Coach's Assistant",
  data_management: 'Data Assistant',
  scheduling: 'Schedule Assistant',
  progress_analysis: 'Progress Analyst',
  exercise_library: 'Exercise Expert',
  gamification: 'Gamification Coach',
};

const AITerminalPanel: React.FC<AITerminalPanelProps> = ({
  context = 'workout_generation',
  clientId,
  equipmentProfileId,
  placeholder,
  label,
  emptyHint,
  compact = false,
  defaultOpen = false,
  onExerciseSelected,
  onWorkoutGenerated,
}) => {
  const {
    messages,
    sending,
    error,
    sendMessageWithConversation,
    clearError,
  } = useAIChat();

  const displayLabel = label || CONTEXT_LABELS[context] || 'AI Assistant';
  const displayPlaceholder = placeholder || `Ask ${displayLabel} anything...`;
  const displayHint = emptyHint || `I'm your ${displayLabel}. Ask me anything about ${context === 'general' ? 'this workspace' : context.replace(/_/g, ' ')}.`;

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    // Atomic: creates conversation if needed + sends message in one call
    await sendMessageWithConversation(enrichedMessage, context, `${displayLabel} — ${context}`, clientId || null);
  }, [inputValue, sending, clientId, equipmentProfileId, context, displayLabel, sendMessageWithConversation]);

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
        <span>{displayLabel}</span>
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
          <HeaderTitle>SwanStudios {displayLabel}</HeaderTitle>
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
                <p>{displayHint}</p>
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
              placeholder={displayPlaceholder}
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
  background: rgba(153, 27, 27, 0.3);
  border-top: 1px solid rgba(248, 113, 113, 0.35);
  color: #fca5a5;
  font-size: 12px;

  button {
    background: none;
    border: none;
    color: #fca5a5;
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
