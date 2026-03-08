/**
 * DictationOrb
 * ============
 * Voice-to-text input button using Web Speech API.
 * Pulses with a cyan glow when actively listening.
 * Falls back gracefully when speech API isn't available.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { Mic, MicOff } from 'lucide-react';

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(0, 255, 255, 0.4); }
  50% { box-shadow: 0 0 24px rgba(0, 255, 255, 0.8), 0 0 48px rgba(0, 255, 255, 0.3); }
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
  border: 2px solid ${({ $listening }) => $listening ? '#00FFFF' : 'rgba(255, 255, 255, 0.15)'};
  background: ${({ $listening }) => $listening ? 'rgba(0, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)'};
  color: ${({ $listening }) => $listening ? '#00FFFF' : '#94a3b8'};
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  animation: ${({ $listening }) => $listening ? pulse : 'none'} 1.5s ease-in-out infinite;

  &:hover:not(:disabled) {
    border-color: #00FFFF;
    color: #00FFFF;
    background: rgba(0, 255, 255, 0.08);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

interface DictationOrbProps {
  onTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  disabled?: boolean;
}

const DictationOrb: React.FC<DictationOrbProps> = ({ onTranscript, onInterimTranscript, disabled = false }) => {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
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

      if (finalTranscript) onTranscript(finalTranscript);
      if (interimTranscript && onInterimTranscript) onInterimTranscript(interimTranscript);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [onTranscript, onInterimTranscript]);

  const toggle = useCallback(() => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  }, [listening]);

  if (!supported) return null;

  return (
    <OrbButton
      type="button"
      onClick={toggle}
      $listening={listening}
      disabled={disabled}
      aria-label={listening ? 'Stop dictation' : 'Start dictation'}
      title={listening ? 'Listening... tap to stop' : 'Tap to dictate'}
    >
      {listening ? <MicOff size={20} /> : <Mic size={20} />}
    </OrbButton>
  );
};

export default DictationOrb;
