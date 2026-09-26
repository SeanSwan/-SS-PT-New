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
 *
 * MIC LANES (2026-09-26). Both lanes are now INLINE — there is no recorder modal.
 * Browser dictation was always inline. The MediaRecorder fallback used to open
 * `VoiceRecordingOverlay`, which made the speaker walk record → Stop & Send →
 * preview → Send/Edit → composer → Send for one sentence, and made the surface
 * dock the only remaining consumer of the overlay. It now runs through the SAME
 * `useCoachInlineRecorder` lane that PR 131 gave the coach console and the
 * workspace composer, so all three share one staging policy and one admission story.
 *
 * Deliberately NOT ported: the coach console's `CoachVoiceLevelMeter`. Its styles
 * live in `CoachCommandCenter.voiceStripStyles.ts` and are built on `--coach-*`
 * tokens that only the coach console injects, so mounting it on the planner /
 * bootcamp / pain-chart surfaces would render an unstyled widget. Phase and
 * outcome are reported textually through `voiceStatus` instead; a themed meter
 * for the surface docks is a separate styling task.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { commandErrorReceiptText, useCoachCommand } from '../../hooks/useCoachCommand';
import { commandInputMode, mergeTypedDraftOrigin, mergeVoiceCaptureOrigin, type CoachInputOrigin } from '../../hooks/coachInputOrigin';
import { useAIChat } from '../../hooks/useAIChat';
import { useCoachInlineRecorder } from '../DashBoard/Pages/coach-assistant/hooks/useCoachInlineRecorder';
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

export type ConfirmationTier = 'fire_and_forget' | 'read_back' | 'deliberate' | 'refusal';

/** What the dock needs to render the sheet in place (card 1.3). */
export interface PendingConfirmation {
  operationId: string;
  tier: ConfirmationTier;
  physical: boolean;
  isDestructive: boolean;
  affectedCount: number;
  /** Kept so a burned/expired approval can be re-issued without re-typing. */
  sourceMessage: string;
}

export function useSurfaceCoachDock({
  surface, chatTitle, eventPrefix, selectedClientId, requireClient = true, pushReceipt,
}: UseSurfaceCoachDockArgs) {
  const [open, setOpen] = useState(false);
  const [dockText, setDockTextState] = useState('');
  const [inputOrigin, setInputOrigin] = useState<CoachInputOrigin>('unknown');
  const [submitting, setSubmitting] = useState(false);
  const [receipts, setReceipts] = useState<CoachDockReceipt[]>([]);
  const [voiceStatusText, setVoiceStatusText] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
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

  /** Stage a finished transcript into the dock textarea. Returns whether the
   *  words landed, which the recorder lane reports back to the speaker. */
  const stageCapturedText = useCallback((text: string): boolean => {
    const chunk = text.trim();
    if (!chunk) return false;
    setDockTextState((prev) => {
      const nextValue = prev ? `${prev} ${chunk}` : chunk;
      setInputOrigin((origin) => mergeVoiceCaptureOrigin(origin, prev, chunk));
      return nextValue;
    });
    return true;
  }, []);

  const inlineRecorder = useCoachInlineRecorder({
    onTranscribed: stageCapturedText,
    setSelectedStatus: setVoiceStatusText,
    setVoiceInputError: setVoiceError,
  });
  // Held in refs so the speech hook and the runtime-failure handler keep stable
  // callback identities across the recorder lane's re-renders.
  const toggleRecorderRef = useRef(inlineRecorder.toggle);
  toggleRecorderRef.current = inlineRecorder.toggle;

  const handleSpeechUnavailable = useCallback((failure: CoachSpeechRuntimeFailure) => {
    if (recorderSupported && failure.canTryRecorder) {
      // Hand over to the same inline lane. This is a NOTICE, not an error:
      // routing it through the voice-error channel would latch it as the
      // top-priority status line and so mask every status after it.
      setVoiceStatusText('Browser dictation failed — switching to inline recording');
      toggleRecorderRef.current();
      return;
    }
    pushReceipt({ ok: false, text: failure.message });
  }, [pushReceipt, recorderSupported]);

  const setSpeechInputError = useCallback((error: string | null | ((prev: string | null) => string | null)) => {
    // Runtime failures already surface through handleSpeechUnavailable receipts.
    // Browser dictation's other errors stay silent here exactly as before; the
    // INLINE RECORDER does not share this channel — a denied microphone would
    // otherwise be invisible, so that lane owns voiceError below.
    void error;
  }, []);

  const speech = useCoachBrowserSpeechInput({
    onRuntimeUnavailable: handleSpeechUnavailable,
    setInputError: setSpeechInputError,
    setText: (next) => setDockTextState((current) => {
      const nextValue = typeof next === 'function' ? next(current) : next;
      setInputOrigin((origin) => mergeVoiceCaptureOrigin(origin, current, nextValue));
      return nextValue;
    }),
  });

  const voiceCaptureMode: 'browser' | 'recorder' | 'none' =
    speech.speechSupported ? 'browser' : recorderSupported ? 'recorder' : 'none';
  const voiceListening = speech.listening || inlineRecorder.isListening;
  const voicePhase: 'idle' | 'listening' | 'transcribing' = voiceListening
    ? 'listening'
    : inlineRecorder.active ? 'transcribing' : 'idle';

  const handleVoice = useCallback(() => {
    if (speech.speechSupported) { speech.toggleListening(); return; }
    if (recorderSupported) { toggleRecorderRef.current(); return; }
    pushReceipt({ ok: false, text: 'Voice input is not available in this browser.' });
  }, [pushReceipt, recorderSupported, speech]);

  const handleSubmit = useCallback(async () => {
    const trimmed = dockText.trim();
    if (!trimmed || submitting || (requireClient && selectedClientId == null)) return;
    setDockTextState('');
    setSubmitting(true);
    try {
      const result = await executeCommand(trimmed, { selectedClientId, surface, inputMode: commandInputMode(inputOrigin) });
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
      if (result.type === 'confirmation_required') {
        // CARD 1.3 — the dead end dies here. This branch used to push the lane's
        // message as TEXT with no control, so a trainer standing in the planner
        // had to LEAVE the surface and re-find the action in the Coach Command
        // Center to approve it. On a gym floor that is the end of the ≤2s voice
        // loop. The sheet now opens in place, carrying the SERVER's tier verdict.
        setPendingConfirmation({
          operationId: result.operationId ?? '',
          tier: (result.tier as ConfirmationTier) ?? 'deliberate',
          physical: Boolean(result.physical),
          isDestructive: Boolean(result.isDestructive),
          affectedCount: Number(result.details?.affectedCount ?? 1),
          sourceMessage: trimmed,
        });
        return;
      }
      // not_wired / debate_started — surface the lane's own message honestly.
      pushReceipt({ ok: result.type === 'debate_started', text: result.message });
    } finally {
      setSubmitting(false);
    }
  }, [chat, chatTitle, dockText, eventPrefix, executeCommand, inputOrigin, pushReceipt, requireClient, selectedClientId, submitting, surface]);

  return {
    /**
     * The client the operator has locked on this surface. Returned (rather than
     * re-derived in the dock) so all four mounts inherit the chip's cross-client
     * alarm through the existing `{...dock}` spread — no per-mount edit, and no
     * second definition of "which client is this about" to drift.
     */
    lockedClientId: selectedClientId,
    pendingConfirmation,
    dismissConfirmation: useCallback(() => setPendingConfirmation(null), []),
    /** Re-issue a burned/expired approval from the ORIGINAL utterance. */
    reissueConfirmation: useCallback(() => {
      const source = pendingConfirmation?.sourceMessage;
      setPendingConfirmation(null);
      if (source) {
        setDockTextState(source);
        setInputOrigin('voice');
      }
    }, [pendingConfirmation]),
    open,
    toggleOpen: useCallback(() => setOpen((prev) => !prev), []),
    dockText,
    setDockText: useCallback((t: string) => {
      setDockTextState((current) => {
        setInputOrigin((origin) => mergeTypedDraftOrigin(origin, current, t));
        return t;
      });
    }, []),
    inputMode: commandInputMode(inputOrigin),
    inputOrigin,
    listening: voiceListening,
    interim: speech.interim,
    handleVoice,
    /** Which lane the mic will use; 'none' means neither lane exists in this browser. */
    voiceCaptureMode,
    /** idle | listening | transcribing — the dock's pressed state and honest mic label. */
    voicePhase,
    /**
     * The lane's own status line. An error OUTRANKS the optimistic copy, mirroring
     * `buildVoiceStatus`' precedence in the coach console: without that ordering a
     * denied microphone would keep advertising a live one, and the recorder lane
     * writes its "Listening" copy on INTENT, before the device has opened.
     */
    voiceStatus: voiceError ?? voiceStatusText,
    submitting,
    handleSubmit,
    receipts,
  };
}
