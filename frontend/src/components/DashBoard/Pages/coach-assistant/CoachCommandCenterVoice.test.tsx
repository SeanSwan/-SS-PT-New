/**
 * CoachCommandCenter voice input — inline dictation contract.
 *
 * WHAT CHANGED AND WHY THESE TESTS LOOK DIFFERENT
 * ----------------------------------------------
 * The dock used to open a full-screen VoiceRecordingOverlay whenever the
 * browser lacked the Web Speech API, and finishing one sentence there cost four
 * gestures (mic → Stop & Send → confirm transcript → Send). These tests now
 * pin the replacement: the microphone opens IN the composer, the words land in
 * the composer, and nothing modal is ever rendered on that path.
 *
 * The recorder pipeline is mocked at `useCoachCapture` — its own lifecycle
 * guarantees are covered by `useCoachCapture.lifecycle.test.ts` and
 * `VoiceRecordingOverlay.hotMic.test.tsx`. What is under test here is the
 * inline state machine the dock drives.
 */
import { readFileSync } from 'node:fs';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CoachCommandCenterPage from './CoachCommandCenterPage';

const useCoachIntakeQueueMock = vi.hoisted(() => vi.fn());
const useAIChatMock = vi.hoisted(() => vi.fn());
const listConversationsMock = vi.hoisted(() => vi.fn());
const sendMessageWithConversationMock = vi.hoisted(() => vi.fn());
const executeCommandMock = vi.hoisted(() => vi.fn());
const confirmCommandMock = vi.hoisted(() => vi.fn());
const cancelCommandMock = vi.hoisted(() => vi.fn());
const speechMock = vi.hoisted(() => ({
  cancelListening: vi.fn(),
  cancelPillVisible: false,
  clearInterim: vi.fn(),
  error: null as string | null,
  handleCancelSend: vi.fn(),
  heardSpeech: true,
  interim: '',
  listening: false,
  speechSupported: true,
  stopListening: vi.fn(),
  toggleListening: vi.fn(),
}));

/**
 * Imperative handle onto the mocked RECORD pipeline. `grant` is (re)bound on
 * every render of the mocked hook, so a test can advance the capture status
 * machine exactly as the real recorder would.
 */
const captureMock = vi.hoisted(() => ({
  grant: null as null | ((next: Record<string, unknown>) => void),
  start: vi.fn(),
  stop: vi.fn(),
  transcribe: vi.fn(),
  reset: vi.fn(),
}));

vi.mock('../../../../hooks/useCoachIntakeQueue', () => ({
  default: useCoachIntakeQueueMock,
  useCoachIntakeQueue: useCoachIntakeQueueMock,
}));

vi.mock('../../../../hooks/useAIChat', () => ({
  useAIChat: useAIChatMock,
}));

vi.mock('../../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { role: 'admin' } }),
}));

vi.mock('../../../../hooks/useCoachCommand', () => ({
  useCoachCommand: () => ({
    cancelCommand: cancelCommandMock,
    confirmCommand: confirmCommandMock,
    executeCommand: executeCommandMock,
    executingCommand: false,
  }),
}));

vi.mock('./hooks/useCoachBrowserSpeechInput', () => ({
  useCoachBrowserSpeechInput: () => speechMock,
}));

vi.mock('./hooks/useCoachCapture', async () => {
  const React = await import('react');
  const actual = await vi.importActual<typeof import('./hooks/useCoachCapture')>('./hooks/useCoachCapture');
  return {
    // Mirror the real module's exported constants too: the policy hook imports
    // CAPTURE_AUTO_STOPPED_COPY to tell the auto-stop notice apart from a real
    // error, and a mock that omits it makes that comparison silently wrong.
    CAPTURE_AUTO_STOPPED_COPY: actual.CAPTURE_AUTO_STOPPED_COPY,
    useCoachCapture: () => {
      const [state, setState] = React.useState({
        duration: 0,
        error: null as string | null,
        status: 'idle',
        stoppedAutomatically: false,
        transcript: '',
      });
      captureMock.grant = (next) => setState((prev) => ({ ...prev, ...next }));
      return {
        ...state,
        audioBlob: null,
        dismissNotice: () => {},
        getStream: () => null,
        /**
         * Mirrors the real hook: `reset()` settles the machine back to idle and
         * drops the transcript. A reset that left the status alone would keep
         * `phase` at 'transcribing' and mask whatever the reset was meant to
         * reveal.
         */
        reset: () => {
          captureMock.reset();
          setState({ duration: 0, error: null, status: 'idle', stoppedAutomatically: false, transcript: '' });
        },
        start: captureMock.start,
        stop: captureMock.stop,
        transcribe: captureMock.transcribe,
      };
    },
  };
});

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

function setRecorderSupport(supported: boolean) {
  Object.defineProperty(window, 'MediaRecorder', {
    configurable: true,
    writable: true,
    value: supported ? class MockMediaRecorder { static isTypeSupported() { return true; } } : undefined,
  });
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    writable: true,
    value: supported ? { getUserMedia: vi.fn() } : undefined,
  });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant']}>
      <CoachCommandCenterPage />
    </MemoryRouter>,
  );
}

/**
 * Queried by accessible name rather than placeholder: the placeholder becomes
 * "Listening..." while the microphone is open, so a placeholder lookup would
 * only work in half the states this suite exercises.
 */
const composer = () => screen.getByRole('textbox', { name: /talk or type to swan coach/i });

describe('CoachCommandCenter voice input', () => {
  beforeEach(() => {
    listConversationsMock.mockReset();
    sendMessageWithConversationMock.mockReset();
    executeCommandMock.mockReset();
    confirmCommandMock.mockReset();
    cancelCommandMock.mockReset();
    speechMock.cancelListening.mockReset();
    speechMock.clearInterim.mockReset();
    speechMock.handleCancelSend.mockReset();
    speechMock.stopListening.mockReset();
    // The real hook's `stopListening` sets `listening` to false. The static mock
    // has to do it too, or the dock keeps rendering the listening phase after a
    // stop and `buildVoiceStatus` masks the copy the stop just wrote.
    speechMock.stopListening.mockImplementation(() => { speechMock.listening = false; });
    speechMock.toggleListening.mockReset();
    speechMock.cancelPillVisible = false;
    speechMock.error = null;
    speechMock.heardSpeech = true;
    speechMock.interim = '';
    speechMock.listening = false;
    speechMock.speechSupported = true;
    captureMock.start.mockReset();
    captureMock.stop.mockReset();
    captureMock.transcribe.mockReset();
    captureMock.reset.mockReset();
    captureMock.grant = null;
    setRecorderSupport(false);

    listConversationsMock.mockResolvedValue([]);
    executeCommandMock.mockResolvedValue({ type: 'fallback_to_chat' });
    confirmCommandMock.mockResolvedValue({ success: true, type: 'executed', message: '', result: null });
    cancelCommandMock.mockResolvedValue(undefined);
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

  it('routes the command center Mic button into browser speech input', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /voice dictation/i }));

    expect(speechMock.toggleListening).toHaveBeenCalledTimes(1);
  });

  it('disables the command center Mic button when no voice capture mode is available', () => {
    speechMock.speechSupported = false;

    renderPage();

    expect(screen.getByRole('button', { name: /voice dictation/i })).toBeDisabled();
  });

  /**
   * The defect this replaced: on any browser without the Web Speech API, one
   * press of the mic opened a full-screen recorder, and reaching the model from
   * there cost three more confirmations. A modal is the thing Sean asked to be
   * rid of, so its absence is asserted on BOTH branches, not just the new one.
   */
  it('never opens a modal voice surface on either capture branch', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /voice dictation/i }));
    expect(screen.queryByRole('dialog', { name: /voice recording/i })).not.toBeInTheDocument();

    speechMock.speechSupported = false;
    setRecorderSupport(true);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /start voice recording/i }));
    expect(screen.queryByRole('dialog', { name: /voice recording/i })).not.toBeInTheDocument();
    expect(captureMock.start).toHaveBeenCalledTimes(1);
  });

  it('keeps the recorder branch inline: mic, talk, mic, and the words are in the composer', () => {
    speechMock.speechSupported = false;
    setRecorderSupport(true);

    renderPage();

    const mic = screen.getByRole('button', { name: /start voice recording/i });
    fireEvent.click(mic);
    expect(captureMock.start).toHaveBeenCalledTimes(1);

    // Microphone granted: the dock shows it is live without covering anything.
    act(() => { captureMock.grant?.({ status: 'capturing' }); });
    expect(screen.getByRole('button', { name: /recording - tap to stop/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Second press stops capture; the dock transcribes without asking twice.
    fireEvent.click(screen.getByRole('button', { name: /recording - tap to stop/i }));
    expect(captureMock.stop).toHaveBeenCalledTimes(1);

    act(() => { captureMock.grant?.({ status: 'ready' }); });
    expect(captureMock.transcribe).toHaveBeenCalledTimes(1);

    act(() => { captureMock.grant?.({ status: 'done', transcript: 'Log squats 3 by 10' }); });

    expect(composer()).toHaveValue('Log squats 3 by 10');
    expect(screen.getByText(/voice captured .+ press send/i)).toBeInTheDocument();
  });

  it('appends dictation to what was already typed instead of discarding it', () => {
    speechMock.speechSupported = false;
    setRecorderSupport(true);

    renderPage();
    fireEvent.change(composer(), { target: { value: 'bench press' } });

    fireEvent.click(screen.getByRole('button', { name: /start voice recording/i }));
    act(() => { captureMock.grant?.({ status: 'capturing' }); });
    fireEvent.click(screen.getByRole('button', { name: /recording - tap to stop/i }));
    act(() => { captureMock.grant?.({ status: 'ready' }); });
    act(() => { captureMock.grant?.({ status: 'done', transcript: '225 for 5' }); });

    expect(composer()).toHaveValue('bench press 225 for 5');
  });

  it('does not transcribe audio captured before an automatic stop', () => {
    speechMock.speechSupported = false;
    setRecorderSupport(true);

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /start voice recording/i }));
    act(() => { captureMock.grant?.({ status: 'capturing' }); });
    fireEvent.click(screen.getByRole('button', { name: /recording - tap to stop/i }));

    // The coach walked away; the lifecycle policy stopped it for them.
    act(() => { captureMock.grant?.({ status: 'ready', stoppedAutomatically: true }); });

    expect(captureMock.transcribe).not.toHaveBeenCalled();
  });

  /**
   * The auto-stop notice used to arrive through `capture.error`, which
   * `displaySelectedStatus` treats as highest-priority — so a single auto-stop
   * masked every later status line for the rest of the session — and the
   * retained audio had no review affordance on this surface at all, while the
   * copy promised one.
   */
  it('releases auto-stopped audio and says so in the dock status', () => {
    speechMock.speechSupported = false;
    setRecorderSupport(true);

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /start voice recording/i }));
    act(() => { captureMock.grant?.({ status: 'capturing' }); });

    // The coach walked away mid-recording; the lifecycle policy stopped it.
    act(() => { captureMock.grant?.({ status: 'ready', stoppedAutomatically: true }); });

    expect(captureMock.transcribe).not.toHaveBeenCalled();
    expect(captureMock.reset).toHaveBeenCalled();
    expect(screen.getByText(/stopped because you left the screen/i)).toBeInTheDocument();
  });

  /**
   * A denied microphone used to be invisible: the recogniser's `onerror` was
   * swallowed, so the status line kept the optimistic "Listening" copy that
   * `start()` had written a moment earlier, over a dead engine.
   *
   * The speech hook is a plain object in this suite, so changing its fields does
   * not re-render. The real `onerror` sets `listening` and `interim` — React
   * state — and re-renders by itself; the composer edit stands in for that.
   */
  it('lets a microphone failure outrank the optimistic listening copy', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /voice dictation/i }));
    expect(screen.getByText(/Listening .+ press the mic to stop/i)).toBeInTheDocument();

    speechMock.error = 'Swan Coach needs microphone access to hear you. Enable it in your browser settings, then press the mic to try again.';
    fireEvent.change(composer(), { target: { value: 'typed while the mic was denied' } });

    expect(screen.getByText(/needs microphone access/i)).toBeInTheDocument();
    expect(screen.queryByText(/Listening .+ press the mic to stop/i)).toBeNull();
  });

  /**
   * The RECORD branch has always refused to say "captured" over a silent room;
   * the LIVE branch said it unconditionally. One status line, one standard.
   */
  it('does not claim "Voice captured" when the browser recogniser heard nothing', () => {
    speechMock.heardSpeech = false;
    speechMock.listening = true;

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /listening - tap to stop/i }));

    expect(screen.getByText(/could not hear anything/i)).toBeInTheDocument();
    expect(screen.queryByText(/voice captured/i)).toBeNull();
  });

  it('reports the capture when the browser recogniser did hear something', () => {
    speechMock.heardSpeech = true;
    speechMock.listening = true;

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /listening - tap to stop/i }));

    expect(screen.getByText(/voice captured .+ press send/i)).toBeInTheDocument();
  });

  /**
   * The transcribe POST carries no client timeout (`api.service` sets one only
   * for /api/health), so a stalled upload leaves this phase up indefinitely.
   * The mic used to be a silent no-op here, which stranded the speaker on
   * "Transcribing your voice…" with no way out.
   */
  it('lets the mic escape a stalled transcription instead of doing nothing', () => {
    speechMock.speechSupported = false;
    setRecorderSupport(true);

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /start voice recording/i }));
    act(() => { captureMock.grant?.({ status: 'capturing' }); });
    fireEvent.click(screen.getByRole('button', { name: /recording - tap to stop/i }));
    act(() => { captureMock.grant?.({ status: 'ready' }); });
    // The upload never settles.
    act(() => { captureMock.grant?.({ status: 'transcribing' }); });

    const mic = screen.getByRole('button', { name: /transcribing voice/i });
    fireEvent.click(mic);

    expect(captureMock.reset).toHaveBeenCalled();
    expect(screen.getByText(/voice input cancelled/i)).toBeInTheDocument();
    expect(screen.queryByText(/transcribing your voice/i)).toBeNull();
  });

  it('closes the microphone when the composer is submitted mid-dictation', () => {    speechMock.speechSupported = false;
    setRecorderSupport(true);

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /start voice recording/i }));
    act(() => { captureMock.grant?.({ status: 'capturing' }); });

    expect(screen.getByRole('button', { name: /recording - tap to stop/i })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.change(composer(), { target: { value: 'what is on today' } });
    fireEvent.click(screen.getByRole('button', { name: /^send to swan coach$/i }));

    expect(captureMock.reset).toHaveBeenCalledTimes(1);
    expect(speechMock.cancelListening).not.toHaveBeenCalled();
  });

  it('routes transcribed workout commands through the approval-gated command lane', async () => {
    speechMock.speechSupported = false;
    setRecorderSupport(true);
    executeCommandMock.mockResolvedValueOnce({
      type: 'confirmation_required',
      message: 'Review this workout draft before saving.',
      operationId: 'voice-op-1',
      command: 'log_workout',
      params: {},
      client: null,
      details: { source: 'voice_recorder' },
      isDestructive: false,
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /start voice recording/i }));
    act(() => { captureMock.grant?.({ status: 'capturing' }); });
    fireEvent.click(screen.getByRole('button', { name: /recording - tap to stop/i }));
    act(() => { captureMock.grant?.({ status: 'ready' }); });
    act(() => { captureMock.grant?.({ status: 'done', transcript: 'Log squats 3 by 10' }); });

    fireEvent.click(screen.getByRole('button', { name: /^send to swan coach$/i }));

    await vi.waitFor(() => {
      expect(executeCommandMock).toHaveBeenCalledWith(
        'Log squats 3 by 10',
        expect.objectContaining({ selectedClientId: null }),
      );
    });
    expect(sendMessageWithConversationMock).not.toHaveBeenCalled();
  });

  it('keeps fake voice toggles out of the command action factory', () => {
    const actionSource = readFileSync(
      'src/components/DashBoard/Pages/coach-assistant/CoachCommandCenter.actions.ts',
      'utf8',
    );

    expect(actionSource).not.toContain('Voice input listening');
    expect(actionSource).not.toContain('setVoiceActive');
    expect(actionSource).not.toContain('voiceActive');
  });
});
