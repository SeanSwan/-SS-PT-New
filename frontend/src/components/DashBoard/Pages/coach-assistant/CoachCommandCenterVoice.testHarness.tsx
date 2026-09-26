/**
 * ============================================================================
 * FILE: CoachCommandCenterVoice.testHarness.tsx
 * PURPOSE: Shared fixture for the mounted Coach voice-input suite.
 * ============================================================================
 * Rule 4 split: the module mocks, the recorder support shim, the synthetic
 * speech hook and the two render helpers for `CoachCommandCenterVoice.test.tsx`
 * live here so the test file stays inside the 300-line cap. This module
 * registers no `it(...)` of its own.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import CoachCommandCenterPage from './CoachCommandCenterPage';
import { CoachSessionDraftProvider } from './CoachSessionDraftContext';

const useCoachIntakeQueueMock = vi.hoisted(() => vi.fn());
const useAIChatMock = vi.hoisted(() => vi.fn());
const listConversationsMock = vi.hoisted(() => vi.fn());
const sendMessageWithConversationMock = vi.hoisted(() => vi.fn());
const executeCommandMock = vi.hoisted(() => vi.fn());
const confirmCommandMock = vi.hoisted(() => vi.fn());
const cancelCommandMock = vi.hoisted(() => vi.fn());
const speechHookParams = vi.hoisted(() => ({ current: null as any }));
const speechMock = vi.hoisted(() => ({
  clearInterim: vi.fn(),
  interim: '',
  listening: false,
  speechSupported: true,
  stopListening: vi.fn(),
  toggleListening: vi.fn(),
}));
/** The inline recorder lane, mocked at its boundary: the mounted-page tests own
 * the WIRING (does the fallback reach the lane, does a staged transcript reach
 * the command lane), while the lane's own status copy is pinned by
 * `hooks/useCoachInlineRecorder.test.ts`. */
const inlineRecorderDriver = vi.hoisted(() => ({
  abort: vi.fn(),
  active: false,
  isListening: false,
  onTranscribed: null as ((text: string) => boolean) | null,
  toggle: vi.fn(),
}));

export {
  useCoachIntakeQueueMock, useAIChatMock, listConversationsMock,
  sendMessageWithConversationMock, executeCommandMock, confirmCommandMock,
  cancelCommandMock, speechHookParams, speechMock, inlineRecorderDriver,
};

vi.mock('../../../../hooks/useCoachIntakeQueue', () => ({
  default: useCoachIntakeQueueMock,
  useCoachIntakeQueue: useCoachIntakeQueueMock,
}));

vi.mock('../../../../hooks/useAIChat', () => ({
  useAIChat: useAIChatMock,
}));

const authIdentity = vi.hoisted(() => ({ user: { id: 1, role: 'admin' }, isAuthenticated: true, loading: false }));
export { authIdentity };
vi.mock('../../../../hooks/useAuth', () => ({ useAuth: () => authIdentity }));
vi.mock('../../../../context/AuthContext', () => ({ useAuth: () => authIdentity }));

// Plan 55 C3: the mounted page ADMITS its coaching selection through one plan 52
// read before voice capture is enabled, so this fixture must model that read.
const apiGetMock = vi.hoisted(() => vi.fn());
const committedCount = vi.hoisted(() => ({ value: 0 }));
export { apiGetMock, committedCount };
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

vi.mock('./hooks/useCoachBrowserSpeechInput', () => ({
  useCoachBrowserSpeechInput: (params: unknown) => {
    speechHookParams.current = params;
    return speechMock;
  },
}));

vi.mock('./hooks/useCoachInlineRecorder', () => ({
  useCoachInlineRecorder: (params: { onTranscribed: (text: string) => boolean }) => {
    inlineRecorderDriver.onTranscribed = params.onTranscribed;
    return {
      abort: inlineRecorderDriver.abort,
      active: inlineRecorderDriver.active,
      duration: 0,
      getLevel: () => 0.5,
      isListening: inlineRecorderDriver.isListening,
      toggle: inlineRecorderDriver.toggle,
    };
  },
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

export const unifiedSummary = {
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

export function setRecorderSupport(supported: boolean) {
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

export function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant']}>
      {/* G06 baseline repair: the G04a shell-owned draft provider wraps every
          dashboard surface; this test predated it and threw on mount. */}
      <CoachSessionDraftProvider actorId={1} actorRole="admin">
        <CoachCommandCenterPage />
      </CoachSessionDraftProvider>
    </MemoryRouter>,
  );
}

/** Plan 55 C3 — the voice lane is enabled only once the selection is admitted. */
export async function renderAdmittedPage() {
  const view = renderPage();
  await waitFor(() => expect(committedCount.value).toBeGreaterThan(0));
  return view;
}

/** Reset every hoisted mock and re-arm the default returns. */
export function resetVoiceFixture() {
  listConversationsMock.mockReset();
  sendMessageWithConversationMock.mockReset();
  executeCommandMock.mockReset();
  confirmCommandMock.mockReset();
  cancelCommandMock.mockReset();
  speechMock.clearInterim.mockReset();
  speechMock.stopListening.mockReset();
  speechMock.toggleListening.mockReset();
  speechMock.interim = '';
  speechMock.listening = false;
  speechMock.speechSupported = true;
  speechHookParams.current = null;
  inlineRecorderDriver.abort.mockReset();
  inlineRecorderDriver.toggle.mockReset();
  inlineRecorderDriver.active = false;
  inlineRecorderDriver.isListening = false;
  inlineRecorderDriver.onTranscribed = null;
  setRecorderSupport(false);
  committedCount.value = 0;
  apiGetMock.mockReset();
  // The real plan 52 endpoint echoes the requested ids; so does this fixture.
  apiGetMock.mockImplementation(async (_url: string, config?: { params?: Record<string, string> }) => ({
    data: {
      success: true,
      access: {
        scope: 'coach_target_read',
        actorUserId: authIdentity.user.id,
        actorRole: authIdentity.user.role,
        targetUserId: config?.params?.targetUserId === undefined ? null : Number(config.params.targetUserId),
        conversationId: config?.params?.conversationId === undefined ? null : Number(config.params.conversationId),
      },
    },
  }));
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
}
