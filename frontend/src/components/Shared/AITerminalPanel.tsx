/**
 * AITerminalPanel
 *
 * Shared Swan Coach terminal for active dashboard and workout surfaces.
 * Chat traffic flows through useAIChat -> /api/ai-chat/*.
 * Canonical admin client hub: /dashboard/admin/client-management.
 */
import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { Bot, ChevronDown, ChevronUp, Send, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import { useAIChat } from '../../hooks/useAIChat';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import MarkdownRenderer from '../DashBoard/Pages/coach-assistant/MarkdownRenderer';
import { CONTEXT_LABELS, DEEP_RESEARCH_LABEL, toDeepResearchLabel } from './AITerminalPanel.logic';
import {
  AiBadge,
  BubbleContent,
  BubbleIcon,
  ChatInput,
  CompactTrigger,
  EmptyHint,
  ErrorBar,
  HeaderLeft,
  HeaderTitle,
  HeaderToggle,
  InputArea,
  MessageBubble,
  MessagesArea,
  PanelBody,
  PanelHeader,
  PanelWrapper,
  SendButton,
  TtsToggle,
  TypingDots,
} from './AITerminalPanel.styles';
import type { AITerminalPanelProps } from './AITerminalPanel.types';

export type { AIContext, AITerminalPanelProps } from './AITerminalPanel.types';

const CrystallineVoicePill = lazy(() => import('./CrystallineVoicePill'));

const AITerminalPanel: React.FC<AITerminalPanelProps> = ({
  context = 'workout_generation',
  clientId,
  equipmentProfileId,
  placeholder,
  label,
  emptyHint,
  compact = false,
  defaultOpen = false,
}) => {
  const {
    messages,
    sending,
    error,
    sendMessageWithConversation,
    clearError,
  } = useAIChat();

  const displayLabel = toDeepResearchLabel(label) || CONTEXT_LABELS[context] || DEEP_RESEARCH_LABEL;
  const displayPlaceholder = placeholder || `Ask ${displayLabel} anything...`;
  const displayHint = emptyHint
    || `I'm your ${displayLabel}. Ask me anything about ${
      context === 'general' ? 'this workspace' : context.replace(/_/g, ' ')
    }.`;

  const tts = useTextToSpeech({ rate: 1.05, volume: 0.9 });
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prevMessageCountRef = useRef(messages.length);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      const latest = messages[messages.length - 1];
      if (latest?.role === 'assistant' && tts.enabled) {
        tts.speak(latest.content);
      }
    }
    prevMessageCountRef.current = messages.length;

    return () => {
      if (tts.speaking) tts.stop();
    };
  }, [messages, tts]);

  const buildRequestContext = useCallback(() => {
    if (!equipmentProfileId || equipmentProfileId <= 0) return null;
    return { equipmentProfileId };
  }, [equipmentProfileId]);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || sending) return;

    setInputValue('');
    const requestContext = buildRequestContext();
    if (requestContext) {
      await sendMessageWithConversation(
        text,
        context,
        `${displayLabel} â€” ${context}`,
        clientId || null,
        'both',
        null,
        requestContext,
      );
      return;
    }

    await sendMessageWithConversation(
      text,
      context,
      `${displayLabel} — ${context}`,
      clientId || null,
    );
  }, [buildRequestContext, clientId, context, displayLabel, inputValue, sendMessageWithConversation, sending]);

  const handleVoiceAutoSend = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const requestContext = buildRequestContext();
    if (requestContext) {
      await sendMessageWithConversation(
        trimmed,
        context,
        `${displayLabel} â€” ${context}`,
        clientId || null,
        'both',
        null,
        requestContext,
      );
      return;
    }

    await sendMessageWithConversation(
      trimmed,
      context,
      `${displayLabel} — ${context}`,
      clientId || null,
    );
  }, [buildRequestContext, clientId, context, displayLabel, sendMessageWithConversation, sending]);

  const handleVoiceTranscript = useCallback((text: string) => {
    setInputValue((prev) => (prev ? `${prev} ${text}` : text));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

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
                  {msg.role === 'assistant' ? <MarkdownRenderer content={msg.content} /> : msg.content}
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
            <Suspense fallback={null}>
              <CrystallineVoicePill
                onTranscript={handleVoiceTranscript}
                onAutoSend={handleVoiceAutoSend}
                isSpeaking={tts.speaking}
                isProcessing={sending}
                onStopSpeaking={tts.stop}
                compact
              />
            </Suspense>

            <ChatInput
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={displayPlaceholder}
              rows={1}
              disabled={sending}
            />

            {tts.supported && (
              <TtsToggle
                type="button"
                onClick={tts.toggleEnabled}
                $active={tts.enabled}
                aria-label={tts.enabled ? 'Disable voice readback' : 'Enable voice readback'}
                title={tts.enabled ? 'Voice readback ON' : 'Voice readback OFF'}
              >
                {tts.enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </TtsToggle>
            )}

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
