/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

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
 * Props In:  { onTranscript, disabled?, holdToTalk? }
 * State:     { listening, supported, interim }
 * API:       Web Speech API (SpeechRecognition)
 * Events:    onTranscript(finalText)
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

const OrbButton = styled.button<{ $listening: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
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

// ── Types ──────────────────────────────────────────────────────────────────

interface DictationOrbProps {
  onTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  /** If true, hold-to-talk mode: press=start, release=stop+send */
  holdToTalk?: boolean;
  disabled?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────

const DictationOrb: React.FC<DictationOrbProps> = ({
  onTranscript,
  onInterimTranscript,
  holdToTalk = false,
  disabled = false,
}) => {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [interim, setInterim] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const holdingRef = useRef(false);
  const accumulatedRef = useRef('');

  // Use refs for values accessed inside recognition callbacks and keyboard handler
  // to avoid stale closures and unnecessary recognition recreation
  const holdToTalkRef = useRef(holdToTalk);
  const onTranscriptRef = useRef(onTranscript);
  const onInterimTranscriptRef = useRef(onInterimTranscript);
  const disabledRef = useRef(disabled);

  useEffect(() => { holdToTalkRef.current = holdToTalk; }, [holdToTalk]);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onInterimTranscriptRef.current = onInterimTranscript; }, [onInterimTranscript]);
  useEffect(() => { disabledRef.current = disabled; }, [disabled]);

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
      if (event.error === 'not-allowed') {
        logger.warn('Microphone permission denied — enable in browser settings');
      }
    };

    recognition.onend = () => {
      setListening(false);
      setInterim('');

      if (holdToTalkRef.current && accumulatedRef.current) {
        onTranscriptRef.current(accumulatedRef.current);
        accumulatedRef.current = '';
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
    };
  }, []); // No deps — recognition created once, refs handle changing values

  const startListening = useCallback(() => {
    if (!recognitionRef.current || disabledRef.current) return;
    try {
      accumulatedRef.current = '';
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
        return false;
      } else {
        if (!recognitionRef.current || disabledRef.current) return false;
        try {
          accumulatedRef.current = '';
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
        disabled={disabled}
        aria-label={listening ? 'Stop dictation' : (isHoldMode ? 'Hold to dictate' : 'Start dictation')}
        aria-pressed={listening}
        aria-describedby="dictation-orb-status"
        title={
          listening
            ? 'Listening... ' + (isHoldMode ? 'release to send' : 'tap to stop')
            : (isHoldMode ? 'Hold to dictate' : 'Tap to dictate (Ctrl+Shift+K)')
        }
      >
        {listening ? <MicOff size={20} /> : <Mic size={20} />}
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
      <div
        id="dictation-orb-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
      >
        {listening ? 'Listening for voice input...' : ''}
      </div>
    </OrbWrapper>
  );
};

export default DictationOrb;
