/**
 * G06 — page-level foreground voice lifecycle (T30/T31/T32).
 *
 * The coach command center composes browser dictation, the recorder fallback
 * and TTS into ONE foreground lifecycle: backgrounding/logging out/unmounting
 * stops capture and output; an in-flight write is never cancelled by a voice
 * stop; starting capture stops playback (barge-in); resuming after a
 * submission never replays the submitted tool call.
 */

import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { useRef, useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CoachCommandCenterPage from './CoachCommandCenterPage';
import { CoachSessionDraftProvider } from './CoachSessionDraftContext';
import { useCoachCommandVoiceCapture } from './CoachCommandCenter.voiceCapture';
import type { CoachInputOrigin } from '../../../../hooks/coachInputOrigin';
import type { PublicationBinding, PublicationSnapshot } from '../../../../hooks/coachPublicationScope';

const useCoachIntakeQueueMock = vi.hoisted(() => vi.fn());
const useAIChatMock = vi.hoisted(() => vi.fn());
const listConversationsMock = vi.hoisted(() => vi.fn());
const sendMessageWithConversationMock = vi.hoisted(() => vi.fn());
const executeCommandMock = vi.hoisted(() => vi.fn());
const confirmCommandMock = vi.hoisted(() => vi.fn());
const cancelCommandMock = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() => vi.fn());
const ttsStopMock = vi.hoisted(() => vi.fn());
const stopListeningMock = vi.hoisted(() => vi.fn());
const speechHookParams = vi.hoisted(() => ({ current: null as any }));
const speechMock = vi.hoisted(() => ({
  clearInterim: vi.fn(),
  interim: '',
  listening: false,
  speechSupported: true,
  stopListening: stopListeningMock,
  toggleListening: vi.fn(),
}));

vi.mock('../../../../hooks/useCoachIntakeQueue', () => ({
  default: useCoachIntakeQueueMock,
  useCoachIntakeQueue: useCoachIntakeQueueMock,
}));

vi.mock('../../../../hooks/useAIChat', () => ({
  useAIChat: useAIChatMock,
}));

vi.mock('../../../../hooks/useAuth', () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}));

// Plan 55 C3: the mounted page ADMITS its coaching selection through one plan 52
// read before voice capture is enabled, so this fixture must model that read.
const apiGetMock = vi.hoisted(() => vi.fn());
const committedCount = vi.hoisted(() => ({ value: 0 }));
vi.mock('../../../../services/api.service', () => ({
  default: { get: apiGetMock, post: vi.fn() },
}));

vi.mock('../../../../hooks/useCoachCommand', () => ({
  useCoachCommand: () => ({
    cancelCommand: cancelCommandMock,
    confirmCommand: confirmCommandMock,
    executeCommand: executeCommandMock,
    executingCommand: false,
  }),
}));

vi.mock('../../../../context/GlobalClientContext', () => ({
  useGlobalClient: () => ({
    activeClient: null,
    clearActiveClient: vi.fn(),
    clientList: [],
    loadingClients: false,
    refreshClients: vi.fn(),
    setActiveClient: vi.fn(),
    // Plan 55 C1 reference API — the controller now mounts the C2 selection
    // adapter, so this harness must model the provider's real surface.
    pinnedClientId: null,
    referenceOrigin: null,
    actorGeneration: 1,
    commitClientReference: () => { committedCount.value += 1; return true; },
    registerSelectionInterceptor: () => () => {},
  }),
}));

vi.mock('./hooks/usePremiumTTS', () => ({
  usePremiumTTS: () => ({
    enabled: true,
    speaking: false,
    speak: vi.fn(),
    stop: ttsStopMock,
    toggleEnabled: vi.fn(),
    voice: 'Kore',
    setVoice: vi.fn(),
    voiceOptions: [],
    supported: true,
  }),
}));

vi.mock('./hooks/useCoachBrowserSpeechInput', () => ({
  useCoachBrowserSpeechInput: (params: unknown) => {
    speechHookParams.current = params;
    return speechMock;
  },
}));

// The recorder lane is driven synthetically: jsdom has neither MediaRecorder nor
// getUserMedia, so the two hooks it composes are stubbed and steered directly.
const recorderStub = vi.hoisted(() => ({
  abort: vi.fn(),
  audioBlob: null as Blob | null,
  duration: 0,
  error: null as string | null,
  getAudioLevel: () => 0,
  reset: vi.fn(),
  start: vi.fn(),
  state: 'idle' as string,
  stop: vi.fn(),
}));
const transcriptionStub = vi.hoisted(() => ({
  error: null as string | null,
  reset: vi.fn(),
  state: 'idle' as string,
  text: '',
  transcribe: vi.fn(),
}));
vi.mock('./hooks/useVoiceRecorder', () => ({ useVoiceRecorder: () => recorderStub }));
vi.mock('./hooks/useGeminiTranscription', () => ({ useGeminiTranscription: () => transcriptionStub }));

vi.mock('./VoiceRecordingOverlay', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (
    isOpen ? <section role="dialog" aria-label="Voice recording" /> : null
  ),
}));

vi.mock('./CoachIntakeWorkspace', () => ({
  default: () => <section data-testid="mock-coach-intake-workspace" />,
}));

vi.mock('../../../../services/coachCommandClientService', () => ({
  createQuickCoachCommandClient: vi.fn(),
}));

vi.mock('../../../PlaudClipMerge/PlaudMergeWorkspace', () => ({
  PlaudMergeWorkspace: () => <section data-testid="mock-plaud-merge-workspace" />,
}));

const unifiedSummary = {
  total: 0,
  actionable: 0,
  today: 0,
  unprocessed: 0,
  processing: 0,
  readyReview: 0,
  needsClarification: 0,
  duplicateHold: 0,
  failed: 0,
  needsClient: 0,
  preparedDrafts: 0,
  pendingDrafts: 0,
  applyingDrafts: 0,
  approvedDrafts: 0,
  appliedDrafts: 0,
  rejectedDrafts: 0,
  failedDrafts: 0,
};

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
}

function fireVisibilityChange() {
  fireEvent(document, new Event('visibilitychange'));
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant']}>
      {/* Mirrors UniversalDashboardLayout: the G04a shell-owned draft provider
          wraps every dashboard surface. */}
      <CoachSessionDraftProvider actorId={1} actorRole="admin">
        <CoachCommandCenterPage />
      </CoachSessionDraftProvider>
    </MemoryRouter>,
  );
}

/** Plan 55 C3 — the voice lane is enabled only once the selection is admitted. */
async function renderAdmittedPage() {
  const view = renderPage();
  await waitFor(() => expect(committedCount.value).toBeGreaterThan(0));
  return view;
}

describe('CoachCommandCenter foreground voice lifecycle (G06)', () => {
  afterEach(() => setHidden(false));

  beforeEach(() => {
    listConversationsMock.mockReset();
    sendMessageWithConversationMock.mockReset();
    executeCommandMock.mockReset();
    confirmCommandMock.mockReset();
    cancelCommandMock.mockReset();
    useAuthMock.mockReset();
    ttsStopMock.mockReset();
    stopListeningMock.mockReset();
    speechMock.clearInterim.mockReset();
    speechMock.toggleListening.mockReset();
    speechMock.interim = '';
    speechMock.listening = false;
    speechMock.speechSupported = true;
    speechHookParams.current = null;
    setHidden(false);

    useAuthMock.mockReturnValue({ user: { role: 'admin', id: 7 } });
    committedCount.value = 0;
    apiGetMock.mockReset();
    // The real plan 52 endpoint echoes the requested ids; so does this fixture.
    apiGetMock.mockImplementation(async (_url: string, config?: { params?: Record<string, string> }) => {
      const actor = useAuthMock.getMockImplementation()?.()?.user as { id?: number; role?: string } | null | undefined;
      return {
        data: {
          success: true,
          access: {
            scope: 'coach_target_read',
            actorUserId: actor?.id ?? 7,
            actorRole: actor?.role ?? 'admin',
            targetUserId: config?.params?.targetUserId === undefined ? null : Number(config.params.targetUserId),
            conversationId: config?.params?.conversationId === undefined ? null : Number(config.params.conversationId),
          },
        },
      };
    });
    listConversationsMock.mockResolvedValue([]);
    executeCommandMock.mockResolvedValue({ type: 'fallback_to_chat' });
    confirmCommandMock.mockResolvedValue({ success: true, type: 'executed', message: '', result: null });
    cancelCommandMock.mockResolvedValue(undefined);
    sendMessageWithConversationMock.mockResolvedValue({ success: true });
    useAIChatMock.mockReturnValue({
      activeConversation: null,
      archiveConversation: vi.fn(),
      clearError: vi.fn(),
      conversations: [],
      createConversation: vi.fn(),
      deleteConversation: vi.fn(),
      error: null,
      lastErrorCode: null,
      lastErrorRetryable: true,
      listConversations: listConversationsMock,
      loadConversation: vi.fn(),
      loading: false,
      messages: [],
      newChat: vi.fn(),
      renameConversation: vi.fn(),
      sendMessage: vi.fn(),
      sendMessageWithConversation: sendMessageWithConversationMock,
      sending: false,
    });
    useCoachIntakeQueueMock.mockReturnValue({
      error: null,
      health: {
        counts: { ...unifiedSummary, stuckProcessing: 0 },
        nextOperatorAction: null,
        schemaReady: true,
        status: 'healthy',
      },
      isLoading: false,
      items: [],
      refresh: vi.fn(),
      retention: null,
      retentionPurgePlan: null,
      scope: 'actionable',
      setScope: vi.fn(),
      summary: unifiedSummary,
    });
  });

  it('backgrounding the tab stops dictation and TTS output; an in-flight write is not cancelled', async () => {
    // In-flight command write: pending until the test ends — it must stay tracked.
    let resolveInFlight: (value: unknown) => void = () => undefined;
    executeCommandMock.mockReturnValue(new Promise((resolve) => { resolveInFlight = resolve; }));

    await renderAdmittedPage();
    // Plan 55 C3: landing the admission is ITSELF a lifecycle retirement, so the
    // per-edge assertions below are deltas from this post-admission baseline. An
    // admission change can also add a stop on the SAME edge, so the assertions
    // state the invariant (the edge stopped capture/output) rather than a constant.
    const baseStops = stopListeningMock.mock.calls.length;
    const baseTtsStops = ttsStopMock.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: /voice dictation/i }));
    expect(speechMock.toggleListening).toHaveBeenCalledTimes(1);

    // A voice-initiated write is in flight (pending executeCommand).
    fireEvent.change(screen.getByPlaceholderText(/talk or type to swan coach/i), {
      target: { value: 'Log squats three by ten' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^send to swan coach$/i }));
    await waitFor(() => expect(executeCommandMock).toHaveBeenCalledTimes(1));

    setHidden(true);
    fireVisibilityChange();

    expect(stopListeningMock.mock.calls.length).toBeGreaterThanOrEqual(baseStops + 1);
    // barge-in on capture start + the background stop.
    expect(ttsStopMock.mock.calls.length).toBeGreaterThanOrEqual(baseTtsStops + 2);
    // Audio stop is separate from action cancel: the in-flight write stays tracked.
    expect(cancelCommandMock).not.toHaveBeenCalled();
    resolveInFlight({ type: 'fallback_to_chat' });
    // 20s budget, not vitest's 5s default. This is a full CoachCommandCenterPage
    // render plus a visibilitychange rerender, and it is load-sensitive rather
    // than hung — the pending write IS resolved at the end of the body. Measured
    // 1.7-3.6s on an idle dev box, i.e. under 1.4x headroom at the 5s default,
    // which flaked red in CI on main twice (540593778, and d94d372bc before it)
    // while passing on 467009cea with a byte-identical blob. Same convention as
    // WorkoutDesignLab.interaction.test.tsx (20s) and ClientsWorkspace (15s).
  }, 20000);

  it('logout stops capture and output on the authenticated-to-anonymous flip', async () => {
    const view = await renderAdmittedPage();
    // Plan 55 C3: landing the admission is ITSELF a lifecycle retirement, so the
    // per-edge assertions below are deltas from this post-admission baseline.
    const baseStops = stopListeningMock.mock.calls.length;
    const baseTtsStops = ttsStopMock.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: /voice dictation/i }));

    useAuthMock.mockReturnValue({ user: null });
    view.rerender(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant']}>
        <CoachSessionDraftProvider actorId={1} actorRole="admin">
          <CoachCommandCenterPage />
        </CoachSessionDraftProvider>
      </MemoryRouter>,
    );

    expect(stopListeningMock.mock.calls.length).toBeGreaterThanOrEqual(baseStops + 1);
    // barge-in on capture start, the logout stop, AND the plan 55 C3 selection
    // retirement: an actor change is now a selection-epoch change too, so the
    // existing stopAll fires on both edges.
    expect(ttsStopMock.mock.calls.length).toBeGreaterThanOrEqual(baseTtsStops + 2);
    expect(cancelCommandMock).not.toHaveBeenCalled();
  });

  it('surface teardown (unmount) stops capture and output', async () => {
    const view = await renderAdmittedPage();
    const baseStops = stopListeningMock.mock.calls.length;
    const baseTtsStops = ttsStopMock.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: /voice dictation/i }));
    view.unmount();

    expect(stopListeningMock.mock.calls.length).toBeGreaterThanOrEqual(baseStops + 1);
    // barge-in on capture start + the surface-teardown stop.
    expect(ttsStopMock.mock.calls.length).toBeGreaterThanOrEqual(baseTtsStops + 2);
  });

  it('barge-in: starting capture stops TTS playback but keeps the write lane untouched', async () => {
    await renderAdmittedPage();
    const baseTtsStops = ttsStopMock.mock.calls.length;

    expect(ttsStopMock.mock.calls.length).toBeGreaterThanOrEqual(baseTtsStops);
    fireEvent.click(screen.getByRole('button', { name: /voice dictation/i }));

    expect(ttsStopMock.mock.calls.length).toBeGreaterThanOrEqual(baseTtsStops + 1);
    expect(speechMock.toggleListening).toHaveBeenCalledTimes(1);
    expect(cancelCommandMock).not.toHaveBeenCalled();
  });

  it('T32: resuming capture after a submission never replays the submitted intent', async () => {
    await renderAdmittedPage();

    fireEvent.change(screen.getByPlaceholderText(/talk or type to swan coach/i), {
      target: { value: 'Program push day' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^send to swan coach$/i }));
    await waitFor(() => expect(sendMessageWithConversationMock).toHaveBeenCalledTimes(1));

    // Transport hiccup + voice resume: stop, re-arm, re-dictate the same words.
    fireEvent.click(screen.getByRole('button', { name: /voice dictation/i }));
    fireEvent.click(screen.getByRole('button', { name: /voice dictation/i }));
    actSetText('Program push day');

    expect(sendMessageWithConversationMock).toHaveBeenCalledTimes(1);
    expect(executeCommandMock).not.toHaveBeenCalled();
  });

  it('T30: interim speech is display-only and never auto-submits a command', () => {
    speechMock.interim = 'program push';
    renderPage();

    expect(screen.getByText(/listening: program push/i)).toBeInTheDocument();
    expect(sendMessageWithConversationMock).not.toHaveBeenCalled();
    expect(executeCommandMock).not.toHaveBeenCalled();
  });
});

/** Stage composer text exactly the way dictation finals do (voice origin path). */
function actSetText(text: string) {
  act(() => {
    speechHookParams.current?.setText?.(text);
  });
}

/* ============================================================================
 * Plan 55 C4 (G04BC-R05, G04BC-R07, G04BC-T14) — dictation is an input lane
 * INTO a scoped composer. While the mounted Coach holds a live publication
 * binding that no longer admits the actor, a late browser transcript or a
 * recorder transcript must not stage words, and the existing
 * useCoachVoiceLifecycle stopAll must fire when the admission changes.
 * Each assertion is paired with an admitted control.
 * ========================================================================= */

const VOICE_ACTOR = 7;

function voiceSnapshot(overrides: Partial<PublicationSnapshot> = {}): PublicationSnapshot {
  return Object.freeze({
    actorId: VOICE_ACTOR,
    rawRole: 'admin',
    audienceRole: 'admin',
    generation: 1,
    targetUserId: null,
    threadId: null,
    enabled: true,
    ...overrides,
  });
}

function voiceBinding(getSnapshot: () => PublicationSnapshot | null): PublicationBinding {
  return { getSnapshot };
}

function useVoiceCaptureWithBinding(binding?: PublicationBinding) {
  const [commandText, setCommandText] = useState('');
  const [, setInputOrigin] = useState<CoachInputOrigin>('text');
  const [, setSelectedStatus] = useState('');
  const commandTextRef = useRef<HTMLTextAreaElement>(null);
  const capture = useCoachCommandVoiceCapture({
    commandTextRef,
    setCommandText,
    setInputOrigin,
    setSelectedStatus,
    speechOutputStop: ttsStopMock,
    binding,
  });
  return { capture, commandText };
}

describe('Plan 55 C4: voice staging obeys the live publication admission', () => {
  afterEach(() => setHidden(false));

  beforeEach(() => {
    stopListeningMock.mockReset();
    ttsStopMock.mockReset();
    speechMock.toggleListening.mockReset();
    speechMock.clearInterim.mockReset();
    speechMock.interim = '';
    speechMock.listening = false;
    speechMock.speechSupported = true;
    speechHookParams.current = null;
    setHidden(false);
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({ user: { role: 'admin', id: VOICE_ACTOR } });
    recorderStub.state = 'idle';
    recorderStub.audioBlob = null;
    recorderStub.error = null;
    transcriptionStub.state = 'idle';
    transcriptionStub.text = '';
    transcriptionStub.error = null;
  });

  it('drops a browser dictation final that lands after the admission retired', () => {
    const live = { current: voiceSnapshot() as PublicationSnapshot | null };
    const { result } = renderHook(() => useVoiceCaptureWithBinding(voiceBinding(() => live.current)));

    live.current = voiceSnapshot({ generation: 2 });
    actSetText('late dictated words');

    expect(result.current.commandText).toBe('');
  });

  it('CONTROL: stages the same dictation final while the admission is live', () => {
    const live = { current: voiceSnapshot() as PublicationSnapshot | null };
    const { result } = renderHook(() => useVoiceCaptureWithBinding(voiceBinding(() => live.current)));

    actSetText('late dictated words');

    expect(result.current.commandText).toBe('late dictated words');
  });

  it('refuses an inline recorder transcript while the selection is not admitted', () => {
    const live = { current: voiceSnapshot({ enabled: false }) as PublicationSnapshot | null };
    const { result, rerender } = renderHook(({ tick }: { tick: number }) => {
      void tick;
      return useVoiceCaptureWithBinding(voiceBinding(() => live.current));
    }, { initialProps: { tick: 0 } });

    transcriptionStub.text = 'Edit bench press 4 by 8';
    transcriptionStub.state = 'done';
    act(() => { rerender({ tick: 1 }); });

    expect(result.current.commandText).toBe('');
  });

  it('CONTROL: stages the same inline recorder transcript while the admission is live', () => {
    const live = { current: voiceSnapshot() as PublicationSnapshot | null };
    const { result, rerender } = renderHook(({ tick }: { tick: number }) => {
      void tick;
      return useVoiceCaptureWithBinding(voiceBinding(() => live.current));
    }, { initialProps: { tick: 0 } });

    transcriptionStub.text = 'Edit bench press 4 by 8';
    transcriptionStub.state = 'done';
    act(() => { rerender({ tick: 1 }); });

    expect(result.current.commandText).toBe('Edit bench press 4 by 8');
  });

  it('retires capture through the existing lifecycle when the admission generation changes', () => {
    const live = { current: voiceSnapshot() as PublicationSnapshot | null };
    const { rerender } = renderHook(({ tick }: { tick: number }) => {
      void tick;
      return useVoiceCaptureWithBinding(voiceBinding(() => live.current));
    }, { initialProps: { tick: 0 } });

    stopListeningMock.mockClear();
    live.current = voiceSnapshot({ generation: 2 });
    rerender({ tick: 1 });

    expect(stopListeningMock).toHaveBeenCalledTimes(1);
  });

  it('CONTROL: does not retire capture when the admission is unchanged', () => {
    const live = { current: voiceSnapshot() as PublicationSnapshot | null };
    const { rerender } = renderHook(({ tick }: { tick: number }) => {
      void tick;
      return useVoiceCaptureWithBinding(voiceBinding(() => live.current));
    }, { initialProps: { tick: 0 } });

    stopListeningMock.mockClear();
    rerender({ tick: 1 });

    expect(stopListeningMock).not.toHaveBeenCalled();
  });

  it('refuses to start capture while the selection is not admitted', () => {
    const live = { current: voiceSnapshot({ enabled: false }) as PublicationSnapshot | null };
    const { result } = renderHook(() => useVoiceCaptureWithBinding(voiceBinding(() => live.current)));

    act(() => { result.current.capture.handleVoice(); });

    expect(speechMock.toggleListening).not.toHaveBeenCalled();
  });

  it('CONTROL: starts capture when the admission is live', () => {
    const live = { current: voiceSnapshot() as PublicationSnapshot | null };
    const { result } = renderHook(() => useVoiceCaptureWithBinding(voiceBinding(() => live.current)));

    act(() => { result.current.capture.handleVoice(); });

    expect(speechMock.toggleListening).toHaveBeenCalledTimes(1);
  });
});
