import { readFileSync } from 'node:fs';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  cancelPillVisible: false,
  clearInterim: vi.fn(),
  handleCancelSend: vi.fn(),
  interim: '',
  listening: false,
  speechSupported: true,
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

vi.mock('./VoiceRecordingOverlay', () => ({
  default: ({ isOpen, onClose, onEditTranscript, onTranscribed }: {
    isOpen: boolean;
    onClose: () => void;
    onEditTranscript?: (text: string) => void;
    onTranscribed: (text: string) => void;
  }) => isOpen ? (
    <section role="dialog" aria-label="Voice recording">
      <button type="button" onClick={() => onTranscribed('Log squats 3 by 10')}>Mock transcribe</button>
      <button type="button" onClick={() => onEditTranscript?.('Edit bench press 4 by 8')}>Mock edit transcript</button>
      <button type="button" onClick={onClose}>Mock close</button>
    </section>
  ) : null,
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

describe('CoachCommandCenter voice input', () => {
  beforeEach(() => {
    listConversationsMock.mockReset();
    sendMessageWithConversationMock.mockReset();
    executeCommandMock.mockReset();
    confirmCommandMock.mockReset();
    cancelCommandMock.mockReset();
    speechMock.clearInterim.mockReset();
    speechMock.handleCancelSend.mockReset();
    speechMock.toggleListening.mockReset();
    speechMock.cancelPillVisible = false;
    speechMock.interim = '';
    speechMock.listening = false;
    speechMock.speechSupported = true;
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

  it('opens the server transcription recorder when browser speech is unavailable', () => {
    speechMock.speechSupported = false;
    setRecorderSupport(true);

    renderPage();

    const mic = screen.getByRole('button', { name: /start voice recording/i });
    expect(mic).not.toBeDisabled();

    fireEvent.click(mic);
    expect(screen.getByRole('dialog', { name: /voice recording/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /mock transcribe/i }));
    expect(screen.getByPlaceholderText(/talk or type to swan coach/i)).toHaveValue('Log squats 3 by 10');
    expect(screen.getByText(/voice command captured - press send to continue/i)).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: /mock transcribe/i }));
    fireEvent.click(screen.getByRole('button', { name: /^send to swan coach$/i }));

    await waitFor(() => {
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
