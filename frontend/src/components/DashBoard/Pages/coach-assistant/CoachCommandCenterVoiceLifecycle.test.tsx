/**
 * G06 — page-level foreground voice lifecycle (T30/T31/T32).
 *
 * The coach command center composes browser dictation, the recorder fallback
 * and TTS into ONE foreground lifecycle: backgrounding/logging out/unmounting
 * stops capture and output; an in-flight write is never cancelled by a voice
 * stop; starting capture stops playback (barge-in); resuming after a
 * submission never replays the submitted tool call.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CoachCommandCenterPage from './CoachCommandCenterPage';
import { CoachSessionDraftProvider } from './CoachSessionDraftContext';

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

    renderPage();

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

    expect(stopListeningMock).toHaveBeenCalledTimes(1);
    // barge-in on capture start + the background stop.
    expect(ttsStopMock).toHaveBeenCalledTimes(2);
    // Audio stop is separate from action cancel: the in-flight write stays tracked.
    expect(cancelCommandMock).not.toHaveBeenCalled();
    resolveInFlight({ type: 'fallback_to_chat' });
  });

  it('logout stops capture and output on the authenticated-to-anonymous flip', () => {
    const view = renderPage();

    fireEvent.click(screen.getByRole('button', { name: /voice dictation/i }));

    useAuthMock.mockReturnValue({ user: null });
    view.rerender(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant']}>
        <CoachSessionDraftProvider actorId={1} actorRole="admin">
          <CoachCommandCenterPage />
        </CoachSessionDraftProvider>
      </MemoryRouter>,
    );

    expect(stopListeningMock).toHaveBeenCalledTimes(1);
    // barge-in on capture start + the logout stop.
    expect(ttsStopMock).toHaveBeenCalledTimes(2);
    expect(cancelCommandMock).not.toHaveBeenCalled();
  });

  it('surface teardown (unmount) stops capture and output', () => {
    const view = renderPage();

    fireEvent.click(screen.getByRole('button', { name: /voice dictation/i }));
    view.unmount();

    expect(stopListeningMock).toHaveBeenCalledTimes(1);
    // barge-in on capture start + the surface-teardown stop.
    expect(ttsStopMock).toHaveBeenCalledTimes(2);
  });

  it('barge-in: starting capture stops TTS playback but keeps the write lane untouched', () => {
    renderPage();

    expect(ttsStopMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /voice dictation/i }));

    expect(ttsStopMock).toHaveBeenCalledTimes(1);
    expect(speechMock.toggleListening).toHaveBeenCalledTimes(1);
    expect(cancelCommandMock).not.toHaveBeenCalled();
  });

  it('T32: resuming capture after a submission never replays the submitted intent', async () => {
    renderPage();

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
