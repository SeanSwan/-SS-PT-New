import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cancelCommandMock,
  confirmCommandMock,
  executeCommandMock,
  listConversationsMock,
  loadConversationMock,
  newChatMock,
  renderPage,
  resetCoachCommandCenterMocks,
  sendMessageWithConversationMock,
  setCoachCommandCenterActiveConversation,
} from './CoachCommandCenterPage.test.harness';
const COACH_COMMAND_CENTER_TEST_TIMEOUT = 15000;

const PLACEHOLDER = 'Talk or type to Swan Coach…';
const composerInput = () => screen.getByPlaceholderText(PLACEHOLDER);
const sendButton = () => screen.getByRole('button', { name: /send to swan coach/i });

describe('CoachCommandCenterPage shell', () => {
  beforeEach(resetCoachCommandCenterMocks);

  it('renders the chat-first command bridge: client switcher, tabs, dock, and welcome', () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    expect(listConversationsMock).toHaveBeenCalledWith('active', true);

    // Client switcher is the focal point
    expect(screen.getByText(/Now coaching/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New client \/ conversation/i })).toBeInTheDocument();

    // Section tabs (heavy ops moved off the default view)
    expect(screen.getByRole('tab', { name: /^Chat$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Intake/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^PLAUD/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^History/i })).toBeInTheDocument();

    // No ops-dashboard banner / duplicate command-center title
    expect(screen.queryByText(/review-gated operator console/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Operator next workflow/i)).not.toBeInTheDocument();

    // Chat welcome + voice-forward dock
    expect(screen.getByText(/Ready when you are/i)).toBeInTheDocument();
    expect(composerInput()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Attach$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Import PLAUD$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Readback$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /voice dictation/i })).toBeInTheDocument();
    expect(sendButton()).toBeInTheDocument();

    // Prompt templates stay behind Teach Me; the dock keeps only real actions.
    expect(screen.queryByRole('button', { name: /^Log workout$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Onboard client$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Next: Review next ready intake/i)).toBeInTheDocument();
  }, COACH_COMMAND_CENTER_TEST_TIMEOUT);

  it('moves the heavy operator surfaces off the default chat view into tabs', () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    expect(screen.queryByTestId('mock-coach-intake-workspace')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-plaud-merge-workspace')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /^Intake/i }));
    expect(screen.getByTestId('mock-coach-intake-workspace')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /^PLAUD/i }));
    expect(screen.getByTestId('mock-plaud-merge-workspace')).toBeInTheDocument();
  });

  it('keeps user composer text untouched when the intake tab is opened', () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    fireEvent.change(composerInput(), { target: { value: 'Manual coach draft stays mine.' } });
    fireEvent.click(screen.getByRole('tab', { name: /^Intake/i }));

    expect(screen.queryByRole('button', { name: /Mock queue command/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /^Chat$/i }));

    expect(composerInput()).toHaveValue('Manual coach draft stays mine.');
    expect(sendMessageWithConversationMock).not.toHaveBeenCalled();
  });
  it.each([
    {
      label: 'no route hint with actionable intake',
      route: '/dashboard/admin/coach-assistant',
      tab: 'intake',
      activeIntakeId: 'none',
    },
    {
      label: 'explicit chat workspace',
      route: '/dashboard/admin/coach-assistant?workspace=chat',
      tab: 'chat',
    },
    {
      label: 'direct intake review',
      route: '/dashboard/admin/coach-assistant?intake=clip-111',
      tab: 'intake',
      activeIntakeId: 'clip-111',
    },
    {
      label: 'prepared draft review',
      route: '/dashboard/admin/coach-assistant?proposal=proposal-123',
      tab: 'intake',
      activeIntakeId: 'none',
    },
    {
      label: 'PLAUD workspace',
      route: '/dashboard/admin/coach-assistant?workspace=plaud',
      tab: 'plaud',
    },
    {
      label: 'direct merge review',
      route: '/dashboard/admin/coach-assistant?mergeRequestId=11111111-2222-3333-4444-555555555555',
      tab: 'plaud',
      mergeLabel: '11111111-2222-3333-4444-555555555555',
    },
    {
      label: 'review next PLAUD merge',
      route: '/dashboard/admin/coach-assistant?workspace=plaud&review=next',
      tab: 'plaud',
      mergeLabel: '11111111-2222-3333-4444-555555555555',
    },
  ])('routes $label deep link to the $tab tab', ({ route, tab, activeIntakeId, mergeLabel }) => {
    renderPage(route);

    if (tab === 'intake') {
      expect(screen.getByTestId('mock-coach-intake-workspace')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-plaud-merge-workspace')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(PLACEHOLDER)).not.toBeInTheDocument();
    }
    if (tab === 'plaud') {
      expect(screen.getByTestId('mock-plaud-merge-workspace')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-coach-intake-workspace')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(PLACEHOLDER)).not.toBeInTheDocument();
    }
    if (tab === 'chat') {
      expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument();
      expect(screen.queryByTestId('mock-coach-intake-workspace')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-plaud-merge-workspace')).not.toBeInTheDocument();
    }

    if (activeIntakeId) expect(screen.getByText(`Active intake ${activeIntakeId}`)).toBeInTheDocument();
    if (mergeLabel) expect(screen.getByText(mergeLabel)).toBeInTheDocument();
  });

  it('formats long coach responses into readable steps and keeps structured packets collapsed', async () => {
    sendMessageWithConversationMock.mockResolvedValueOnce({
      role: 'assistant',
      content:
        '1. **Get Him Moving Gently:** Start with assisted mobility and controlled tempo work. 2. **Iron Out the Kinks:** Add stability work before loading. {"action":"coach_action_proposal","schema_version":"2026-05-07","proposal_type":"client_onboarding"}',
      timestamp: '2026-05-14T12:00:00.000Z',
    });
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    fireEvent.change(composerInput(), { target: { value: 'Prepare readable review.' } });
    fireEvent.click(sendButton());

    expect(await screen.findByText('Get Him Moving Gently')).toBeInTheDocument();
    expect(screen.getByText('Iron Out the Kinks')).toBeInTheDocument();
    expect(screen.getByText(/Start with assisted mobility/i)).toBeInTheDocument();
    expect(screen.getByText('Structured packet')).toBeInTheDocument();
  });

  it('opens the PLAUD upload lane from the dock PLAUD action', async () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    expect(screen.queryByTestId('mock-plaud-merge-workspace')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Import PLAUD$/i }));
    expect(screen.getByTestId('mock-plaud-merge-workspace')).toBeInTheDocument();
    await waitFor(() => expect(clickSpy).toHaveBeenCalled());
    clickSpy.mockRestore();
  });

  it('keeps thread switching in History instead of duplicating recent chips in the header', async () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    expect(screen.queryByRole('group', { name: /recent client conversations/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /^History/i }));
    const historyPanel = document.getElementById('coach-tabpanel-history') as HTMLElement;
    fireEvent.click(within(historyPanel).getByRole('button', { name: /Friday intake cleanup/i }));

    expect(composerInput()).toHaveValue('');
    expect(loadConversationMock).toHaveBeenCalledWith(101);
    await waitFor(() => expect(screen.getByRole('tab', { name: /^Chat$/i })).toHaveAttribute('aria-selected', 'true'));
    expect(screen.getAllByText(/Friday intake cleanup - thread loaded/i).length).toBeGreaterThan(0);
  });

  it('opens a history thread into chat without staging a prompt in the composer', async () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    fireEvent.click(screen.getByRole('tab', { name: /^History/i }));
    const historyPanel = document.getElementById('coach-tabpanel-history') as HTMLElement;
    fireEvent.click(within(historyPanel).getByRole('button', { name: /Client confirmation holds/i }));

    expect(loadConversationMock).toHaveBeenCalledWith(102);
    await waitFor(() => expect(screen.getByRole('tab', { name: /^Chat$/i })).toHaveAttribute('aria-selected', 'true'));
    expect(composerInput()).toHaveValue('');
  });

  it('starts a new conversation without inserting canned composer text', () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    fireEvent.change(composerInput(), { target: { value: 'Keep this user-authored draft out of new chat.' } });
    fireEvent.click(screen.getByRole('button', { name: /New client \/ conversation/i }));

    expect(newChatMock).toHaveBeenCalled();
    expect(composerInput()).toHaveValue('');
    expect(screen.getAllByText(/New Coach Thread ready/i).length).toBeGreaterThan(0);
  });
  it('renders loaded history messages in the conversation transcript', () => {
    setCoachCommandCenterActiveConversation();
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    expect(screen.getByText(/We reviewed Ava squat pattern and left knee note/i)).toBeInTheDocument();
    expect(screen.getByText(/check pain before loading/i)).toBeInTheDocument();
  });
  it('submits the command dock through the real coach conversation API', async () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    fireEvent.change(composerInput(), { target: { value: 'Prepare today intake review.' } });
    fireEvent.click(sendButton());

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
      result: { totalCount: 2, returnedCount: 2, swanStudiosCount: 1, moveFitnessCount: 1 },
      client: null,
    });
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    fireEvent.change(composerInput(), { target: { value: 'List active clients' } });
    fireEvent.click(sendButton());

    await waitFor(() => {
      expect(executeCommandMock).toHaveBeenCalledWith('List active clients', {
        selectedClientId: null,
        routeContext: { source: 'coach-command-center', intent: null },
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
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    fireEvent.change(composerInput(), { target: { value: 'Create external client Ava Stone' } });
    fireEvent.click(sendButton());

    expect(await screen.findByText(/Prepared draft waiting/i)).toBeInTheDocument();
    expect(screen.getByText(/Review client onboarding draft/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open prepared draft/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant?proposal=proposal-123');
  });

  it('lets admins confirm command-lane approval holds from the conversation', async () => {
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
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    fireEvent.change(composerInput(), { target: { value: 'Cancel session 42' } });
    fireEvent.click(sendButton());

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
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    fireEvent.change(composerInput(), { target: { value: 'Cancel session 43' } });
    fireEvent.click(sendButton());

    expect(await screen.findByText(/Confirm Destructive Action/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Cancel action/i }));

    await waitFor(() => {
      expect(cancelCommandMock).toHaveBeenCalledWith('op-session-cancel');
    });
    expect(confirmCommandMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/cancel session cancelled. No data was changed/i)).toBeInTheDocument();
  });
});
