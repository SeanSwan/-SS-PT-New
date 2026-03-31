/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: SwanCoachAssistantPage                           ║
 * ║  PURPOSE: Swan Studios Coach Assistant — AI training terminal ║
 * ║  OWNER: Claude Opus 4.6 (CEO)                                ║
 * ║  LAST VALIDATED: 2026-03-30 (11-brain AI Village consensus)  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME (Mobile 320-430px):
 * ┌─────────────────────────────────┐
 * │ 🤖 Swan Studios Coach Assistant │
 * ├─────────────────────────────────┤
 * │ [🏋️] [📋] [👥] [📅] [📊] [💪]│
 * ├─────────────────────────────────┤
 * │  AI + User message bubbles      │
 * │  (16px text, full width)        │
 * ├─────────────────────────────────┤
 * │ ⚖️ Balanced ▾                   │
 * ├─────────────────────────────────┤
 * │ [Input...] 🎤 📤               │
 * └─────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  (none — page-level component)
 * State:     via useCoachAssistant hook
 * API Calls: POST /api/ai-chat/conversations, POST /api/ai-chat/conversations/:id/messages
 * Children:  ContextChipBar, CoachMessage, ResponseStyleSelector, CoachInputBar
 */

import React, { useCallback, useMemo } from 'react';
import { MessageCircle } from 'lucide-react';
import { useCoachAssistant } from './hooks/useCoachAssistant';
import { ContextChipBar } from './ContextChipBar';
import { CoachMessage } from './CoachMessage';
import { ResponseStyleSelector } from './ResponseStyleSelector';
import { CoachInputBar } from './CoachInputBar';
import {
  CoachPage,
  CoachHeader,
  CoachTitle,
  CoachHeaderIcon,
  MessagesArea,
  TypingWrap,
  TypingDot,
} from './SwanCoachStyles';
import type { CoachContext, ResponseStyle } from './SwanCoachTypes';

// ─────────────────────────────────────────────────────────────
// SECTION: TTS Hook (simple Web Speech API wrapper)
// ─────────────────────────────────────────────────────────────
function useSimpleTTS() {
  const [enabled, setEnabled] = React.useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const speak = useCallback((text: string) => {
    if (!supported || !enabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.volume = 0.9;
    window.speechSynthesis.speak(utterance);
  }, [supported, enabled]);

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  const toggleEnabled = useCallback(() => setEnabled(prev => !prev), []);

  return { enabled, supported, speak, stop, toggleEnabled };
}

// ─────────────────────────────────────────────────────────────
// SECTION: Main Page Component
// ─────────────────────────────────────────────────────────────
const SwanCoachAssistantPage: React.FC = () => {
  const coach = useCoachAssistant();
  const tts = useSimpleTTS();

  // ── Get user role from localStorage ──
  const userRole = useMemo(() => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        return (parsed.role || 'admin') as 'admin' | 'trainer' | 'client';
      }
    } catch { /* fallback */ }
    return 'admin' as const;
  }, []);

  // ── Handle read aloud ──
  const handleReadAloud = useCallback((text: string) => {
    tts.speak(text);
  }, [tts]);

  // ── Auto-read new AI messages when TTS enabled ──
  const lastMsgRef = React.useRef<string>('');
  React.useEffect(() => {
    if (!tts.enabled || !coach.messages.length) return;
    const lastMsg = coach.messages[coach.messages.length - 1];
    if (lastMsg.role === 'assistant' && lastMsg.id !== lastMsgRef.current) {
      lastMsgRef.current = lastMsg.id;
      tts.speak(lastMsg.content);
    }
  }, [coach.messages, tts]);

  // ── Cleanup TTS on unmount ──
  React.useEffect(() => () => tts.stop(), [tts]);

  return (
    <CoachPage>
      {/* Header */}
      <CoachHeader>
        <CoachHeaderIcon>
          <MessageCircle size={20} />
        </CoachHeaderIcon>
        <CoachTitle>Swan Studios Coach Assistant</CoachTitle>
      </CoachHeader>

      {/* Context Chips */}
      <ContextChipBar
        activeContext={coach.context}
        onContextChange={coach.switchContext as (ctx: CoachContext) => void}
        userRole={userRole}
      />

      {/* Messages */}
      <MessagesArea role="log" aria-live="polite" aria-label="Conversation">
        {coach.messages.map(msg => (
          <CoachMessage
            key={msg.id}
            message={msg}
            onReadAloud={msg.role === 'assistant' ? handleReadAloud : undefined}
          />
        ))}
        {coach.sending && (
          <TypingWrap aria-label="AI is thinking">
            <TypingDot />
            <TypingDot />
            <TypingDot />
          </TypingWrap>
        )}
        <div ref={coach.messagesEndRef} />
      </MessagesArea>

      {/* Response Style */}
      <ResponseStyleSelector
        activeStyle={coach.responseStyle}
        onStyleChange={coach.setResponseStyle as (s: ResponseStyle) => void}
      />

      {/* Input Bar */}
      <CoachInputBar
        onSend={coach.sendMessage}
        sending={coach.sending}
        ttsEnabled={tts.enabled}
        ttsSupported={tts.supported}
        onTtsToggle={tts.toggleEnabled}
      />
    </CoachPage>
  );
};

export default SwanCoachAssistantPage;
