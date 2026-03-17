/**
 * AIAssistantDrawer
 * =================
 * Slide-in drawer from the right side for AI chat.
 * Supports multiple conversation contexts, voice dictation, and message history.
 * Crystalline Swan themed with glass surfaces and Wing Purple accents.
 *
 * Usage:
 *   <AIAssistantDrawer open={showAI} onClose={() => setShowAI(false)} userRole="client" />
 */
import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import styled, { keyframes } from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, Send, Plus, Sparkles, MessageSquare, Utensils,
  Dumbbell, Brain, ChevronLeft, Trash2, Loader2, Database,
  ClipboardList,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAIChat, type AIContext, type ResponseStyle } from '../../hooks/useAIChat';
import DictationOrb from './DictationOrb';
import ClientPicker, { type ClientInfo } from './ClientPicker';
import QuickActions from './QuickActions';
const VoiceUpload = React.lazy(() => import('./VoiceUpload'));
import { parseAIWorkoutPlan, dispatchApplyToLogger } from '../../utils/parseAIWorkoutPlan';
import { parseAIActions, stripActionBlocks, ACTION_META, type AIAction } from '../../utils/parseAIActions';

// ── Crystalline Swan Theme Tokens ──
const CS = {
  // Brand colors
  wingPurple: '#8B5CF6',
  midnightSapphire: '#002060',
  royalDepth: '#003080',
  iceWing: '#60C0F0',
  arcticCyan: '#50A0F0',
  gildedFern: '#C6A84B',
  frostWhite: '#E0ECF4',
  // Surfaces
  glassBg: 'rgba(0, 32, 96, 0.92)',
  headerBg: 'rgba(0, 32, 96, 0.85)',
  inputBg: 'rgba(0, 24, 64, 0.8)',
  // Text
  textPrimary: '#E0ECF4',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',
  textDisabled: '#64748b',
  // Borders
  borderSubtle: 'rgba(139, 92, 246, 0.12)',
  borderActive: 'rgba(139, 92, 246, 0.4)',
  borderGlass: 'rgba(96, 192, 240, 0.12)',
  // Semantic
  errorBg: 'rgba(153, 27, 27, 0.3)',
  errorBorder: 'rgba(248, 113, 113, 0.35)',
  errorText: '#fca5a5',
  // Interactive
  hoverBg: 'rgba(139, 92, 246, 0.08)',
  activePillBg: 'rgba(139, 92, 246, 0.15)',
  userBubbleBg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(96, 192, 240, 0.08))',
  assistantBubbleBg: 'rgba(0, 32, 96, 0.5)',
};

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
  -webkit-backdrop-filter: blur(4px);
  animation: ${fadeIn} 0.2s ease;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const DrawerPanel = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 1401;
  width: 420px;
  max-width: 100vw;
  background: ${CS.glassBg};
  border-left: 1px solid ${CS.borderSubtle};
  box-shadow: -8px 0 40px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  animation: ${slideIn} 0.3s ease;

  @media (max-width: 480px) {
    width: 100vw;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const DrawerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: ${CS.headerBg};
  border-bottom: 1px solid ${CS.borderSubtle};
  flex-shrink: 0;

  @media (min-width: 480px) {
    padding: 16px 20px;
  }
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${CS.wingPurple};
  font-weight: 600;
  font-size: 1rem;
  min-width: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
`;

const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  background: transparent;
  border: none;
  color: ${CS.textSecondary};
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  &:hover { background: ${CS.hoverBg}; color: ${CS.textPrimary}; }
  &:focus-visible { outline: 2px solid ${CS.wingPurple}; outline-offset: 2px; }
`;

// ── Context Selector ──
const ContextBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
  gap: 6px;
  padding: 10px 12px;
  flex-shrink: 0;
  border-bottom: 1px solid ${CS.borderSubtle};

  @media (min-width: 480px) {
    display: flex;
    gap: 6px;
    padding: 10px 16px;
    overflow-x: auto;
    &::-webkit-scrollbar { height: 0; }
  }
`;

const ContextPill = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 6px;
  min-height: 44px;
  border-radius: 12px;
  border: 1px solid ${({ $active }) => $active ? CS.wingPurple : CS.borderSubtle};
  background: ${({ $active }) => $active ? CS.activePillBg : 'rgba(0, 32, 96, 0.3)'};
  color: ${({ $active }) => $active ? CS.wingPurple : CS.textSecondary};
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  flex-direction: column;

  svg { flex-shrink: 0; }

  &:hover { border-color: ${CS.wingPurple}; color: ${CS.wingPurple}; }
  &:focus-visible { outline: 2px solid ${CS.wingPurple}; outline-offset: 2px; }

  /* Mobile: icon + short label stacked */
  @media (max-width: 479px) {
    border-radius: 12px;
    padding: 8px 4px;
    font-size: 0.65rem;
    gap: 3px;
  }

  /* Tablet+: horizontal pill */
  @media (min-width: 480px) {
    flex-direction: row;
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 0.8rem;
    gap: 6px;
  }
`;

// ── Response Style Selector ──
const ResponseStyleBar = styled.div`
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  overflow-x: auto;
  flex-shrink: 0;
  border-bottom: 1px solid ${CS.borderSubtle};
  background: rgba(0, 32, 96, 0.4);
  &::-webkit-scrollbar { height: 0; }

  @media (min-width: 480px) {
    padding: 8px 16px;
  }
`;

const StylePill = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  min-height: 44px;
  border-radius: 999px;
  border: 1px solid ${({ $active }) => $active ? CS.iceWing : CS.borderSubtle};
  background: ${({ $active }) => $active ? 'rgba(96, 192, 240, 0.12)' : 'transparent'};
  color: ${({ $active }) => $active ? CS.iceWing : CS.textMuted};
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  &:hover { border-color: ${CS.iceWing}; color: ${CS.iceWing}; }
  &:focus-visible { outline: 2px solid ${CS.iceWing}; outline-offset: 2px; }
`;

const RESPONSE_STYLES: { key: ResponseStyle; label: string; emoji: string }[] = [
  { key: 'both', label: 'Both', emoji: '🎓💯' },
  { key: 'phd_only', label: 'PhD Mode', emoji: '🎓' },
  { key: 'simple_only', label: 'Keep It 100', emoji: '💯' },
];

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
  min-height: 48px;
  background: rgba(0, 32, 96, 0.3);
  border: 1px solid ${CS.borderSubtle};
  border-radius: 12px;
  color: ${CS.textPrimary};
  cursor: pointer;
  margin-bottom: 6px;
  transition: all 0.2s;
  &:hover { background: ${CS.hoverBg}; border-color: ${CS.borderActive}; }
  &:focus-visible { outline: 2px solid ${CS.wingPurple}; outline-offset: 2px; }
`;

const ConvTitle = styled.div`
  flex: 1;
  font-size: 0.88rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ConvMeta = styled.div`
  font-size: 0.8rem;
  color: ${CS.textMuted};
`;

// ── Messages Area ──
const MessagesArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.2);
    border-radius: 3px;
  }

  @media (min-width: 480px) {
    padding: 16px 20px;
    gap: 12px;
  }
`;

const MessageBubble = styled.div<{ $role: 'user' | 'assistant' }>`
  max-width: 88%;
  padding: 10px 14px;
  border-radius: ${({ $role }) => $role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};
  background: ${({ $role }) => $role === 'user'
    ? CS.userBubbleBg
    : CS.assistantBubbleBg};
  border: 1px solid ${({ $role }) => $role === 'user'
    ? CS.borderActive
    : CS.borderGlass};
  align-self: ${({ $role }) => $role === 'user' ? 'flex-end' : 'flex-start'};
  color: ${CS.textPrimary};
  font-size: 0.88rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  animation: ${fadeIn} 0.2s ease;

  @media (min-width: 480px) {
    max-width: 85%;
    padding: 12px 16px;
    font-size: 0.9rem;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const ApplyToLoggerBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  min-height: 44px;
  margin-top: 6px;
  border-radius: 10px;
  border: 1px solid ${CS.borderActive};
  background: ${CS.activePillBg};
  color: ${CS.wingPurple};
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  align-self: flex-start;
  &:hover {
    background: rgba(139, 92, 246, 0.2);
    border-color: rgba(139, 92, 246, 0.5);
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.15);
  }
  &:active { transform: scale(0.97); }
  &:focus-visible { outline: 2px solid ${CS.wingPurple}; outline-offset: 2px; }
`;

const TypingIndicator = styled.div`
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  align-self: flex-start;
  background: ${CS.assistantBubbleBg};
  border: 1px solid ${CS.borderGlass};
  border-radius: 16px 16px 16px 4px;
`;

const Dot = styled.div<{ $delay: number }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${CS.wingPurple};
  animation: ${typingDots} 1.2s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay}s;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.6;
  }
`;

// ── Input Area ──
const InputArea = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid ${CS.borderSubtle};
  background: ${CS.inputBg};
  flex-shrink: 0;

  @media (min-width: 480px) {
    padding: 16px 20px;
  }
`;

const ChatInput = styled.textarea`
  flex: 1;
  padding: 10px 14px;
  min-height: 44px;
  max-height: 120px;
  border-radius: 12px;
  border: 1px solid ${CS.borderSubtle};
  background: rgba(0, 32, 96, 0.4);
  color: ${CS.textPrimary};
  font-size: 0.9rem;
  font-family: inherit;
  resize: none;
  transition: border-color 0.2s;
  &:focus {
    outline: none;
    border-color: ${CS.wingPurple};
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.15);
  }
  &::placeholder { color: rgba(255, 255, 255, 0.5); }
  &:focus-visible { outline: 2px solid ${CS.wingPurple}; outline-offset: 2px; }
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
    ? `linear-gradient(135deg, ${CS.wingPurple}, ${CS.iceWing})`
    : 'rgba(0, 32, 96, 0.4)'};
  color: ${({ $active }) => $active ? CS.midnightSapphire : CS.textDisabled};
  cursor: ${({ $active }) => $active ? 'pointer' : 'default'};
  transition: all 0.2s;
  flex-shrink: 0;
  &:hover:not(:disabled) {
    transform: ${({ $active }) => $active ? 'scale(1.05)' : 'none'};
    box-shadow: ${({ $active }) => $active ? '0 4px 18px rgba(139, 92, 246, 0.35)' : 'none'};
  }
  &:focus-visible { outline: 2px solid ${CS.wingPurple}; outline-offset: 2px; }
`;

const Spinner = styled(Loader2)`
  animation: ${spin} 0.6s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 1.5s;
  }
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
  color: ${CS.textMuted};
`;

const EmptyIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.08);
  border: 2px solid ${CS.borderActive};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${CS.wingPurple};
`;

const WelcomeTitle = styled.h3`
  color: ${CS.textPrimary};
  font-size: 1.1rem;
  margin: 0;
`;

const WelcomeText = styled.p`
  color: ${CS.textSecondary};
  font-size: 0.88rem;
  line-height: 1.5;
  margin: 0;
`;

const ErrorBanner = styled.div`
  padding: 10px 20px;
  background: ${CS.errorBg};
  border-bottom: 1px solid ${CS.errorBorder};
  color: ${CS.errorText};
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

// ── Action Confirmation Card ──
const ActionCard = styled.div<{ $color: string }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  margin-top: 6px;
  border-radius: 12px;
  border: 1px solid ${({ $color }) => $color}33;
  background: ${({ $color }) => $color}0D;
  align-self: flex-start;
  max-width: 88%;

  @media (min-width: 480px) {
    max-width: 85%;
  }
`;

const ActionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  color: ${CS.textPrimary};
`;

const ActionConfirmBtn = styled.button<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid ${({ $color }) => $color}66;
  background: ${({ $color }) => $color}1A;
  color: ${({ $color }) => $color};
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  align-self: flex-start;

  &:hover {
    background: ${({ $color }) => $color}33;
    box-shadow: 0 0 12px ${({ $color }) => $color}26;
  }

  &:active { transform: scale(0.97); }
  &:focus-visible { outline: 2px solid ${({ $color }) => $color}; outline-offset: 2px; }
`;

// ── Memoized Chat Message (prevents re-parsing on every render) ──
interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

const ChatMessage = React.memo<ChatMessageProps>(({ role, content }) => {
  const parsedExercises = useMemo(
    () => role === 'assistant' ? parseAIWorkoutPlan(content) : null,
    [role, content]
  );

  const actions = useMemo(
    () => role === 'assistant' ? parseAIActions(content) : [],
    [role, content]
  );

  const displayContent = useMemo(
    () => actions.length > 0 ? stripActionBlocks(content) : content,
    [content, actions]
  );

  const handleActionConfirm = useCallback(async (action: AIAction) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '' : 'http://localhost:10000');

      if (action.type === 'CREATE_WORKOUT') {
        // Use existing workout plan parser flow
        if (parsedExercises && parsedExercises.length > 0) {
          dispatchApplyToLogger(parsedExercises);
          toast.success(`Sent ${parsedExercises.length} exercises to Workout Logger`);
        }
        return;
      }

      // For other action types, send to the data write endpoint
      const typeMap: Record<string, string> = {
        LOG_NUTRITION: 'macro_log',
        UPDATE_MEASUREMENTS: 'body_measurement',
        ADD_NOTE: 'client_note',
        CREATE_PLAN: 'goal',
      };

      const updateType = typeMap[action.type];
      if (!updateType) return;

      const res = await fetch(`${API_BASE}/api/ai-chat/data-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ updateType, data: action.data }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success(`${ACTION_META[action.type].label} saved successfully`);
      } else {
        toast.error(result.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to execute action');
    }
  }, [parsedExercises]);

  return (
    <>
      <MessageBubble $role={role}>{displayContent}</MessageBubble>
      {/* Legacy: workout exercise parser (works even without action blocks) */}
      {parsedExercises && parsedExercises.length > 0 && actions.length === 0 && (
        <ApplyToLoggerBtn
          onClick={() => {
            dispatchApplyToLogger(parsedExercises);
            toast.success(`Sent ${parsedExercises.length} exercises to Workout Logger`);
          }}
        >
          <ClipboardList size={14} />
          Apply {parsedExercises.length} exercises to Logger
        </ApplyToLoggerBtn>
      )}
      {/* Structured action cards */}
      {actions.map((action, idx) => {
        const meta = ACTION_META[action.type];
        return (
          <ActionCard key={idx} $color={meta.color}>
            <ActionHeader>
              <span style={{ fontSize: '1rem' }}>
                {action.type === 'CREATE_WORKOUT' ? '💪' :
                 action.type === 'LOG_NUTRITION' ? '🥗' :
                 action.type === 'UPDATE_MEASUREMENTS' ? '📏' :
                 action.type === 'ADD_NOTE' ? '📝' : '📋'}
              </span>
              {meta.label}
            </ActionHeader>
            <div style={{ fontSize: '0.78rem', color: CS.textSecondary, lineHeight: 1.4 }}>
              {action.type === 'CREATE_WORKOUT' && parsedExercises
                ? `${parsedExercises.length} exercises detected`
                : `Ready to save`
              }
            </div>
            <ActionConfirmBtn $color={meta.color} onClick={() => handleActionConfirm(action)}>
              {meta.confirmLabel}
            </ActionConfirmBtn>
          </ActionCard>
        );
      })}
    </>
  );
});

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
  const [selectedResponseStyle, setSelectedResponseStyle] = useState<ResponseStyle>('both');
  const [view, setView] = useState<'chat' | 'list'>('chat');
  const [selectedClient, setSelectedClient] = useState<ClientInfo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

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

  // Focus trap — keep tab focus within drawer
  useEffect(() => {
    if (!open || !drawerRef.current) return;
    const drawer = drawerRef.current;
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = drawer.querySelectorAll<HTMLElement>(focusableSelector);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    // Focus the first focusable element (or input if in chat view)
    requestAnimationFrame(() => {
      if (inputRef.current && activeConversation) {
        inputRef.current.focus();
      } else {
        const first = drawer.querySelector<HTMLElement>(focusableSelector);
        first?.focus();
      }
    });

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [open, activeConversation]);

  // Swipe-to-close on mobile (right swipe)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);
    const dt = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;
    // Right swipe: 80px min distance, more horizontal than vertical, under 500ms
    if (dx > 80 && dy < dx * 0.5 && dt < 500) {
      onClose();
    }
  }, [onClose]);

  // Get target client ID — prefer state-based picker, fallback to sessionStorage
  const getTargetClientId = useCallback(() => {
    if (userRole !== 'admin' && userRole !== 'trainer') return null;
    if (selectedClient) return String(selectedClient.id);
    try { return sessionStorage.getItem('ai_target_client_id') || null; } catch { return null; }
  }, [userRole, selectedClient]);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || sending) return;
    if (text.length > 4000) return; // Max message length guard

    setInputValue('');

    // If no active conversation, create one first
    if (!activeConversation) {
      const targetClientId = getTargetClientId();
      const conv = await createConversation(selectedContext, undefined, targetClientId, selectedResponseStyle);
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
  }, [inputValue, sending, activeConversation, selectedContext, selectedResponseStyle, createConversation, sendMessage, getTargetClientId]);

  const handleStartChat = useCallback(async (context: AIContext) => {
    setSelectedContext(context);
    const targetClientId = getTargetClientId();
    const conv = await createConversation(context, undefined, targetClientId, selectedResponseStyle);
    if (conv) {
      setView('chat');
    }
  }, [createConversation, getTargetClientId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick action — auto-start chat with a specific context and prompt
  const handleQuickAction = useCallback(async (context: AIContext, prompt: string) => {
    setSelectedContext(context);
    const targetClientId = getTargetClientId();
    const conv = await createConversation(context, undefined, targetClientId, selectedResponseStyle);
    if (conv) {
      setView('chat');
      await sendMessage(prompt);
    }
  }, [createConversation, getTargetClientId, selectedResponseStyle, sendMessage]);

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
      <DrawerPanel ref={drawerRef} role="dialog" aria-modal="true" aria-label="AI Assistant" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
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
            <IconBtn onClick={onClose} aria-label="Close AI Assistant">
              <X size={20} />
            </IconBtn>
          </HeaderActions>
        </DrawerHeader>

        {/* Client Picker — trainer/admin only */}
        {(userRole === 'trainer' || userRole === 'admin') && (
          <ClientPicker
            selectedClient={selectedClient}
            onSelectClient={setSelectedClient}
            userRole={userRole}
          />
        )}

        {/* Quick Actions — shown when client is selected and no active conversation */}
        {selectedClient && !activeConversation && (userRole === 'trainer' || userRole === 'admin') && view === 'chat' && (
          <QuickActions
            clientName={`${selectedClient.firstName} ${selectedClient.lastName}`}
            onAction={handleQuickAction}
            userRole={userRole}
          />
        )}

        {/* Error */}
        {error && (
          <ErrorBanner>
            <span>{error}</span>
            <IconBtn onClick={clearError} aria-label="Dismiss error"><X size={14} /></IconBtn>
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
                  <MessageSquare size={16} style={{ color: CS.textMuted, flexShrink: 0 }} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <ConvTitle>{conv.title || 'Untitled'}</ConvTitle>
                    <ConvMeta>{conv.messageCount} messages</ConvMeta>
                  </div>
                  <IconBtn
                    onClick={e => { e.stopPropagation(); deleteConversation(conv.id); }}
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
                    aria-pressed={selectedContext === ctx}
                  >
                    <Icon size={14} />
                    {cfg.label}
                  </ContextPill>
                );
              })}
            </ContextBar>
            <ResponseStyleBar>
              {RESPONSE_STYLES.map(style => (
                <StylePill
                  key={style.key}
                  $active={selectedResponseStyle === style.key}
                  onClick={() => setSelectedResponseStyle(style.key)}
                  aria-pressed={selectedResponseStyle === style.key}
                  title={style.key === 'both' ? 'PhD + Grandma-friendly' : style.key === 'phd_only' ? 'Expert-level detail' : 'Simple & friendly'}
                >
                  {style.emoji} {style.label}
                </StylePill>
              ))}
            </ResponseStyleBar>
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
                    aria-pressed={activeConversation.context === ctx}
                    style={{ opacity: activeConversation.context === ctx ? 1 : 0.4, cursor: 'default' }}
                  >
                    <Icon size={14} />
                    {cfg.label}
                  </ContextPill>
                );
              })}
            </ContextBar>

            {/* Response style indicator */}
            <div style={{ padding: '6px 20px', background: 'rgba(0, 32, 96, 0.3)', borderBottom: `1px solid ${CS.borderSubtle}`, fontSize: '0.8rem', color: CS.textMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
              Style: <strong style={{ color: CS.iceWing }}>
                {RESPONSE_STYLES.find(s => s.key === selectedResponseStyle)?.emoji}{' '}
                {RESPONSE_STYLES.find(s => s.key === selectedResponseStyle)?.label || 'Both'}
              </strong>
            </div>

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
                <React.Fragment key={i}>
                  <ChatMessage role={msg.role} content={msg.content} />
                </React.Fragment>
              ))}
              <div aria-live="polite" aria-atomic="true">
                {sending && (
                  <TypingIndicator role="status">
                    <Dot $delay={0} />
                    <Dot $delay={0.15} />
                    <Dot $delay={0.3} />
                    <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>AI is thinking...</span>
                  </TypingIndicator>
                )}
              </div>
              <div ref={messagesEndRef} />
            </MessagesArea>

            {/* Input */}
            <InputArea>
              <DictationOrb onTranscript={handleDictation} onInterimTranscript={handleInterim} disabled={sending} />
              <Suspense fallback={null}>
                <VoiceUpload onTranscript={handleDictation} disabled={sending} />
              </Suspense>
              <ChatInput
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                aria-label="Type your message"
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
