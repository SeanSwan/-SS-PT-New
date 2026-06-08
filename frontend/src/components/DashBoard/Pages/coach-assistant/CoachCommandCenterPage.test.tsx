import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CoachCommandCenterPage from './CoachCommandCenterPage';

const useCoachIntakeQueueMock = vi.hoisted(() => vi.fn());
const useAIChatMock = vi.hoisted(() => vi.fn());
const listConversationsMock = vi.hoisted(() => vi.fn());
const loadConversationMock = vi.hoisted(() => vi.fn());
const sendMessageWithConversationMock = vi.hoisted(() => vi.fn());
const newChatMock = vi.hoisted(() => vi.fn());
const deleteConversationMock = vi.hoisted(() => vi.fn());
const renameConversationMock = vi.hoisted(() => vi.fn());
const createQuickCoachCommandClientMock = vi.hoisted(() => vi.fn());
const executeCommandMock = vi.hoisted(() => vi.fn());
const confirmCommandMock = vi.hoisted(() => vi.fn());
const cancelCommandMock = vi.hoisted(() => vi.fn());

vi.mock('../../../../hooks/useCoachIntakeQueue', () => ({
  default: useCoachIntakeQueueMock,
  useCoachIntakeQueue: useCoachIntakeQueueMock,
}));

vi.mock('../../../../hooks/useAIChat', () => ({
  useAIChat: useAIChatMock,
}));

vi.mock('../../../../hooks/useCoachCommand', () => ({
  useCoachCommand: () => ({
    executeCommand: executeCommandMock,
    confirmCommand: confirmCommandMock,
    cancelCommand: cancelCommandMock,
    executingCommand: false,
  }),
}));

vi.mock('./CoachIntakeWorkspace', () => ({
  default: ({ queue, onCommandPrompt }: { queue: { summary: { actionable: number } }; onCommandPrompt: (prompt: string) => void }) => (
    <section data-testid="mock-coach-intake-workspace">
      <span>Unified actionable {queue.summary.actionable}</span>
      <button type="button" onClick={() => onCommandPrompt('Review next unified intake')}>
        Mock queue command
      </button>
    </section>
  ),
}));

vi.mock('../../../../services/coachCommandClientService', () => ({
  createQuickCoachCommandClient: createQuickCoachCommandClientMock,
}));

vi.mock('../../../PlaudClipMerge/PlaudMergeWorkspace', () => ({
  PlaudMergeWorkspace: ({ embedded, initialReviewMergeRequestId }: { embedded?: boolean; initialReviewMergeRequestId?: string }) => (
    <section data-testid="mock-plaud-merge-workspace" data-embedded={String(Boolean(embedded))}>
      {initialReviewMergeRequestId || 'review-next'}
      <input type="file" data-plaud-uploader-input="true" data-testid="plaud-uploader-input" />
    </section>
  ),
}));

const unifiedSummary = {
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

function renderPage(route = '/dashboard/admin/coach-assistant') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <CoachCommandCenterPage />
    </MemoryRouter>,
  );
}

describe('CoachCommandCenterPage', () => {
  beforeEach(() => {
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
      conversations: [
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
      ],
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
  });

  it('renders the command center labels, dock actions, and approval-gated copy', () => {
    renderPage();

    expect(listConversationsMock).toHaveBeenCalledWith('active', true);
    expect(screen.getAllByText(/Swan Coach Command Center/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Coach Command Modes/i)).toBeInTheDocument();
    expect(screen.getByText(/Start with a workflow/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Coach Thread/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask Swan Coach, paste notes, or attach audio/transcript...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Attach$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Mic$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Readback$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Prepare$/i })).toBeInTheDocument();
    expect(screen.getByText(/the operator approves the final write/i)).toBeInTheDocument();
  });

  it('keeps the command composer at the top of the command workspace before the banner', () => {
    renderPage();

    const workspace = screen.getByLabelText('Swan Coach command workspace');
    const composer = within(workspace).getByRole('form', { name: /Swan Coach command composer/i });
    const commandLog = within(workspace).getByRole('heading', { name: /Command log/i }).closest('section');
    const banner = within(workspace).getByText(/review-gated operator console/i).closest('section');

    expect(commandLog).not.toBeNull();
    expect(banner).not.toBeNull();
    expect(composer.compareDocumentPosition(commandLog as Element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect((commandLog as Element).compareDocumentPosition(banner as Element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('formats long coach responses into readable steps and keeps structured packets collapsed', async () => {
    sendMessageWithConversationMock.mockResolvedValueOnce({
      role: 'assistant',
      content:
        '1. **Get Him Moving Gently:** Start with assisted mobility and controlled tempo work. 2. **Iron Out the Kinks:** Add stability work before loading. {"action":"coach_action_proposal","schema_version":"2026-05-07","proposal_type":"client_onboarding"}',
      timestamp: '2026-05-14T12:00:00.000Z',
    });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('Ask Swan Coach, paste notes, or attach audio/transcript...'), {
      target: { value: 'Prepare readable review.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Prepare$/i }));

    expect(await screen.findByText('Get Him Moving Gently')).toBeInTheDocument();
    expect(screen.getByText('Iron Out the Kinks')).toBeInTheDocument();
    expect(screen.getByText(/Start with assisted mobility/i)).toBeInTheDocument();
    expect(screen.getByText('Structured packet')).toBeInTheDocument();
  });

  it('opens the embedded PLAUD uploader from the top command dock', () => {
    renderPage();

    const uploadInput = screen.getByTestId('plaud-uploader-input');
    const clickSpy = vi.spyOn(uploadInput, 'click');

    fireEvent.click(screen.getByRole('button', { name: /Start PLAUD Upload/i }));

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText(/PLAUD upload lane ready/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/PLAUD recorder upload lane opened/i)).toBeInTheDocument();
  });

  it('uses real conversation thread buttons that update the composer and selected status', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Friday intake cleanup/i }));

    expect(screen.getByPlaceholderText('Ask Swan Coach, paste notes, or attach audio/transcript...')).toHaveValue(
      'Continue Friday intake cleanup with review-gated context.',
    );
    expect(loadConversationMock).toHaveBeenCalledWith(101);
    expect(screen.getAllByText(/Friday intake cleanup - thread loaded/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Friday intake cleanup/i })).toHaveAttribute('aria-current', 'true');
  });

  it('submits the command dock through the real coach conversation API', async () => {
    renderPage();

    const composer = screen.getByPlaceholderText('Ask Swan Coach, paste notes, or attach audio/transcript...');
    fireEvent.change(composer, { target: { value: 'Prepare today intake review.' } });
    fireEvent.click(screen.getByRole('button', { name: /^Prepare$/i }));

    await waitFor(() => {
      expect(sendMessageWithConversationMock).toHaveBeenCalledWith(
        'Prepare today intake review.',
        'coach_assistant',
        'Friday intake cleanup',
        null,
        'both',
      );
    });
  });

  it('routes command-like admin prompts through the AI command lane before chat fallback', async () => {
    executeCommandMock.mockResolvedValueOnce({
      type: 'executed',
      command: 'list_active_clients',
      result: {
        totalCount: 2,
        returnedCount: 2,
        swanStudiosCount: 1,
        moveFitnessCount: 1,
      },
      client: null,
    });
    renderPage();

    const composer = screen.getByPlaceholderText('Ask Swan Coach, paste notes, or attach audio/transcript...');
    fireEvent.change(composer, { target: { value: 'List active clients' } });
    fireEvent.click(screen.getByRole('button', { name: /^Prepare$/i }));

    await waitFor(() => {
      expect(executeCommandMock).toHaveBeenCalledWith('List active clients', {
        selectedClientId: null,
        routeContext: {
          source: 'coach-command-center',
          intent: null,
        },
      });
    });

    expect(sendMessageWithConversationMock).not.toHaveBeenCalled();
    expect(screen.getByText(/2 of 2 active clients loaded/i)).toBeInTheDocument();
  });

  it('renders command-created onboarding drafts as actionable prepared-draft cards', async () => {
    executeCommandMock.mockResolvedValueOnce({
      type: 'executed',
      command: 'create_external_client',
      result: {
        hasPreparedDraft: true,
        proposalId: 'proposal-123',
        proposalType: 'client_onboarding',
        proposalStatus: 'PENDING',
        proposalTitle: 'Review client onboarding draft',
        reviewRoute: '/dashboard/admin/coach-assistant?proposal=proposal-123',
        nextActionLabel: 'Review prepared draft',
      },
      client: null,
    });
    renderPage();

    const composer = screen.getByPlaceholderText('Ask Swan Coach, paste notes, or attach audio/transcript...');
    fireEvent.change(composer, { target: { value: 'Create external client Ava Stone' } });
    fireEvent.click(screen.getByRole('button', { name: /^Prepare$/i }));

    expect(await screen.findByText(/Prepared draft waiting/i)).toBeInTheDocument();
    expect(screen.getByText(/Review client onboarding draft/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open prepared draft/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant?proposal=proposal-123');
  });

  it('lets admins confirm command-lane approval holds from the command log', async () => {
    executeCommandMock.mockResolvedValueOnce({
      type: 'confirmation_required',
      message: 'Confirm that this no-show should cancel the paid session.',
      operationId: 'op-session-42',
      command: 'cancel_session',
      params: { sessionId: 42, refundCredit: true },
      client: { id: 77, firstName: 'Ava', lastName: 'Stone' },
      details: null,
      isDestructive: true,
    });
    confirmCommandMock.mockResolvedValueOnce({
      success: true,
      type: 'executed',
      message: '',
      result: { sessionId: 42, refundIssued: true },
      command: 'cancel_session',
    });
    renderPage();

    const composer = screen.getByPlaceholderText('Ask Swan Coach, paste notes, or attach audio/transcript...');
    fireEvent.change(composer, { target: { value: 'Cancel session 42' } });
    fireEvent.click(screen.getByRole('button', { name: /^Prepare$/i }));

    expect(await screen.findByText(/Confirm Destructive Action/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Confirm action/i }));

    await waitFor(() => {
      expect(confirmCommandMock).toHaveBeenCalledWith('op-session-42');
    });
    expect(await screen.findByText(/Session #42 cancelled for Ava/i)).toBeInTheDocument();
  });

  it('lets admins cancel command-lane approval holds without confirming writes', async () => {
    executeCommandMock.mockResolvedValueOnce({
      type: 'confirmation_required',
      message: 'Confirm this session cancellation before writing anything.',
      operationId: 'op-session-cancel',
      command: 'cancel_session',
      params: { sessionId: 43 },
      client: { id: 77, firstName: 'Ava', lastName: 'Stone' },
      details: null,
      isDestructive: true,
    });
    renderPage();

    const composer = screen.getByPlaceholderText('Ask Swan Coach, paste notes, or attach audio/transcript...');
    fireEvent.change(composer, { target: { value: 'Cancel session 43' } });
    fireEvent.click(screen.getByRole('button', { name: /^Prepare$/i }));

    expect(await screen.findByText(/Confirm Destructive Action/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Cancel action/i }));

    await waitFor(() => {
      expect(cancelCommandMock).toHaveBeenCalledWith('op-session-cancel');
    });
    expect(confirmCommandMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/cancel session cancelled. No data was changed/i)).toBeInTheDocument();
  });

  it('hydrates selected-client daily context from Clients & Team and sends targetUserId', async () => {
    renderPage(
      '/dashboard/admin/coach-assistant?clientId=424242&intent=log_workout&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D424242',
    );

    const composer = screen.getByPlaceholderText('Ask Swan Coach, paste notes, or attach audio/transcript...');

    await waitFor(() => {
      expect((composer as HTMLTextAreaElement).value).toContain('Client #424242');
    });

    expect(screen.getAllByText(/Client #424242/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/daily log context loaded/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /^Prepare$/i }));

    await waitFor(() => {
      expect(sendMessageWithConversationMock).toHaveBeenCalledWith(
        expect.stringContaining('Client #424242'),
        'coach_assistant',
        expect.stringContaining('Client #424242'),
        424242,
        'both',
      );
    });
  });

  it('preserves selected-client daily context when a coach replaces the prefilled prompt', async () => {
    renderPage(
      '/dashboard/admin/coach-assistant?clientId=424242&intent=log_workout&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D424242',
    );

    const composer = screen.getByPlaceholderText('Ask Swan Coach, paste notes, or attach audio/transcript...');

    await waitFor(() => {
      expect((composer as HTMLTextAreaElement).value).toContain('Client #424242');
    });

    fireEvent.change(composer, {
      target: { value: 'Bench press 3 sets of 10 at 135, RPE 7.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Prepare$/i }));

    await waitFor(() => {
      expect(sendMessageWithConversationMock).toHaveBeenCalledWith(
        expect.stringContaining('Client #424242 daily workout log'),
        'coach_assistant',
        expect.stringContaining('Client #424242'),
        424242,
        'both',
      );
    });
    const [message] = sendMessageWithConversationMock.mock.calls[0];
    expect(message).toContain('Prepare a review-gated workout_log proposal');
    expect(message).toContain('Operator command:');
    expect(message).toContain('Bench press 3 sets of 10 at 135, RPE 7.');
  });

  it('carries schedule context from the command route into command and chat lanes', async () => {
    renderPage(
      '/dashboard/admin/coach-assistant?clientId=424242&intent=log_workout&source=master-schedule&sessionId=777&sessionDate=2026-06-07&sessionCredits=2',
    );

    const composer = screen.getByPlaceholderText('Ask Swan Coach, paste notes, or attach audio/transcript...');

    await waitFor(() => {
      expect((composer as HTMLTextAreaElement).value).toContain('booked session #777');
    });

    fireEvent.change(composer, {
      target: { value: 'Bench press 3 sets of 10 at 135, RPE 7.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Prepare$/i }));

    await waitFor(() => {
      expect(sendMessageWithConversationMock).toHaveBeenCalledWith(
        expect.stringContaining('booked session #777'),
        'coach_assistant',
        expect.stringContaining('Client #424242'),
        424242,
        'both',
        null,
        {
          scheduledSessionId: '777',
          scheduledSessionDate: '2026-06-07',
          scheduledSessionCredits: 2,
        },
      );
    });

    executeCommandMock.mockClear();
    executeCommandMock.mockResolvedValueOnce({
      type: 'executed',
      command: 'log_workout',
      result: { workoutId: 88 },
      client: { id: 424242 },
    });
    fireEvent.change(composer, { target: { value: 'Log workout: squats 3 sets of 10.' } });
    fireEvent.click(screen.getByRole('button', { name: /^Prepare$/i }));

    await waitFor(() => {
      expect(executeCommandMock).toHaveBeenCalledWith('Log workout: squats 3 sets of 10.', {
        selectedClientId: 424242,
        routeContext: {
          source: 'coach-command-center',
          intent: 'log_workout',
          scheduledSessionId: '777',
          scheduledSessionDate: '2026-06-07',
          scheduledSessionCredits: 2,
        },
      });
    });
  });

  it('offers a one-click return to the selected Client Hub route from Clients & Team', async () => {
    renderPage(
      '/dashboard/admin/coach-assistant?clientId=424242&intent=log_workout&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D424242',
    );

    const returnLink = await screen.findByRole('link', { name: /back to client hub/i });

    expect(returnLink).toHaveAttribute(
      'href',
      '/dashboard/admin/client-management?clientId=424242',
    );
  });

  it('hydrates new-client onboarding context from Client Hub', async () => {
    renderPage(
      '/dashboard/admin/coach-assistant?intent=client_onboarding&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management',
    );

    const composer = screen.getByPlaceholderText('Ask Swan Coach, paste notes, or attach audio/transcript...');

    await waitFor(() => {
      expect((composer as HTMLTextAreaElement).value).toContain('New client onboarding intake');
    });

    expect(screen.getAllByText(/New client onboarding context loaded/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /^Prepare$/i }));

    await waitFor(() => {
      expect(sendMessageWithConversationMock).toHaveBeenCalledWith(
        expect.stringContaining('client_onboarding proposal'),
        'coach_assistant',
        'New client onboarding',
        null,
        'both',
      );
    });
  });

  it('does not show static workout or nutrition proof when selected-client data has not been loaded', () => {
    renderPage('/dashboard/admin/coach-assistant?clientId=424242&intent=log_workout&source=clients-team');

    const commandRail = screen.getByLabelText('Coach threads and command modes');

    expect(within(commandRail).queryByText('12 sessions')).not.toBeInTheDocument();
    expect(within(commandRail).queryByText('context on')).not.toBeInTheDocument();
    expect(within(commandRail).getByText('Workout context')).toBeInTheDocument();
    expect(within(commandRail).getByText('ready to log')).toBeInTheDocument();
    expect(within(commandRail).getByText('Nutrition context')).toBeInTheDocument();
    expect(within(commandRail).getByText('review gated')).toBeInTheDocument();
  });

  it('opens and closes mobile drawers with aria-expanded and Escape handling', () => {
    renderPage();

    const drawerTrigger = screen.getByRole('button', { name: /^Threads$/i, hidden: true });
    expect(drawerTrigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(drawerTrigger);
    expect(drawerTrigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(drawerTrigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('uses the unified Coach intake queue and embeds the PLAUD merge workflow in the admin console', () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=plaud&mergeRequestId=11111111-2222-3333-4444-555555555555');

    expect(useCoachIntakeQueueMock).toHaveBeenCalledWith({ scope: 'actionable', limit: 12 });
    expect(screen.getByText(/Unified PLAUD and Coach intake queue/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Review next ready intake/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('mock-coach-intake-workspace')).toHaveTextContent('Unified actionable 9');
    expect(screen.getByTestId('mock-plaud-merge-workspace')).toHaveAttribute('data-embedded', 'true');
    expect(screen.getByTestId('mock-plaud-merge-workspace')).toHaveTextContent('11111111-2222-3333-4444-555555555555');
  });

  it('shows real queue counts in the operations rail instead of static prototype values', () => {
    renderPage();

    const operationsRail = screen.getByLabelText('Coach operations rail');

    expect(within(operationsRail).getByText('Ready drafts').closest('li')).toHaveTextContent('3');
    expect(within(operationsRail).getByText('Client confirmation holds').closest('li')).toHaveTextContent('1');
    expect(within(operationsRail).getByText('Clarification holds').closest('li')).toHaveTextContent('5');
    expect(within(operationsRail).getByText('Duplicate-risk holds').closest('li')).toHaveTextContent('2');
  });

  it('creates a minimal client stub from the command rail and stages the composer for approved follow-up', async () => {
    renderPage();

    expect(within(screen.getByLabelText('Client source')).getByRole('option', { name: 'External' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Client name'), { target: { value: 'Ava Stone' } });
    fireEvent.change(screen.getByLabelText('Client source'), { target: { value: 'external' } });
    fireEvent.click(screen.getByRole('button', { name: /Create stub client/i }));

    await waitFor(() => {
      expect(createQuickCoachCommandClientMock).toHaveBeenCalledWith({
        fullName: 'Ava Stone',
        clientSource: 'external',
      });
    });

    expect(screen.getByPlaceholderText('Ask Swan Coach, paste notes, or attach audio/transcript...')).toHaveValue(
      'Continue Ava Stone with review-gated context.',
    );
    expect(screen.getAllByText(/Ava Stone - client stub ready/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/No workout log was written/i).length).toBeGreaterThan(0);
  });
});
