/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: CrystallineVoicePill                              ║
 * ║  PURPOSE: Hands-free voice UI for gym trainers with AirPods   ║
 * ║  OWNER: Claude Opus 4.6 (Gemini CTO design) | 2026-03-26     ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌──────────────────────────────────────────────────┐
 * │ Idle:       [ 🎤  Tap to speak ]  (muted glass)  │
 * │ Listening:  [ 🎤🔴 Listening... ████ ] (purple)  │
 * │ Processing: [ ⏳  Thinking... ]  (cyan pulse)     │
 * │ Speaking:   [ 🔊  Reading... ]  (green glow)      │
 * │ Error:      [ ⚠️  Tap to retry ] (crimson flash)  │
 * └──────────────────────────────────────────────────┘
 *
 * DESIGN: Frosted glass pill (Gemini CTO "Earcon + Glanceable Pill")
 * - Trainer glances down → sees color = knows state
 * - Single tap = toggle listening
 * - Long press = hold-to-talk mode
 * - Auto-sends transcript after 2s silence
 * - TTS reads AI response via useTextToSpeech
 *
 * CLICK-OUTCOMES:
 * [Tap pill] → Toggle voice listening on/off
 * [Long press] → Hold-to-talk mode (release sends)
 * [Tap while speaking] → Stop TTS readback
 * [Tap while error] → Retry last action
 *
 * DATA FLOW:
 * Props In:  { onTranscript, onAutoSend?, disabled?, compact? }
 * State:     { voiceState, interimText, silenceTimer }
 * API:       Web Speech API (SpeechRecognition)
 * Events:    onTranscript(finalText), onAutoSend(finalText)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Mic, MicOff, Loader, Volume2, AlertTriangle } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Types & Constants
// ─────────────────────────────────────────────────────────────

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error' | 'unavailable';

interface CrystallineVoicePillProps {
  /** Called with final transcript text */
  onTranscript: (text: string) => void;
  /** Called when auto-send triggers (2s silence). If not provided, uses onTranscript. */
  onAutoSend?: (text: string) => void;
  /** External speaking state (from TTS hook) */
  isSpeaking?: boolean;
  /** External processing state (from AI chat) */
  isProcessing?: boolean;
  /** Stop TTS callback */
  onStopSpeaking?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Compact mode (icon only, no label) */
  compact?: boolean;
}

/** Auto-send after this many ms of silence */
const SILENCE_TIMEOUT_MS = 2000;

const STATE_CONFIG: Record<VoiceState, { label: string; color: string; glow: string }> = {
  idle: {
    label: 'Tap to speak',
    color: 'var(--accent-primary, #60C0F0)',
    glow: 'transparent',
  },
  listening: {
    label: 'Listening...',
    color: '#8B5CF6',
    glow: 'rgba(139, 92, 246, 0.4)',
  },
  processing: {
    label: 'Thinking...',
    color: 'var(--accent-primary, #60C0F0)',
    glow: 'rgba(96, 192, 240, 0.3)',
  },
  speaking: {
    label: 'Reading...',
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.3)',
  },
  error: {
    label: 'Tap to retry',
    color: '#C92A54',
    glow: 'rgba(201, 42, 84, 0.3)',
  },
  unavailable: {
    label: 'Mic unavailable',
    color: 'rgba(224, 236, 244, 0.35)',
    glow: 'transparent',
  },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 var(--pill-glow); }
  50% { box-shadow: 0 0 20px 4px var(--pill-glow); }
`;

const spinLoader = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const waveBar = keyframes`
  0%, 100% { height: 4px; }
  50% { height: 14px; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const PillContainer = styled.button<{
  $state: VoiceState;
  $compact: boolean;
}>`
  --pill-color: ${({ $state }) => STATE_CONFIG[$state].color};
  --pill-glow: ${({ $state }) => STATE_CONFIG[$state].glow};

  display: inline-flex;
  align-items: center;
  gap: ${({ $compact }) => ($compact ? '0' : '8px')};
  padding: ${({ $compact }) => ($compact ? '0' : '8px 16px')};
  height: ${({ $compact }) => ($compact ? '44px' : '44px')};
  min-width: 44px;
  min-height: 44px;
  width: ${({ $compact }) => ($compact ? '44px' : 'auto')};
  border-radius: ${({ $compact }) => ($compact ? '50%' : '22px')};
  border: 1.5px solid
    ${({ $state }) =>
      $state === 'idle'
        ? 'var(--border-soft, rgba(96, 192, 240, 0.15))'
        : 'var(--pill-color)'};
  background: var(--bg-elevated, rgba(26, 26, 36, 0.85));
  backdrop-filter: blur(12px) saturate(120%);
  -webkit-backdrop-filter: blur(12px) saturate(120%);
  color: var(--pill-color);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  flex-shrink: 0;

  @supports not (backdrop-filter: blur(12px)) {
    background: var(--bg-elevated, #1A1A24);
  }

  @media (prefers-reduced-motion: no-preference) {
    ${({ $state }) =>
      ($state === 'listening' || $state === 'processing' || $state === 'speaking')
        ? css`animation: ${pulseGlow} 2s ease-in-out infinite;`
        : ''}
  }

  &:hover:not(:disabled) {
    border-color: var(--pill-color);
    background: color-mix(in srgb, var(--pill-color) 10%, var(--bg-elevated, #1A1A24));
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4),
      inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }
`;

const IconWrap = styled.span<{ $state: VoiceState }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;

  ${({ $state }) =>
    $state === 'processing'
      ? css`animation: ${spinLoader} 1s linear infinite;`
      : ''}
`;

const PillLabel = styled.span`
  font-family: 'Sora', 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  letter-spacing: 0.01em;
`;

const WaveformBar = styled.div<{ $delay: number }>`
  width: 3px;
  border-radius: 2px;
  background: currentColor;

  @media (prefers-reduced-motion: no-preference) {
    animation: ${waveBar} 0.8s ease-in-out ${({ $delay }) => $delay}s infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    height: 8px;
  }
`;

const WaveformGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  height: 16px;
  margin-left: 4px;
`;

const InterimOverlay = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-elevated, rgba(26, 26, 36, 0.95));
  border: 1px solid rgba(139, 92, 246, 0.25);
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 13px;
  color: var(--text-primary, #E0ECF4);
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  backdrop-filter: blur(8px);
  z-index: 10;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
`;

const PillWrapper = styled.div`
  position: relative;
  display: inline-flex;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const CrystallineVoicePill: React.FC<CrystallineVoicePillProps> = ({
  onTranscript,
  onAutoSend,
  isSpeaking = false,
  isProcessing = false,
  onStopSpeaking,
  disabled = false,
  compact = false,
}) => {
  const [localState, setLocalState] = useState<'idle' | 'listening' | 'error' | 'unavailable'>('idle');
  const [interim, setInterim] = useState('');
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedRef = useRef('');
  const onAutoSendRef = useRef(onAutoSend);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => { onAutoSendRef.current = onAutoSend; }, [onAutoSend]);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);

  // Derive visual state from local + external states
  const voiceState: VoiceState = isSpeaking
    ? 'speaking'
    : isProcessing
      ? 'processing'
      : localState;

  const config = STATE_CONFIG[voiceState];

  // Clear silence timer
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // Auto-send accumulated text after silence
  const scheduleSilenceSend = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      const text = accumulatedRef.current.trim();
      if (text) {
        const sender = onAutoSendRef.current || onTranscriptRef.current;
        sender(text);
        accumulatedRef.current = '';
        setInterim('');
        // Stop listening after auto-send
        recognitionRef.current?.stop();
      }
    }, SILENCE_TIMEOUT_MS);
  }, [clearSilenceTimer]);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
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
        const trimmed = finalTranscript.trim();
        if (trimmed && !accumulatedRef.current.endsWith(trimmed)) {
          accumulatedRef.current += (accumulatedRef.current ? ' ' : '') + trimmed;
        }
        // Reset silence timer — user just finished a phrase
        scheduleSilenceSend();
      }

      if (interimTranscript) {
        setInterim(interimTranscript);
        // Reset silence timer — still talking
        clearSilenceTimer();
      } else if (!finalTranscript) {
        setInterim('');
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      clearSilenceTimer();
      setInterim('');
      if (event.error === 'not-allowed' || event.error === 'audio-capture') {
        // Permanent issue — mic blocked or no mic hardware. Show subtle disabled state, not alarming error.
        setLocalState('unavailable');
      } else if (event.error !== 'aborted') {
        // Transient error — show retry state
        setLocalState('error');
      }
    };

    recognition.onend = () => {
      setLocalState((prev) => (prev === 'listening' ? 'idle' : prev === 'unavailable' ? 'unavailable' : prev));
      setInterim('');
      // If there's accumulated text and timer hasn't fired, send it now
      if (accumulatedRef.current.trim()) {
        clearSilenceTimer();
        const sender = onAutoSendRef.current || onTranscriptRef.current;
        sender(accumulatedRef.current.trim());
        accumulatedRef.current = '';
      }
    };

    recognitionRef.current = recognition;

    return () => {
      clearSilenceTimer();
      recognition.abort();
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognitionRef.current = null;
    };
  }, [scheduleSilenceSend, clearSilenceTimer]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || disabled) return;
    try {
      accumulatedRef.current = '';
      setInterim('');
      setLocalState('listening');
      recognitionRef.current.start();
    } catch {
      // Already started — ignore
    }
  }, [disabled]);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    recognitionRef.current?.stop();
    setLocalState('idle');
    setInterim('');
  }, [clearSilenceTimer]);

  const handleClick = useCallback(() => {
    // If TTS is speaking, stop it
    if (isSpeaking && onStopSpeaking) {
      onStopSpeaking();
      return;
    }

    // If mic unavailable (permission denied / no hardware), explain gently
    if (localState === 'unavailable') {
      // Try again — browser may re-prompt for permission
      startListening();
      return;
    }

    // If error, retry → go to idle
    if (localState === 'error') {
      setLocalState('idle');
      return;
    }

    // If processing, ignore
    if (isProcessing) return;

    // Toggle listening
    if (localState === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  }, [isSpeaking, onStopSpeaking, localState, isProcessing, stopListening, startListening]);

  if (!supported) return null;

  const stateIcon = () => {
    switch (voiceState) {
      case 'listening':
        return <MicOff size={18} />;
      case 'processing':
        return <Loader size={18} />;
      case 'speaking':
        return <Volume2 size={18} />;
      case 'error':
        return <AlertTriangle size={18} />;
      case 'unavailable':
        return <MicOff size={18} />;
      default:
        return <Mic size={18} />;
    }
  };

  return (
    <PillWrapper>
      {/* Interim transcript overlay */}
      {voiceState === 'listening' && (interim || accumulatedRef.current) && (
        <InterimOverlay aria-hidden="true">
          {accumulatedRef.current ? accumulatedRef.current + ' ' : ''}
          {interim && <em style={{ opacity: 0.6 }}>{interim}</em>}
        </InterimOverlay>
      )}

      <PillContainer
        type="button"
        onClick={handleClick}
        $state={voiceState}
        $compact={compact}
        disabled={disabled}
        aria-label={voiceState === 'unavailable' ? 'Microphone unavailable — check browser permissions' : config.label}
        aria-pressed={voiceState === 'listening'}
        title={voiceState === 'unavailable' ? 'Mic blocked — click to retry or check browser permissions' : config.label}
      >
        <IconWrap $state={voiceState}>{stateIcon()}</IconWrap>

        {!compact && <PillLabel>{config.label}</PillLabel>}

        {/* Waveform bars when listening */}
        {voiceState === 'listening' && (
          <WaveformGroup aria-hidden="true">
            {[0, 0.12, 0.24, 0.36].map((delay, i) => (
              <WaveformBar key={i} $delay={delay} />
            ))}
          </WaveformGroup>
        )}
      </PillContainer>

      {/* ARIA live region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
      >
        {voiceState === 'listening' ? 'Voice input active. Speak your command.' : ''}
        {voiceState === 'processing' ? 'Processing your request...' : ''}
        {voiceState === 'speaking' ? 'Reading response aloud.' : ''}
      </div>
    </PillWrapper>
  );
};

export default CrystallineVoicePill;
