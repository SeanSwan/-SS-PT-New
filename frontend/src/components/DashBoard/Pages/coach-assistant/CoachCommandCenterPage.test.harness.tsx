import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import CoachCommandCenterPage from './CoachCommandCenterPage';
import { CoachSessionDraftProvider } from './CoachSessionDraftContext';

vi.setConfig({ testTimeout: 15000 });

const coachCommandCenterMocks = vi.hoisted(() => ({
  useCoachIntakeQueueMock: vi.fn(),
  useAIChatMock: vi.fn(),
  listConversationsMock: vi.fn(),
  loadConversationMock: vi.fn(),
  sendMessageWithConversationMock: vi.fn(),
  newChatMock: vi.fn(),
  deleteConversationMock: vi.fn(),
  renameConversationMock: vi.fn(),
  createQuickCoachCommandClientMock: vi.fn(),
  executeCommandMock: vi.fn(),
  confirmCommandMock: vi.fn(),
  cancelCommandMock: vi.fn(),
  useAuthMock: vi.fn(),
  useGlobalClientMock: vi.fn(),
  setActiveClientMock: vi.fn(),
  clearActiveClientMock: vi.fn(),
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
}));

export const {
  useCoachIntakeQueueMock,
  useAIChatMock,
  listConversationsMock,
  loadConversationMock,
  sendMessageWithConversationMock,
  newChatMock,
  deleteConversationMock,
  renameConversationMock,
  createQuickCoachCommandClientMock,
  executeCommandMock,
  confirmCommandMock,
  cancelCommandMock,
  useAuthMock,
  useGlobalClientMock,
  setActiveClientMock,
  clearActiveClientMock,
  apiGetMock,
  apiPostMock,
} = coachCommandCenterMocks;

vi.mock('../../../../services/api.service', () => ({
  default: {
    get: coachCommandCenterMocks.apiGetMock,
    post: coachCommandCenterMocks.apiPostMock,
  },
}));

vi.mock('../../../../hooks/useCoachIntakeQueue', () => ({
  default: coachCommandCenterMocks.useCoachIntakeQueueMock,
  useCoachIntakeQueue: coachCommandCenterMocks.useCoachIntakeQueueMock,
}));

vi.mock('../../../../hooks/useAIChat', () => ({
  useAIChat: coachCommandCenterMocks.useAIChatMock,
}));

vi.mock('../../../../hooks/useAuth', () => ({
  default: coachCommandCenterMocks.useAuthMock,
  useAuth: coachCommandCenterMocks.useAuthMock,
}));

vi.mock('../../../../context/GlobalClientContext', () => ({
  useGlobalClient: coachCommandCenterMocks.useGlobalClientMock,
}));

vi.mock('../../../../hooks/useCoachCommand', () => ({
  useCoachCommand: () => ({
    executeCommand: coachCommandCenterMocks.executeCommandMock,
    confirmCommand: coachCommandCenterMocks.confirmCommandMock,
    cancelCommand: coachCommandCenterMocks.cancelCommandMock,
    executingCommand: false,
  }),
}));

vi.mock('./CoachIntakeWorkspace', () => ({
  default: ({
    activeIntakeId,
    queue,
  }: {
    activeIntakeId?: string | null;
    queue: { summary: { actionable: number } };
  }) => (
    <section data-testid="mock-coach-intake-workspace">
      <span>Unified actionable {queue.summary.actionable}</span>
      <span>Active intake {activeIntakeId || 'none'}</span>
    </section>
  ),
}));

vi.mock('../../../../services/coachCommandClientService', () => ({
  createQuickCoachCommandClient: coachCommandCenterMocks.createQuickCoachCommandClientMock,
}));

vi.mock('../../../PlaudClipMerge/PlaudMergeWorkspace', () => ({
  PlaudMergeWorkspace: ({ embedded, initialReviewMergeRequestId }: { embedded?: boolean; initialReviewMergeRequestId?: string }) => (
    <section data-testid="mock-plaud-merge-workspace" data-embedded={String(Boolean(embedded))}>
      {initialReviewMergeRequestId || 'review-next'}
      <input type="file" data-plaud-uploader-input="true" data-testid="plaud-uploader-input" />
    </section>
  ),
}));

// The Review panel ships behind a React.lazy code-split boundary in prod.
// Page suites assert review content synchronously, so the harness swaps
// the boundary for the real (child-mocked) panel; the Suspense path is
// covered by CoachCommandCenterReviewPanelLazy.test.tsx.
vi.mock('./CoachCommandCenterReviewPanelLazy', () =>
  import('./CoachCommandCenterReviewPanel'),
);

export const unifiedSummary = {
  total: 22,
  actionable: 9,
  today: 4,
  unprocessed: 2,
  processing: 3,
  readyReview: 6,
  needsClarification: 5,
  duplicateHold: 2,
  failed: 1,
  needsClient: 1,
  preparedDrafts: 3,
  pendingDrafts: 1,
  applyingDrafts: 0,
  approvedDrafts: 0,
  appliedDrafts: 0,
  rejectedDrafts: 0,
  failedDrafts: 0,
};

type CoachCommandTestRole = 'admin' | 'trainer' | 'client' | 'user';

export function setCoachCommandCenterRole(role: CoachCommandTestRole) {
  useAuthMock.mockReturnValue({
    user: { id: 1, role },
    isAuthenticated: true,
  });
}

export function renderPage(route = '/dashboard/admin/coach-assistant', role: CoachCommandTestRole = 'admin') {
  setCoachCommandCenterRole(role);
  return render(
    <MemoryRouter initialEntries={[route]}>
      {/* Mirrors UniversalDashboardLayout: the G04a shell-owned draft provider wraps
          every dashboard surface. The Session Desk (G04c) reads it, so harness renders
          must provide it or the desk's useCoachSessionDraft throws. */}
      <CoachSessionDraftProvider actorId={1} actorRole={role}>
        <CoachCommandCenterPage />
      </CoachSessionDraftProvider>
    </MemoryRouter>,
  );
}

const defaultCoachConversations = [
  {
    id: 101,
    title: 'Friday intake cleanup',
    context: 'coach_assistant',
    status: 'active',
    messageCount: 4,
    lastMessageAt: '2026-05-14T11:30:00.000Z',
    createdAt: '2026-05-14T10:00:00.000Z',
  },
  {
    id: 102,
    title: 'Client confirmation holds',
    context: 'coach_assistant',
    status: 'active',
    messageCount: 2,
    lastMessageAt: '2026-05-13T19:30:00.000Z',
    createdAt: '2026-05-13T18:00:00.000Z',
  },
];

export function setCoachCommandCenterConversations(conversations = defaultCoachConversations) {
  const current = useAIChatMock.getMockImplementation()?.() || {};
  useAIChatMock.mockReturnValue({
    ...current,
    conversations,
  });
}

export function setCoachCommandCenterActiveConversation() {
  const current = useAIChatMock.getMockImplementation()?.() || {};
  const activeConversation = {
    id: 101,
    title: 'Friday intake cleanup',
    context: 'coach_assistant',
    role: 'admin',
    status: 'active',
    messageCount: 2,
    lastMessageAt: '2026-05-14T11:30:00.000Z',
    createdAt: '2026-05-14T10:00:00.000Z',
    messages: [
      {
        role: 'user',
        content: 'We reviewed Ava squat pattern and left knee note.',
        timestamp: '2026-05-14T10:10:00.000Z',
      },
      {
        role: 'assistant',
        content: 'Keep the next workout review gated and check pain before loading.',
        timestamp: '2026-05-14T10:11:00.000Z',
      },
    ],
  };
  useAIChatMock.mockReturnValue({
    ...current,
    activeConversation,
    messages: activeConversation.messages,
  });
}
export function resetCoachCommandCenterMocks() {
  listConversationsMock.mockReset();
  loadConversationMock.mockReset();
  sendMessageWithConversationMock.mockReset();
  newChatMock.mockReset();
  deleteConversationMock.mockReset();
  renameConversationMock.mockReset();
  executeCommandMock.mockReset();
  confirmCommandMock.mockReset();
  cancelCommandMock.mockReset();
  createQuickCoachCommandClientMock.mockReset();
  useAuthMock.mockReset();
  useGlobalClientMock.mockReset();
  setActiveClientMock.mockReset();
  clearActiveClientMock.mockReset();
  apiGetMock.mockReset();
  apiPostMock.mockReset();

  listConversationsMock.mockResolvedValue([]);
  loadConversationMock.mockResolvedValue(null);
  sendMessageWithConversationMock.mockResolvedValue({
    role: 'assistant',
    content: 'Prepared the review package. No final writes have been made.',
    timestamp: '2026-05-14T12:00:00.000Z',
  });
  deleteConversationMock.mockResolvedValue(undefined);
  renameConversationMock.mockResolvedValue(undefined);
  executeCommandMock.mockResolvedValue({ type: 'fallback_to_chat' });
  confirmCommandMock.mockResolvedValue({ success: true, type: 'executed', message: '', result: null });
  cancelCommandMock.mockResolvedValue(undefined);
  apiGetMock.mockImplementation(async (url: string) => {
    if (url === '/api/ai-command/commands') return { data: { commands: [] } };
    if (url.startsWith('/api/ai-command/pending/')) {
      const operationId = url.split('/').pop() || 'unknown';
      const match = operationId.match(/(\d+)$/);
      const sessionId = Number(match?.[1] || 42);
      return {
        data: {
          success: true,
          operation: {
            id: operationId,
            commandType: 'cancel_session',
            description: `Cancel session ${sessionId}`,
            params: { sessionId, clientId: 77 },
            affectedCount: 1,
            clientId: 77,
          },
        },
      };
    }
    return { data: {} };
  });
  apiPostMock.mockImplementation(async (url: string, body?: { operationId?: string }) => {
    if (url === '/api/ai-command/confirm') {
      const match = body?.operationId?.match(/(\d+)$/);
      return {
        data: {
          success: true,
          type: 'executed',
          command: 'cancel_session',
          result: { sessionId: Number(match?.[1] || 42), refundIssued: true },
        },
      };
    }
    return { data: { success: true } };
  });
  createQuickCoachCommandClientMock.mockResolvedValue({
    client: {
      id: 77,
      firstName: 'Ava',
      lastName: 'Stone',
      clientSource: 'move_fitness',
    },
    claimCode: 'claim-77',
    claimUrl: 'https://sswanstudios.com/claim/claim-77',
    isMoveFitness: true,
  });
  useAIChatMock.mockReturnValue({
    conversations: defaultCoachConversations,
    activeConversation: null,
    messages: [],
    loading: false,
    sending: false,
    error: null,
    lastErrorCode: null,
    lastErrorRetryable: true,
    createConversation: vi.fn(),
    listConversations: listConversationsMock,
    loadConversation: loadConversationMock,
    sendMessage: vi.fn(),
    sendMessageWithConversation: sendMessageWithConversationMock,
    deleteConversation: deleteConversationMock,
    renameConversation: renameConversationMock,
    archiveConversation: vi.fn(),
    newChat: newChatMock,
    clearError: vi.fn(),
  });
  useGlobalClientMock.mockReturnValue({
    activeClient: null,
    setActiveClient: setActiveClientMock,
    clearActiveClient: clearActiveClientMock,
    clientList: [
      { id: 41, firstName: 'Ava', lastName: 'Stone', email: 'ava@example.test' },
      { id: 52, firstName: 'Ben', lastName: 'Harbor', email: 'ben@example.test' },
    ],
    loadingClients: false,
    refreshClients: vi.fn(),
  });
  setCoachCommandCenterRole('admin');
  useCoachIntakeQueueMock.mockReturnValue({
    items: [
      {
        id: 'queue-1',
        entityId: '11111111-2222-3333-4444-555555555555',
        kind: 'merge_request',
        source: 'plaud_merge',
        queueStatus: 'ready_review',
        canReview: true,
        recordedAt: '2026-05-13T09:00:00.000Z',
        timelineAt: '2026-05-13T09:00:00.000Z',
        createdAt: '2026-05-13T09:05:00.000Z',
        needsClient: false,
      },
    ],
    summary: unifiedSummary,
    isLoading: false,
    error: null,
    health: {
      schemaReady: true,
      status: 'attention',
      counts: { ...unifiedSummary, stuckProcessing: 1 },
      nextOperatorAction: { key: 'review_ready', label: 'Review next ready intake' },
    },
    retention: null,
    retentionPurgePlan: null,
    scope: 'actionable',
    setScope: vi.fn(),
    refresh: vi.fn(),
  });
}
