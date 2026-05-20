/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: DictationOrb — Voice-First Input (V3)            ║
 * ║  PURPOSE: Voice-to-text via Web Speech API for AI chat input  ║
 * ║  PARENT: AIAssistantDrawer (InputArea)                        ║
 * ║  OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-21         ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌─── Idle ──────────┐  ┌─── Listening ──────────────────────┐
 * │ [🎤] 44px orb     │  │ [🎤✨] pulsing crystalline glow   │
 * └───────────────────┘  │ ┌─ Interim Bubble ──────────────┐ │
 *                        │ │ "the quick brown fox..."       │ │
 *                        │ └────────────────────────────────┘ │
 *                        └────────────────────────────────────┘
 *
 * TWO MODES:
 * 1. Tap-to-toggle — tap to start/stop continuous listening
 * 2. Hold-to-talk — press and hold, release to stop + send
 *
 * CLICK OUTCOMES:
 * Tap orb → toggle listening on/off
 * Long press → hold-to-talk mode (release sends accumulated text)
 * Cmd/Ctrl+Shift+K → keyboard shortcut to toggle
 *
 * DATA FLOW:
 * Props In:  { onTranscript, onInterimTranscript?, holdToTalk?, disabled?, autoSend?, onAutoSend? }
 * State:     { listening, supported, interim }
 * API:       Web Speech API (SpeechRecognition)
 * Events:    onTranscript(finalText), onAutoSend(fullSessionText)
 *
 * AUTO-SEND FLOW:
 * User taps orb → listening starts → final transcripts accumulate →
 * User taps orb again (or speech ends) → recognition.onend fires →
 * 750ms delay → onAutoSend(fullSessionText) fires → parent sends message
 *
 * ARCHITECTURE:
 * graph TD
 *   Drawer[AIAssistantDrawer] --> Orb[DictationOrb]
 *   Orb -->|Web Speech API| Browser
 *   Orb -->|onTranscript| Drawer
 *
 * V3 Fixes:
 * - Memory leak: nullify recognitionRef + clean all handlers on unmount
 * - Interim transcript preview bubble
 * - ARIA live regions for screen reader announcements
 * - prefers-reduced-motion respected
 *
 * NOTE: 387 lines — exceeds 300-line rule. TODO: extract styled
 * components to DictationOrbStyles.ts and hook to useDictation.ts
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Mic, MicOff } from 'lucide-react';
import { logger } from '@/utils/logger';

// ── Crystalline Swan Theme Tokens ──────────────────────────────────────────
const CS = {
  wingPurple: '#8B5CF6',
  wingPurpleAlpha15: 'rgba(139, 92, 246, 0.15)',
  wingPurpleAlpha08: 'rgba(139, 92, 246, 0.08)',
  wingPurpleAlpha04: 'rgba(139, 92, 246, 0.04)',
  wingPurpleAlpha03: 'rgba(139, 92, 246, 0.3)',
  wingPurpleAlpha04Pulse: 'rgba(139, 92, 246, 0.4)',
  wingPurpleAlpha08Pulse: 'rgba(139, 92, 246, 0.8)',
  midnightSapphire95: 'rgba(0, 32, 96, 0.95)',
  glassOverlayStrong: 'rgba(0, 32, 96, 0.85)',
  frostWhite: '#E0ECF4',
  textOnGlass: '#E0ECF4',
  inactiveText: '#E0ECF4',
  glassBorder: 'rgba(224, 236, 244, 0.3)',
  glassBg: 'rgba(0, 32, 96, 0.85)',
};

// ── Animations ─────────────────────────────────────────────────────────────

// Opus CEO Ruling: crystallinePulse breathing animation (Gemini consensus Round 4)
const crystallinePulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.6); }
  70% { box-shadow: 0 0 0 16px rgba(139, 92, 246, 0); }
  100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); }
`;

const waveBar = keyframes`
  0%, 100% { height: 4px; }
  50% { height: 16px; }
`;

// ── Styled Components ──────────────────────────────────────────────────────

const OrbWrapper = styled.div`
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
`;

const OrbButton = styled.button<{ $listening: boolean; $unavailable?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  line-height: 1;
  border-radius: 50%;
  border: 2px solid ${({ $listening }) => $listening ? CS.wingPurple : CS.glassBorder};
  background: ${({ $listening }) => $listening ? CS.wingPurple : CS.glassOverlayStrong};
  color: ${({ $listening }) => $listening ? CS.frostWhite : CS.textOnGlass};
  ${({ $listening }) => $listening ? `box-shadow: 0 0 24px rgba(139, 92, 246, 0.4);` : ''}
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  opacity: ${({ $unavailable }) => $unavailable ? 0.4 : 1};

  @media (prefers-reduced-motion: no-preference) {
    animation: ${({ $listening }) => $listening ? css`${crystallinePulse} 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite` : 'none'};
  }

  &:hover:not(:disabled) {
    border-color: ${CS.wingPurple};
    color: ${CS.wingPurple};
    background: ${CS.wingPurpleAlpha08};
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${CS.wingPurple};
    outline-offset: 2px;
  }
`;

const WaveformContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 20px;
  margin-top: 4px;
`;

const WaveBarEl = styled.div<{ $delay: number }>`
  width: 3px;
  border-radius: 2px;
  background: ${CS.wingPurple};

  @media (prefers-reduced-motion: no-preference) {
    animation: ${waveBar} 0.8s ease-in-out ${({ $delay }) => $delay}s infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    height: 8px;
  }
`;

const InterimBubble = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: ${CS.midnightSapphire95};
  border: 1px solid ${CS.wingPurpleAlpha03};
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 0.8rem;
  color: ${CS.frostWhite};
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  backdrop-filter: blur(8px);
  z-index: 10;
`;

const LiveStatus = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
`;

// ── Types ──────────────────────────────────────────────────────────────────

interface DictationOrbProps {
  onTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  /** If true, hold-to-talk mode: press=start, release=stop+send */
  holdToTalk?: boolean;
  disabled?: boolean;
  /** If true, auto-send final transcript when speech ends (default: true) */
  autoSend?: boolean;
  /** Called with complete transcript text when auto-send fires */
  onAutoSend?: (text: string) => void;
}

// ── Component ──────────────────────────────────────────────────────────────

const DictationOrb: React.FC<DictationOrbProps> = ({
  onTranscript,
  onInterimTranscript,
  holdToTalk = false,
  disabled = false,
  autoSend = true,
  onAutoSend,
}) => {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [micBlocked, setMicBlocked] = useState(false);
  const [interim, setInterim] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const holdingRef = useRef(false);
  const accumulatedRef = useRef('');

  // Tracks all final transcript text accumulated during a tap-to-toggle session
  // so auto-send can fire the complete dictation when speech ends
  const sessionAccumulatedRef = useRef('');

  // Timer ref for delayed auto-send (gives speech API time to finalize last words)
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use refs for values accessed inside recognition callbacks and keyboard handler
  // to avoid stale closures and unnecessary recognition recreation
  const holdToTalkRef = useRef(holdToTalk);
  const onTranscriptRef = useRef(onTranscript);
  const onInterimTranscriptRef = useRef(onInterimTranscript);
  const disabledRef = useRef(disabled);
  const autoSendRef = useRef(autoSend);
  const onAutoSendRef = useRef(onAutoSend);

  useEffect(() => { holdToTalkRef.current = holdToTalk; }, [holdToTalk]);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onInterimTranscriptRef.current = onInterimTranscript; }, [onInterimTranscript]);
  useEffect(() => { disabledRef.current = disabled; }, [disabled]);
  useEffect(() => { autoSendRef.current = autoSend; }, [autoSend]);
  useEffect(() => { onAutoSendRef.current = onAutoSend; }, [onAutoSend]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        const trimmedFinal = finalTranscript.trim();
        if (holdToTalkRef.current) {
          // Deduplicate: Web Speech API can fire duplicate result events
          if (trimmedFinal && !accumulatedRef.current.endsWith(trimmedFinal)) {
            accumulatedRef.current += (accumulatedRef.current ? ' ' : '') + trimmedFinal;
          }
        } else {
          onTranscriptRef.current(trimmedFinal);

          // Track accumulated session text for auto-send in tap-to-toggle mode
          if (trimmedFinal) {
            sessionAccumulatedRef.current += (sessionAccumulatedRef.current ? ' ' : '') + trimmedFinal;
          }
        }
      }

      if (interimTranscript) {
        setInterim(interimTranscript);
        onInterimTranscriptRef.current?.(interimTranscript);
      } else {
        setInterim('');
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setListening(false);
      setInterim('');
      holdingRef.current = false;
      if (event.error === 'not-allowed' || event.error === 'audio-capture') {
        setMicBlocked(true);
        logger.warn('Microphone permission denied — enable in browser settings');
      }
      // no-speech, network, aborted, service-not-allowed — silently return to idle (no alarming UI)
    };

    recognition.onend = () => {
      setListening(false);
      setInterim('');

      if (holdToTalkRef.current && accumulatedRef.current) {
        // Hold-to-talk: send accumulated text via onTranscript (existing behavior)
        // and also auto-send if enabled
        const accumulated = accumulatedRef.current;
        accumulatedRef.current = '';
        onTranscriptRef.current(accumulated);

        if (autoSendRef.current && onAutoSendRef.current && accumulated.trim()) {
          // Small delay to let the transcript populate the input field first
          setTimeout(() => {
            onAutoSendRef.current?.(accumulated.trim());
          }, 300);
        }
      } else if (!holdToTalkRef.current && autoSendRef.current && onAutoSendRef.current) {
        // Tap-to-toggle mode: auto-send the full session transcript
        const sessionText = sessionAccumulatedRef.current.trim();
        sessionAccumulatedRef.current = '';

        if (sessionText) {
          // 750ms delay after speech ends — catches trailing final words from the
          // speech API and gives the user a moment to see what was transcribed
          autoSendTimerRef.current = setTimeout(() => {
            autoSendTimerRef.current = null;
            onAutoSendRef.current?.(sessionText);
          }, 750);
        }
      }
    };

    recognitionRef.current = recognition;

    // V3 Fix: Full cleanup to prevent memory leaks
    return () => {
      recognition.abort();
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognitionRef.current = null;
      // Clear any pending auto-send timer
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
        autoSendTimerRef.current = null;
      }
    };
  }, []); // No deps — recognition created once, refs handle changing values

  const startListening = useCallback(() => {
    if (!recognitionRef.current || disabledRef.current) return;
    try {
      accumulatedRef.current = '';
      sessionAccumulatedRef.current = '';
      // Cancel any pending auto-send from a previous session
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
        autoSendTimerRef.current = null;
      }
      recognitionRef.current.start();
      setListening(true);
    } catch {
      // Already started
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setListening(false);
    setInterim('');
  }, []);

  const toggleListening = useCallback(() => {
    // Use functional setState to avoid stale `listening` closure
    setListening(prev => {
      if (prev) {
        recognitionRef.current?.stop();
        setInterim('');
        // Note: auto-send logic runs in recognition.onend handler
        return false;
      } else {
        if (!recognitionRef.current || disabledRef.current) return false;
        try {
          accumulatedRef.current = '';
          sessionAccumulatedRef.current = '';
          // Cancel any pending auto-send from a previous session
          if (autoSendTimerRef.current) {
            clearTimeout(autoSendTimerRef.current);
            autoSendTimerRef.current = null;
          }
          recognitionRef.current.start();
          return true;
        } catch {
          return false;
        }
      }
    });
  }, []);

  // Keyboard shortcut: Cmd/Ctrl+Shift+K (stable — no deps that change)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        if (!disabledRef.current && recognitionRef.current) {
          toggleListening();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleListening]);

  // Hold-to-talk handlers (use refs to avoid stale closures)
  const handlePointerDown = useCallback(() => {
    if (!holdToTalkRef.current || disabledRef.current) return;
    holdingRef.current = true;
    startListening();
  }, [startListening]);

  const handlePointerUp = useCallback(() => {
    if (!holdToTalkRef.current || !holdingRef.current) return;
    holdingRef.current = false;
    stopListening();
  }, [stopListening]);

  if (!supported) return null;

  const isHoldMode = holdToTalk;
  const isUnavailable = micBlocked && !listening;

  return (
    <OrbWrapper>
      {/* Interim transcript preview bubble */}
      {listening && interim && (
        <InterimBubble aria-hidden="true">
          {interim}
        </InterimBubble>
      )}

      <OrbButton
        type="button"
        onClick={isHoldMode ? undefined : toggleListening}
        onPointerDown={isHoldMode ? handlePointerDown : undefined}
        onPointerUp={isHoldMode ? handlePointerUp : undefined}
        onPointerLeave={isHoldMode ? handlePointerUp : undefined}
        $listening={listening}
        $unavailable={isUnavailable}
        disabled={disabled}
        aria-label={
          isUnavailable
            ? 'Microphone unavailable — check browser permissions'
            : listening ? 'Stop dictation' : (isHoldMode ? 'Hold to dictate' : 'Start dictation')
        }
        aria-pressed={listening}
        aria-describedby="dictation-orb-status"
        title={
          isUnavailable
            ? 'Mic blocked — click to retry or check browser permissions'
            : listening
              ? 'Listening... ' + (isHoldMode ? 'release to send' : 'tap to stop')
              : (isHoldMode ? 'Hold to dictate' : 'Tap to dictate (Ctrl+Shift+K)')
        }
      >
        {isUnavailable ? <MicOff size={20} /> : listening ? <MicOff size={20} /> : <Mic size={20} />}
      </OrbButton>

      {/* Waveform indicator when listening */}
      {listening && (
        <WaveformContainer aria-hidden="true">
          {[0, 0.15, 0.3, 0.45, 0.6].map((delay, i) => (
            <WaveBarEl key={i} $delay={delay} />
          ))}
        </WaveformContainer>
      )}

      {/* ARIA live region for screen reader announcements */}
      <LiveStatus
        id="dictation-orb-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {listening ? 'Listening for voice input...' : ''}
      </LiveStatus>
    </OrbWrapper>
  );
};

export default DictationOrb;
