import { readFileSync } from 'node:fs';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CoachCommandCenterPage from './CoachCommandCenterPage';

const useCoachIntakeQueueMock = vi.hoisted(() => vi.fn());
const useAIChatMock = vi.hoisted(() => vi.fn());
const listConversationsMock = vi.hoisted(() => vi.fn());
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
      sendMessageWithConversation: vi.fn(),
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

  it('disables the command center Mic button when browser speech is unavailable', () => {
    speechMock.speechSupported = false;

    renderPage();

    expect(screen.getByRole('button', { name: /voice dictation/i })).toBeDisabled();
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
