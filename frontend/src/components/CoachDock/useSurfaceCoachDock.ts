/**
 * HOOK: useSurfaceCoachDock (CC-3b — the generalized Swan Coach dock)
 * ------------------------------------------------------------------
 * Extraction of the SHIPPED planner dock (useWorkoutPlannerCoachDock) into the one
 * surface-parameterized dock engine: dictation streams finals into the dock textarea,
 * Send routes through the ONE existing command lane (`useCoachCommand.executeCommand`)
 * with the caller's `surface`, non-commands fall back to the chat lane, and every
 * outcome renders as a truthful receipt row. No new transport (blueprint 06-bans §1).
 * The planner keeps a thin wrapper with an IDENTICAL public API — its regression
 * suite is the refactor gate. Bootcamp (CC-3) and Pain Chart (CC-4) consume this.
 */
import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { commandErrorReceiptText, useCoachCommand } from '../../hooks/useCoachCommand';
import { useAIChat } from '../../hooks/useAIChat';
import VoiceRecordingOverlay from '../DashBoard/Pages/coach-assistant/VoiceRecordingOverlay';
import {
  useCoachBrowserSpeechInput,
  type CoachSpeechRuntimeFailure,
} from '../DashBoard/Pages/coach-assistant/hooks/useCoachBrowserSpeechInput';

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

/** Per-surface shared receipt sinks so a surface's dock and its AI-event executor share one feed. */
const sinks = new Map<string, Set<ReceiptListener>>();
const sinkFor = (surface: string): Set<ReceiptListener> => {
  let set = sinks.get(surface);
  if (!set) { set = new Set(); sinks.set(surface, set); }
  return set;
};

export function pushSurfaceCoachReceipt(surface: string, receipt: CoachDockReceiptInput): void {
  sinkFor(surface).forEach((listener) => listener(receipt));
}

function isRecorderSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return typeof window.MediaRecorder !== 'undefined'
    && typeof navigator.mediaDevices?.getUserMedia === 'function';
}

export interface UseSurfaceCoachDockArgs {
  /** Command-lane surface token (rides the allowlisted routeContext channel). */
  surface: 'workout-planner' | 'workout-logger' | 'bootcamp-builder' | 'pain-chart';
  /** Chat-lane conversation title for the fallback path. */
  chatTitle: string;
  /** Dispatch-event prefix whose receipts the surface's OWN executor pushes (avoid double-report). */
  eventPrefix: string;
  /** Client context; pass null for class-level surfaces (bootcamp). */
  selectedClientId: number | null;
  /** When true (planner default), Send is a no-op without a selected client. */
  requireClient?: boolean;
  pushReceipt: (r: CoachDockReceiptInput) => void;
}

export function useSurfaceCoachDock({
  surface, chatTitle, eventPrefix, selectedClientId, requireClient = true, pushReceipt,
}: UseSurfaceCoachDockArgs) {
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
      const entry: CoachDockReceipt = { id: `coach-dock-receipt-${surface}-${receiptIdRef.current}`, ...receipt };
      setReceipts((prev) => [...prev.slice(-(MAX_RECEIPTS - 1)), entry]);
    };
    const sink = sinkFor(surface);
    sink.add(listener);
    return () => { sink.delete(listener); };
  }, [surface]);

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
    if (!trimmed || submitting || (requireClient && selectedClientId == null)) return;
    setDockTextState('');
    setSubmitting(true);
    try {
      const result = await executeCommand(trimmed, { selectedClientId, surface });
      if (result.type === 'error') {
        // Server errors (RBAC, validation) pass through verbatim — only a
        // transport failure reads as "unreachable" (R1 honesty fix).
        pushReceipt({ ok: false, text: commandErrorReceiptText(result.error) });
        return;
      }
      if (result.type === 'frontend_dispatch') {
        // Surface-family receipts are pushed (success OR failure) by the surface's
        // own AI-events executor, mounted with this dock — avoid double-report.
        if (!result.event.startsWith(eventPrefix)) {
          pushReceipt({ ok: result.dispatched, text: result.message });
        }
        return;
      }
      if (result.type === 'fallback_to_chat') {
        const response = await chat.sendMessageWithConversation(
          trimmed, 'coach_assistant', chatTitle, selectedClientId, 'both',
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
  }, [chat, chatTitle, dockText, eventPrefix, executeCommand, pushReceipt, requireClient, selectedClientId, submitting, surface]);

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
