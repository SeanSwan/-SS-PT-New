/**
 * HOOK: useWorkoutPlannerCoachDock
 * PURPOSE: State + transport for the planner's Swan Coach dock. Dictation
 * streams finals into the dock textarea (interim stays a hint); Send routes
 * through the ONE existing command lane (`useCoachCommand.executeCommand`)
 * with `surface: 'workout-planner'`; non-commands fall back to the chat lane
 * (`useAIChat.sendMessageWithConversation`) and the reply renders as a
 * receipt row. No new transport is created here (blueprint 06-bans §1).
 *
 * Receipt channel: `pushWorkoutPlannerCoachReceipt` is the shared sink the
 * page hands to BOTH this hook and `useWorkoutPlannerAiEvents`, so dictated
 * plan-edit receipts land in the same dock feed. The hook subscribes while
 * mounted and owns the rendered `receipts` list.
 */
import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { commandErrorReceiptText, useCoachCommand } from '../../../../hooks/useCoachCommand';
import { useAIChat } from '../../../../hooks/useAIChat';
import VoiceRecordingOverlay from '../coach-assistant/VoiceRecordingOverlay';
import {
  useCoachBrowserSpeechInput,
  type CoachSpeechRuntimeFailure,
} from '../coach-assistant/hooks/useCoachBrowserSpeechInput';

/** One-tap follow-up rendered on a receipt row (e.g. Undo a rearrangement). */
export interface CoachDockReceiptAction {
  label: string;
  eventName: string;
  payload?: Record<string, unknown>;
}
export interface CoachDockReceiptInput { ok: boolean; text: string; action?: CoachDockReceiptAction }
export interface CoachDockReceipt extends CoachDockReceiptInput { id: string }

const COACH_UNREACHABLE = 'Swan Coach is unreachable — try again.';
const MAX_RECEIPTS = 20;

type ReceiptListener = (receipt: CoachDockReceiptInput) => void;
const receiptListeners = new Set<ReceiptListener>();

/** Shared receipt sink for every planner Coach surface (dock + AI events). */
export function pushWorkoutPlannerCoachReceipt(receipt: CoachDockReceiptInput): void {
  receiptListeners.forEach((listener) => listener(receipt));
}

function isRecorderSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return typeof window.MediaRecorder !== 'undefined'
    && typeof navigator.mediaDevices?.getUserMedia === 'function';
}

interface UseWorkoutPlannerCoachDockArgs {
  selectedClientId: number | null;
  pushReceipt: (r: CoachDockReceiptInput) => void;
}

export function useWorkoutPlannerCoachDock({ selectedClientId, pushReceipt }: UseWorkoutPlannerCoachDockArgs) {
  const [open, setOpen] = useState(false);
  const [dockText, setDockTextState] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipts, setReceipts] = useState<CoachDockReceipt[]>([]);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const receiptIdRef = useRef(0);
  const { executeCommand } = useCoachCommand();
  const chat = useAIChat();

  useEffect(() => {
    const listener: ReceiptListener = (receipt) => {
      receiptIdRef.current += 1;
      const entry: CoachDockReceipt = { id: `coach-dock-receipt-${receiptIdRef.current}`, ...receipt };
      setReceipts((prev) => [...prev.slice(-(MAX_RECEIPTS - 1)), entry]);
    };
    receiptListeners.add(listener);
    return () => { receiptListeners.delete(listener); };
  }, []);

  const recorderSupported = isRecorderSupported();
  const handleSpeechUnavailable = useCallback((failure: CoachSpeechRuntimeFailure) => {
    if (recorderSupported && failure.canTryRecorder) {
      setOverlayOpen(true);
      return;
    }
    pushReceipt({ ok: false, text: failure.message });
  }, [pushReceipt, recorderSupported]);

  const setVoiceError = useCallback((error: string | null | ((prev: string | null) => string | null)) => {
    // Runtime failures already surface through handleSpeechUnavailable receipts.
    void error;
  }, []);

  const speech = useCoachBrowserSpeechInput({
    onRuntimeUnavailable: handleSpeechUnavailable,
    setInputError: setVoiceError,
    setText: setDockTextState,
  });

  const handleVoice = useCallback(() => {
    if (speech.speechSupported) { speech.toggleListening(); return; }
    if (recorderSupported) { setOverlayOpen(true); return; }
    pushReceipt({ ok: false, text: 'Voice input is not available in this browser.' });
  }, [pushReceipt, recorderSupported, speech]);

  const appendTranscribed = useCallback((text: string) => {
    const chunk = text.trim();
    if (chunk) setDockTextState((prev) => (prev ? `${prev} ${chunk}` : chunk));
    setOverlayOpen(false);
  }, []);

  const voiceOverlay: ReactNode = overlayOpen
    ? createElement(VoiceRecordingOverlay, {
      isOpen: overlayOpen,
      onClose: () => setOverlayOpen(false),
      onEditTranscript: appendTranscribed,
      onTranscribed: appendTranscribed,
    })
    : null;

  const handleSubmit = useCallback(async () => {
    const trimmed = dockText.trim();
    if (!trimmed || submitting || selectedClientId == null) return;
    setDockTextState('');
    setSubmitting(true);
    try {
      const result = await executeCommand(trimmed, { selectedClientId, surface: 'workout-planner' });
      if (result.type === 'error') {
        // Server errors (RBAC, validation) pass through verbatim — only a
        // transport failure reads as "unreachable" (R1 honesty fix).
        pushReceipt({ ok: false, text: commandErrorReceiptText(result.error) });
        return;
      }
      if (result.type === 'frontend_dispatch') {
        // AI_PLANNER_* receipts are pushed (success OR failure) by
        // useWorkoutPlannerAiEvents, which is always mounted with this dock —
        // repeating the generic transport message would double-report.
        if (!result.event.startsWith('AI_PLANNER_')) {
          pushReceipt({ ok: result.dispatched, text: result.message });
        }
        return;
      }
      if (result.type === 'fallback_to_chat') {
        const response = await chat.sendMessageWithConversation(
          trimmed, 'coach_assistant', 'Workout Planner Coach', selectedClientId, 'both',
        );
        if (!response || (typeof response === 'object' && 'failed' in response)) {
          pushReceipt({ ok: false, text: COACH_UNREACHABLE });
          return;
        }
        const content = typeof response === 'object' && 'content' in response
          ? String((response as { content: unknown }).content ?? '').trim() : '';
        pushReceipt({ ok: true, text: content || 'Swan Coach replied — open the Coach Command Center for the full conversation.' });
        return;
      }
      if (result.type === 'executed') {
        pushReceipt({ ok: true, text: `Done — ${result.command.replace(/_/g, ' ')}.` });
        return;
      }
      // confirmation_required / not_wired / debate_started — surface the lane's
      // own message honestly; confirmations belong to the Coach Command Center.
      pushReceipt({ ok: result.type === 'debate_started', text: result.message });
    } finally {
      setSubmitting(false);
    }
  }, [chat, dockText, executeCommand, pushReceipt, selectedClientId, submitting]);

  return {
    open,
    toggleOpen: useCallback(() => setOpen((prev) => !prev), []),
    dockText,
    setDockText: useCallback((t: string) => setDockTextState(t), []),
    listening: speech.listening,
    interim: speech.interim,
    handleVoice,
    voiceOverlay,
    submitting,
    handleSubmit,
    receipts,
  };
}
