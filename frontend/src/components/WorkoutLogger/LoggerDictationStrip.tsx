/**
 * COMPONENT: LoggerDictationStrip
 * Parent: WorkoutLogger (blueprint dictation-planner-logger S4, 02 §D).
 * PURPOSE: Slim strip above the exercise list while logger dictation is
 * active — listening hint (interim NEVER enters the editable value), the
 * dictated text for review, Stop/Send (≥44px), and the honest receipt
 * sentence from the command lane. Hidden entirely when inactive.
 */
import React from 'react';
import { Mic } from 'lucide-react';
import type { LoggerDictationReceipt } from './useWorkoutLoggerDictation';
import {
  StripBtn, StripGhostBtn, StripHint, StripInput, StripReceipt, StripWrap,
} from './LoggerDictationStrip.styles';

export interface LoggerDictationStripProps {
  active: boolean;
  listening: boolean;
  interim: string;
  text: string;
  setText: (t: string) => void;
  submitting: boolean;
  send: () => Promise<void> | void;
  stopListening: () => void;
  receipt: LoggerDictationReceipt | null;
}

const HINT_IDLE = 'say things like "leg press, set two, ninety pounds, eleven reps"';

const LoggerDictationStrip: React.FC<LoggerDictationStripProps> = ({
  active, listening, interim, text, setText, submitting, send, stopListening, receipt,
}) => {
  // L4 (Kimi-binding): a failed parse is never a dead end — the receipt itself becomes the
  // "tap to type" path, focusing the always-present text input. Chip, not error wall.
  const inputRef = React.useRef<HTMLInputElement>(null);
  if (!active) return null;

  return (
    <StripWrap role="group" aria-label="Dictate workout log entries">
      <Mic size={16} aria-hidden="true" />
      <StripHint aria-live="polite">
        {listening
          ? `listening… ${interim ? `"${interim}"` : HINT_IDLE}`
          : HINT_IDLE}
      </StripHint>
      <StripInput
        ref={inputRef}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') { event.preventDefault(); void send(); }
        }}
        placeholder="leg press, set two, ninety pounds…"
        aria-label="Dictated log entry"
      />
      <StripGhostBtn type="button" onClick={stopListening} disabled={!listening}>
        Stop
      </StripGhostBtn>
      <StripBtn
        type="button"
        onClick={() => { void send(); }}
        disabled={submitting || !text.trim()}
        aria-label="Send dictated entry to Swan Coach"
      >
        {submitting ? 'Working…' : 'Send'}
      </StripBtn>
      {receipt ? (
        receipt.ok ? (
          <StripReceipt $ok>
            <span aria-hidden="true">✓</span>
            {receipt.text}
          </StripReceipt>
        ) : (
          <StripReceipt
            as="button"
            type="button"
            $ok={false}
            aria-label={`${receipt.text} — tap to type instead`}
            onClick={() => inputRef.current?.focus()}
          >
            <span aria-hidden="true">✗</span>
            {receipt.text} — tap to type
          </StripReceipt>
        )
      ) : null}
    </StripWrap>
  );
};

export default LoggerDictationStrip;
