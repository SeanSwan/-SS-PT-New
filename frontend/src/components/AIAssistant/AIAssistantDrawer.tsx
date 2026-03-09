/**
 * AIAssistantDrawer
 * =================
 * Slide-in drawer from the right side for AI chat.
 * Supports multiple conversation contexts, voice dictation, and message history.
 * Galaxy-Swan themed with glass surfaces and cyan accents.
 *
 * Usage:
 *   <AIAssistantDrawer open={showAI} onClose={() => setShowAI(false)} userRole="client" />
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, Send, Plus, Sparkles, MessageSquare, Utensils,
  Dumbbell, Brain, ChevronLeft, Trash2, Loader2, Database,
} from 'lucide-react';
import { useAIChat, type AIContext } from '../../hooks/useAIChat';
import DictationOrb from './DictationOrb';

// ── Theme tokens ──
const SWAN_CYAN = '#8B5CF6';
const GALAXY_CORE = '#002060';
const GLASS_BG = 'rgba(16, 18, 30, 0.96)';

// ── Animations ──
const slideIn = keyframes`
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const typingDots = keyframes`
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-4px); }
`;

// ── Styled Components ──
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1400;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  animation: ${fadeIn} 0.2s ease;
`;

const DrawerPanel = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 1401;
  width: 420px;
  max-width: 100vw;
  background: ${GLASS_BG};
  border-left: 1px solid rgba(139, 92, 246, 0.15);
  box-shadow: -8px 0 40px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  animation: ${slideIn} 0.3s ease;

  @media (max-width: 480px) {
    width: 100vw;
  }
`;

const DrawerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: rgba(37, 39, 66, 0.8);
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
  flex-shrink: 0;
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: ${SWAN_CYAN};
  font-weight: 600;
  font-size: 1.05rem;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.08); color: #e2e8f0; }
`;

// ── Context Selector ──
const ContextBar = styled.div`
  display: flex;
  gap: 6px;
  padding: 12px 20px;
  overflow-x: auto;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  &::-webkit-scrollbar { height: 0; }
`;

const ContextPill = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  min-height: 36px;
  border-radius: 999px;
  border: 1px solid ${({ $active }) => $active ? SWAN_CYAN : 'rgba(255, 255, 255, 0.12)'};
  background: ${({ $active }) => $active ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.03)'};
  color: ${({ $active }) => $active ? SWAN_CYAN : '#94a3b8'};
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  &:hover { border-color: ${SWAN_CYAN}; color: ${SWAN_CYAN}; }
`;

// ── Conversation List ──
const ConversationList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
`;

const ConvItem = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 12px 14px;
  min-height: 44px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  color: #e2e8f0;
  cursor: pointer;
  margin-bottom: 6px;
  transition: all 0.2s;
  &:hover { background: rgba(139, 92, 246, 0.06); border-color: rgba(139, 92, 246, 0.2); }
`;

const ConvTitle = styled.div`
  flex: 1;
  font-size: 0.88rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ConvMeta = styled.div`
  font-size: 0.72rem;
  color: #64748b;
`;

// ── Messages Area ──
const MessagesArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.2);
    border-radius: 3px;
  }
`;

const MessageBubble = styled.div<{ $role: 'user' | 'assistant' }>`
  max-width: 85%;
  padding: 12px 16px;
  border-radius: ${({ $role }) => $role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};
  background: ${({ $role }) => $role === 'user'
    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(0, 170, 221, 0.1))'
    : 'rgba(255, 255, 255, 0.04)'};
  border: 1px solid ${({ $role }) => $role === 'user'
    ? 'rgba(139, 92, 246, 0.2)'
    : 'rgba(255, 255, 255, 0.08)'};
  align-self: ${({ $role }) => $role === 'user' ? 'flex-end' : 'flex-start'};
  color: #e2e8f0;
  font-size: 0.9rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  animation: ${fadeIn} 0.2s ease;
`;

const TypingIndicator = styled.div`
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  align-self: flex-start;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px 16px 16px 4px;
`;

const Dot = styled.div<{ $delay: number }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${SWAN_CYAN};
  animation: ${typingDots} 1.2s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay}s;
`;

// ── Input Area ──
const InputArea = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(25, 27, 45, 0.8);
  flex-shrink: 0;
`;

const ChatInput = styled.textarea`
  flex: 1;
  padding: 10px 14px;
  min-height: 44px;
  max-height: 120px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  font-size: 0.9rem;
  font-family: inherit;
  resize: none;
  transition: border-color 0.2s;
  &:focus {
    outline: none;
    border-color: ${SWAN_CYAN};
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.15);
  }
  &::placeholder { color: rgba(255, 255, 255, 0.3); }
`;

const SendBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 12px;
  border: none;
  background: ${({ $active }) => $active
    ? `linear-gradient(135deg, ${SWAN_CYAN}, #00aadd)`
    : 'rgba(255, 255, 255, 0.06)'};
  color: ${({ $active }) => $active ? GALAXY_CORE : '#64748b'};
  cursor: ${({ $active }) => $active ? 'pointer' : 'default'};
  transition: all 0.2s;
  flex-shrink: 0;
  &:hover:not(:disabled) {
    transform: ${({ $active }) => $active ? 'scale(1.05)' : 'none'};
    box-shadow: ${({ $active }) => $active ? '0 4px 18px rgba(139, 92, 246, 0.35)' : 'none'};
  }
`;

const Spinner = styled(Loader2)`
  animation: ${spin} 0.6s linear infinite;
`;

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  padding: 32px;
  color: #64748b;
`;

const EmptyIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.08);
  border: 2px solid rgba(139, 92, 246, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${SWAN_CYAN};
`;

const WelcomeTitle = styled.h3`
  color: #e2e8f0;
  font-size: 1.1rem;
  margin: 0;
`;

const WelcomeText = styled.p`
  color: #94a3b8;
  font-size: 0.88rem;
  line-height: 1.5;
  margin: 0;
`;

const ErrorBanner = styled.div`
  padding: 10px 20px;
  background: rgba(153, 27, 27, 0.14);
  border-bottom: 1px solid rgba(248, 113, 113, 0.25);
  color: #fca5a5;
  font-size: 0.82rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
`;

// ── Context Config ──
interface ContextConfig {
  label: string;
  icon: React.ElementType;
  description: string;
  roles: string[];
}

const CONTEXTS: Record<AIContext, ContextConfig> = {
  general: { label: 'General', icon: MessageSquare, description: 'Ask me anything about fitness and wellness', roles: ['client', 'trainer', 'admin'] },
  macro_logging: { label: 'Macros', icon: Utensils, description: 'Log food — just tell me what you ate', roles: ['client', 'trainer', 'admin'] },
  form_tips: { label: 'Form Tips', icon: Dumbbell, description: 'Get exercise form guidance', roles: ['client', 'trainer', 'admin'] },
  workout_suggestions: { label: 'Workouts', icon: Sparkles, description: 'Get workout ideas and suggestions', roles: ['client', 'trainer', 'admin'] },
  workout_generation: { label: 'Generate Plans', icon: Brain, description: 'Create structured workout plans', roles: ['trainer', 'admin'] },
  client_review: { label: 'Client Review', icon: Brain, description: 'Analyze client progress and data', roles: ['trainer', 'admin'] },
  data_management: { label: 'Data Manager', icon: Database, description: 'Review, analyze, and manage platform data', roles: ['admin'] },
};

// ── Component ──
interface AIAssistantDrawerProps {
  open: boolean;
  onClose: () => void;
  userRole: 'client' | 'trainer' | 'admin';
  defaultContext?: AIContext;
}

const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  open,
  onClose,
  userRole,
  defaultContext = 'general',
}) => {
  const {
    conversations,
    activeConversation,
    messages,
    loading,
    sending,
    error,
    createConversation,
    listConversations,
    loadConversation,
    sendMessage,
    deleteConversation,
    newChat,
    clearError,
  } = useAIChat();

  const [inputValue, setInputValue] = useState('');
  const [selectedContext, setSelectedContext] = useState<AIContext>(defaultContext);
  const [view, setView] = useState<'chat' | 'list'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Available contexts for this role
  const availableContexts = Object.entries(CONTEXTS)
    .filter(([, cfg]) => cfg.roles.includes(userRole))
    .map(([key]) => key as AIContext);

  // Load conversations on open
  useEffect(() => {
    if (open) {
      listConversations();
    }
  }, [open, listConversations]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when conversation loads
  useEffect(() => {
    if (activeConversation && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeConversation]);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || sending) return;
    if (text.length > 4000) return; // Max message length guard

    setInputValue('');

    // If no active conversation, create one first
    if (!activeConversation) {
      const conv = await createConversation(selectedContext);
      if (!conv) {
        setInputValue(text); // Restore input on failure
        return;
      }
    }

    const result = await sendMessage(text);
    // If send failed, restore the user's message so they don't lose it
    if (result?.failed) {
      setInputValue(result.originalMessage || text);
    }
  }, [inputValue, sending, activeConversation, selectedContext, createConversation, sendMessage]);

  const handleStartChat = useCallback(async (context: AIContext) => {
    setSelectedContext(context);
    const conv = await createConversation(context);
    if (conv) {
      setView('chat');
    }
  }, [createConversation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDictation = useCallback((text: string) => {
    setInputValue(prev => prev + (prev ? ' ' : '') + text);
  }, []);

  const handleInterim = useCallback((_text: string) => {
    // Reserved for future interim transcript display
  }, []);

  if (!open) return null;

  const hasInput = inputValue.trim().length > 0;

  return (
    <>
      <Overlay onClick={onClose} />
      <DrawerPanel>
        {/* Header */}
        <DrawerHeader>
          <HeaderTitle>
            {view === 'list' || !activeConversation ? (
              <>
                <Sparkles size={20} />
                SwanStudios AI
              </>
            ) : (
              <>
                <IconBtn onClick={() => { newChat(); setView('list'); }} aria-label="Back to conversations">
                  <ChevronLeft size={20} />
                </IconBtn>
                <span style={{ fontSize: '0.9rem' }}>
                  {activeConversation.title || CONTEXTS[activeConversation.context as AIContext]?.label || 'Chat'}
                </span>
              </>
            )}
          </HeaderTitle>
          <HeaderActions>
            {activeConversation && (
              <IconBtn onClick={() => { newChat(); setView('chat'); }} aria-label="New chat" title="New chat">
                <Plus size={18} />
              </IconBtn>
            )}
            <IconBtn onClick={() => setView(view === 'list' ? 'chat' : 'list')} aria-label="Conversation history" title="History">
              <MessageSquare size={18} />
            </IconBtn>
            <IconBtn onClick={onClose} aria-label="Close AI assistant">
              <X size={20} />
            </IconBtn>
          </HeaderActions>
        </DrawerHeader>

        {/* Error */}
        {error && (
          <ErrorBanner>
            <span>{error}</span>
            <IconBtn onClick={clearError} style={{ minWidth: 32, minHeight: 32 }}><X size={14} /></IconBtn>
          </ErrorBanner>
        )}

        {/* View: Conversation List */}
        {view === 'list' ? (
          <ConversationList>
            {loading ? (
              <EmptyState><Spinner size={24} /></EmptyState>
            ) : conversations.length === 0 ? (
              <EmptyState>
                <EmptyIcon><MessageSquare size={28} /></EmptyIcon>
                <WelcomeText>No conversations yet. Start a new chat!</WelcomeText>
              </EmptyState>
            ) : (
              conversations.map(conv => (
                <ConvItem key={conv.id} onClick={() => { loadConversation(conv.id); setView('chat'); }}>
                  <MessageSquare size={16} style={{ color: '#64748b', flexShrink: 0 }} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <ConvTitle>{conv.title || 'Untitled'}</ConvTitle>
                    <ConvMeta>{conv.messageCount} messages</ConvMeta>
                  </div>
                  <IconBtn
                    onClick={e => { e.stopPropagation(); deleteConversation(conv.id); }}
                    style={{ minWidth: 36, minHeight: 36 }}
                    aria-label="Delete conversation"
                  >
                    <Trash2 size={14} />
                  </IconBtn>
                </ConvItem>
              ))
            )}
          </ConversationList>
        ) : !activeConversation ? (
          /* View: Context Selection (no active conversation) */
          <>
            <ContextBar>
              {availableContexts.map(ctx => {
                const cfg = CONTEXTS[ctx];
                const Icon = cfg.icon;
                return (
                  <ContextPill
                    key={ctx}
                    $active={selectedContext === ctx}
                    onClick={() => setSelectedContext(ctx)}
                  >
                    <Icon size={14} />
                    {cfg.label}
                  </ContextPill>
                );
              })}
            </ContextBar>
            <EmptyState>
              <EmptyIcon><Sparkles size={28} /></EmptyIcon>
              <WelcomeTitle>
                {CONTEXTS[selectedContext]?.label || 'AI Assistant'}
              </WelcomeTitle>
              <WelcomeText>{CONTEXTS[selectedContext]?.description}</WelcomeText>
              <SendBtn $active onClick={() => handleStartChat(selectedContext)} style={{ width: 'auto', padding: '0 24px', borderRadius: 999 }}>
                <Plus size={16} />
                <span style={{ marginLeft: 6, fontWeight: 600, fontSize: '0.88rem' }}>Start Chat</span>
              </SendBtn>
            </EmptyState>
          </>
        ) : (
          /* View: Active Chat */
          <>
            {/* Context pills */}
            <ContextBar>
              {availableContexts.map(ctx => {
                const cfg = CONTEXTS[ctx];
                const Icon = cfg.icon;
                return (
                  <ContextPill
                    key={ctx}
                    $active={activeConversation.context === ctx}
                    onClick={() => {/* Context is locked per conversation */}}
                    style={{ opacity: activeConversation.context === ctx ? 1 : 0.4, cursor: 'default' }}
                  >
                    <Icon size={14} />
                    {cfg.label}
                  </ContextPill>
                );
              })}
            </ContextBar>

            {/* Messages */}
            <MessagesArea>
              {messages.length === 0 && (
                <EmptyState style={{ gap: 10 }}>
                  <WelcomeText>
                    {CONTEXTS[activeConversation.context as AIContext]?.description || 'How can I help you today?'}
                  </WelcomeText>
                </EmptyState>
              )}
              {messages.map((msg, i) => (
                <MessageBubble key={i} $role={msg.role}>
                  {msg.content}
                </MessageBubble>
              ))}
              {sending && (
                <TypingIndicator>
                  <Dot $delay={0} />
                  <Dot $delay={0.15} />
                  <Dot $delay={0.3} />
                </TypingIndicator>
              )}
              <div ref={messagesEndRef} />
            </MessagesArea>

            {/* Input */}
            <InputArea>
              <DictationOrb onTranscript={handleDictation} onInterimTranscript={handleInterim} disabled={sending} />
              <ChatInput
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                maxLength={4000}
                disabled={sending}
              />
              <SendBtn $active={hasInput && !sending} onClick={handleSend} aria-label="Send message">
                {sending ? <Spinner size={18} /> : <Send size={18} />}
              </SendBtn>
            </InputArea>
          </>
        )}
      </DrawerPanel>
    </>
  );
};

export default AIAssistantDrawer;
