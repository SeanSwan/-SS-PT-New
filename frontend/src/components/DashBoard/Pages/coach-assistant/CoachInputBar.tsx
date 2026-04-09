/**
 * ┌─── SUB-COMPONENT: CoachInputBar ───────────────────────────┐
 * │ PARENT: SwanCoachAssistantPage                              │
 * │ PURPOSE: Text input + 64px voice orb + send button          │
 * │ WIREFRAME:                                                  │
 * │ ┌───────────────────┐  🎤  📤                              │
 * │ │ Type or tap mic... │  ○   →                              │
 * │ └───────────────────┘                                      │
 * │ Props: { onSend, sending, onVoiceOverlay, externalText, …} │
 * │                                                             │
 * │ SPRINT B: externalText prop injects transcript from overlay │
 * │           Web Speech has a 2-second cancel window           │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { Send, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { InputBar, ChatInput, SendBtn, VoiceOrbWrap, TtsToggle } from './SwanCoachStyles';
import { ORB_SIZE_MAP, ORB_ICON_SIZE_MAP } from './SwanCoachConstants';
import CoachInputCancelPill from './CoachInputCancelPill';
import type { OrbSize } from './SwanCoachTypes';

// ─────────────────────────────────────────────────────────────
// SECTION: Character Count
// ─────────────────────────────────────────────────────────────
const MAX_CHARS = 10000;
const CANCEL_WINDOW_MS = 2000;
const MIN_AUTO_SEND_LENGTH = 4; // prevent ambient noise / single phoneme triggering

const InputWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 0;
`;

const CharCount = styled.span<{ $near: boolean }>`
  position: absolute;
  right: 8px;
  bottom: 4px;
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  color: ${({ $near }) => $near
    ? 'var(--accent-gold, #C6A84B)'
    : 'var(--text-muted, rgba(224, 236, 244, 0.25))'};
  pointer-events: none;
  transition: color 0.2s ease;
`;

const InputBarWrap = styled.div`
  display: flex;
  flex-direction: column;
`;

interface CoachInputBarProps {
  onSend: (text: string) => void;
  sending?: boolean;
  ttsEnabled?: boolean;
  ttsSupported?: boolean;
  onTtsToggle?: () => void;
  onVoiceOverlay?: () => void;
  attachButton?: React.ReactNode;
  /**
   * SPRINT B: When set, injects this text into the input for editing
   * (used when user chooses "Edit" from VoiceRecordingOverlay preview state).
   * Injected once per unique value — tracked via internal ref to prevent loops.
   */
  externalText?: string;
}

// Web Speech API type
const SpeechRecognition = typeof window !== 'undefined'
  ? (window as unknown as { SpeechRecognition?: typeof globalThis.SpeechRecognition; webkitSpeechRecognition?: typeof globalThis.SpeechRecognition }).SpeechRecognition
    || (window as unknown as { webkitSpeechRecognition?: typeof globalThis.SpeechRecognition }).webkitSpeechRecognition
  : null;

const CoachInputBarComponent: React.FC<CoachInputBarProps> = ({
  onSend,
  sending = false,
  ttsEnabled = false,
  ttsSupported = false,
  onTtsToggle,
  onVoiceOverlay,
  attachButton,
  externalText,
}) => {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [cancelPillVisible, setCancelPillVisible] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSendTextRef = useRef('');
  const accumulatedRef = useRef('');
  const lastInjectedRef = useRef('');

  // Determine orb size: primary (64px) on mobile, standard (56px) on desktop
  const orbSize: OrbSize = typeof window !== 'undefined' && window.innerWidth < 768 ? 'primary' : 'standard';

  // ── SPRINT B: Inject external transcript text for editing ──
  useEffect(() => {
    if (externalText && externalText !== lastInjectedRef.current) {
      lastInjectedRef.current = externalText;
      setText(externalText);
      // Auto-resize textarea on inject
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.style.height = 'auto';
          inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
          inputRef.current.focus();
        }
      });
    }
  }, [externalText]);

  // ── Handle send ──
  const handleSend = useCallback(() => {
    const msg = text.trim();
    if (!msg || sending) return;
    onSend(msg);
    setText('');
    setInterim('');
    inputRef.current?.focus();
  }, [text, sending, onSend]);

  // ── Keyboard: Enter to send, Shift+Enter for newline, Cmd/Ctrl+Enter always sends ──
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // ── Auto-resize textarea ──
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, []);

  // ── SPRINT B: Cancel the pending auto-send ──
  const handleCancelSend = useCallback(() => {
    if (cancelSendTimerRef.current) clearTimeout(cancelSendTimerRef.current);
    if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
    setCancelPillVisible(false);
    // Text remains in input for correction
  }, []);

  // ── Voice recognition ──
  const toggleListening = useCallback(() => {
    if (!SpeechRecognition) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      setInterim('');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      accumulatedRef.current = '';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalText = '';
        let interimText = '';
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalText += result[0].transcript;
          } else {
            interimText += result[0].transcript;
          }
        }
        if (finalText) {
          accumulatedRef.current += finalText;
          setText(prev => prev + finalText);
        }
        setInterim(interimText);

        // Debounce: wait 750ms of silence before triggering cancel window
        if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
        const accumulated = accumulatedRef.current.trim();
        if (accumulated || (finalText + interimText).trim()) {
          autoSendTimerRef.current = setTimeout(() => {
            const msg = accumulatedRef.current.trim();
            // SPRINT B: minimum length guard — prevents noise/ambient sound
            if (msg.length < MIN_AUTO_SEND_LENGTH) {
              recognitionRef.current?.stop();
              setListening(false);
              setInterim('');
              return;
            }
            // Show cancel window before dispatching
            pendingSendTextRef.current = msg;
            setCancelPillVisible(true);
            recognitionRef.current?.stop();
            setListening(false);
            setInterim('');
            // After cancel window: actually send
            cancelSendTimerRef.current = setTimeout(() => {
              setCancelPillVisible(false);
              const finalMsg = pendingSendTextRef.current;
              if (finalMsg) {
                onSend(finalMsg);
                setText('');
                accumulatedRef.current = '';
                pendingSendTextRef.current = '';
              }
            }, CANCEL_WINDOW_MS);
          }, 750);
        }
      };

      recognition.onerror = () => {
        setListening(false);
        setInterim('');
      };

      recognition.onend = () => {
        setListening(false);
        setInterim('');
      };

      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [listening, onSend]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
      if (cancelSendTimerRef.current) clearTimeout(cancelSendTimerRef.current);
    };
  }, []);

  const hasVoice = !!SpeechRecognition || !!onVoiceOverlay;
  const displayText = text || interim;

  // Prefer server transcription overlay over browser Web Speech API
  const handleVoiceClick = useCallback(() => {
    if (onVoiceOverlay) {
      onVoiceOverlay();
    } else {
      toggleListening();
    }
  }, [onVoiceOverlay, toggleListening]);

  return (
    <InputBarWrap>
      {/* SPRINT B: Cancel window pill */}
      {cancelPillVisible && (
        <CoachInputCancelPill
          duration={CANCEL_WINDOW_MS}
          onCancel={handleCancelSend}
        />
      )}

      <InputBar>
        {/* TTS Toggle */}
        {ttsSupported && onTtsToggle && (
          <TtsToggle
            $active={ttsEnabled}
            onClick={onTtsToggle}
            aria-label={ttsEnabled ? 'Disable voice readback' : 'Enable voice readback'}
            title={ttsEnabled ? 'Voice readback ON' : 'Voice readback OFF'}
          >
            {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </TtsToggle>
        )}

        {/* File Attachment */}
        {attachButton}

        {/* Text Input */}
        <InputWrap>
          <ChatInput
            ref={inputRef}
            value={displayText}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={listening ? 'Listening...' : 'Type or tap mic...'}
            disabled={sending}
            aria-label="Message input"
            rows={1}
            maxLength={MAX_CHARS}
          />
          {text.length > 100 && (
            <CharCount $near={text.length > MAX_CHARS * 0.9}>
              {text.length}/{MAX_CHARS}
            </CharCount>
          )}
        </InputWrap>

        {/* Voice Orb */}
        {hasVoice && (
          <VoiceOrbWrap
            $listening={listening}
            $size={ORB_SIZE_MAP[orbSize]}
            onClick={handleVoiceClick}
            aria-label={listening ? 'Stop listening' : 'Start voice input'}
            title={listening ? 'Tap to stop' : 'Tap to speak'}
          >
            {listening
              ? <MicOff size={ORB_ICON_SIZE_MAP[orbSize]} />
              : <Mic size={ORB_ICON_SIZE_MAP[orbSize]} />}
          </VoiceOrbWrap>
        )}

        {/* Send Button */}
        <SendBtn
          onClick={handleSend}
          disabled={!text.trim() || sending}
          aria-label="Send message"
        >
          <Send size={20} />
        </SendBtn>
      </InputBar>
    </InputBarWrap>
  );
};

export const CoachInputBar = memo(CoachInputBarComponent);
