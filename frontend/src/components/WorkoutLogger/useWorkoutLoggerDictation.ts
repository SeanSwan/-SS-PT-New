/**
 * HOOK: useWorkoutLoggerDictation
 * Parent: WorkoutLogger (blueprint dictation-planner-logger S4).
 * PURPOSE: Mic state + command submit for dictated set logging. Speech finals
 * stream into `text` (interim stays a hint); Send routes through the ONE
 * command lane with surface:'workout-logger' so the five existing AI_*
 * FRONTEND_DISPATCH commands (already consumed by useWorkoutAiEvents) mutate
 * the form. NO chat fallback here — command-or-honest-failure only
 * (06-bans §8); non-commands return the exact 02 §D receipt sentence.
 */
import { useCallback, useState } from 'react';
import { useCoachCommand } from '../../hooks/useCoachCommand';
import {
  useCoachBrowserSpeechInput,
  type CoachSpeechRuntimeFailure,
} from '../DashBoard/Pages/coach-assistant/hooks/useCoachBrowserSpeechInput';

export interface LoggerDictationReceipt { ok: boolean; text: string }

const LANE_DOWN = 'Swan Coach is unreachable — try again.';

export function useWorkoutLoggerDictation({ clientId }: { clientId: number | null }): {
  active: boolean; toggle: () => void; interim: string;
  text: string; setText: (t: string) => void;
  submitting: boolean; send: () => Promise<void>;
  receipt: LoggerDictationReceipt | null;
  listening: boolean; stopListening: () => void;
} {
  const [active, setActive] = useState(false);
  const [text, setTextState] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<LoggerDictationReceipt | null>(null);
  const { executeCommand } = useCoachCommand();

  const handleSpeechUnavailable = useCallback((failure: CoachSpeechRuntimeFailure) => {
    setReceipt({ ok: false, text: failure.message });
  }, []);
  const setVoiceError = useCallback(() => { /* failures surface via receipt above */ }, []);

  const speech = useCoachBrowserSpeechInput({
    onRuntimeUnavailable: handleSpeechUnavailable,
    setInputError: setVoiceError,
    setText: setTextState,
  });

  const toggle = useCallback(() => {
    if (active) {
      if (speech.listening) speech.toggleListening();
      setActive(false);
      setTextState('');
      setReceipt(null);
      return;
    }
    setActive(true);
    setReceipt(null);
    if (speech.speechSupported && !speech.listening) speech.toggleListening();
    if (!speech.speechSupported) {
      setReceipt({ ok: false, text: 'Voice input is not available in this browser — type the entry instead.' });
    }
  }, [active, speech]);

  const stopListening = useCallback(() => {
    if (speech.listening) speech.toggleListening();
  }, [speech]);

  const send = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    if (speech.listening) speech.toggleListening();
    setSubmitting(true);
    setReceipt(null);
    try {
      const result = await executeCommand(trimmed, {
        selectedClientId: clientId ?? undefined,
        surface: 'workout-logger',
      });
      if (result.type === 'error') {
        setReceipt({ ok: false, text: LANE_DOWN });
        return;
      }
      if (result.type === 'fallback_to_chat') {
        // Logger dictation is command-or-honest-failure only — no chat lane.
        setReceipt({ ok: false, text: `I heard "${trimmed}" — try naming the exercise and set number.` });
        return;
      }
      if (result.type === 'frontend_dispatch') {
        setReceipt({ ok: result.dispatched, text: result.message });
        if (result.dispatched) setTextState('');
        return;
      }
      // confirmation_required / executed / not_wired / debate_started —
      // surface the lane's own sentence honestly.
      const message = 'message' in result && typeof result.message === 'string' && result.message
        ? result.message
        : `Done — ${('command' in result && result.command) ? String(result.command).replace(/_/g, ' ') : 'command handled'}.`;
      setReceipt({ ok: result.type === 'executed' || result.type === 'debate_started', text: message });
    } finally {
      setSubmitting(false);
    }
  }, [clientId, executeCommand, speech, submitting, text]);

  return {
    active,
    toggle,
    interim: speech.interim,
    text,
    setText: useCallback((t: string) => setTextState(t), []),
    submitting,
    send,
    receipt,
    listening: speech.listening,
    stopListening,
  };
}
