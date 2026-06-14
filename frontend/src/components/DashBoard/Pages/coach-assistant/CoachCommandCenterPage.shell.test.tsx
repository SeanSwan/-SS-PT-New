import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cancelCommandMock,
  confirmCommandMock,
  executeCommandMock,
  listConversationsMock,
  loadConversationMock,
  renderPage,
  resetCoachCommandCenterMocks,
  sendMessageWithConversationMock,
} from './CoachCommandCenterPage.test.harness';

const PLACEHOLDER = 'Talk or type to Swan Coach…';
const composerInput = () => screen.getByPlaceholderText(PLACEHOLDER);
const sendButton = () => screen.getByRole('button', { name: /send to swan coach/i });

describe('CoachCommandCenterPage shell', () => {
  beforeEach(resetCoachCommandCenterMocks);

  it('renders the chat-first command bridge: client switcher, tabs, dock, and welcome', () => {
    renderPage();

    expect(listConversationsMock).toHaveBeenCalledWith('active', true);

    // Client switcher is the focal point
    expect(screen.getByText(/Now coaching/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New client \/ conversation/i })).toBeInTheDocument();

    // Section tabs (heavy ops moved off the default view)
    expect(screen.getByRole('button', { name: /^Chat$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Intake/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^PLAUD/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^History/i })).toBeInTheDocument();

    // No ops-dashboard banner / duplicate command-center title
    expect(screen.queryByText(/review-gated operator console/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Operator next workflow/i)).not.toBeInTheDocument();

    // Chat welcome + voice-forward dock
    expect(screen.getByText(/Ready when you are/i)).toBeInTheDocument();
    expect(composerInput()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Attach$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import PLAUD/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Readback$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /voice dictation/i })).toBeInTheDocument();
    expect(sendButton()).toBeInTheDocument();

    // Quick intents + next-best-action
    expect(screen.getByRole('button', { name: /^Log workout$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Onboard client$/i })).toBeInTheDocument();
    expect(screen.getByText(/Next: Review next ready intake/i)).toBeInTheDocument();
  });

  it('moves the heavy operator surfaces off the default chat view into tabs', () => {
    renderPage();

    expect(screen.queryByTestId('mock-coach-intake-workspace')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-plaud-merge-workspace')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Intake/i }));
    expect(screen.getByTestId('mock-coach-intake-workspace')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^PLAUD/i }));
    expect(screen.getByTestId('mock-plaud-merge-workspace')).toBeInTheDocument();
  });

  it('formats long coach responses into readable steps and keeps structured packets collapsed', async () => {
    sendMessageWithConversationMock.mockResolvedValueOnce({
      role: 'assistant',
      content:
        '1. **Get Him Moving Gently:** Start with assisted mobility and controlled tempo work. 2. **Iron Out the Kinks:** Add stability work before loading. {"action":"coach_action_proposal","schema_version":"2026-05-07","proposal_type":"client_onboarding"}',
      timestamp: '2026-05-14T12:00:00.000Z',
    });
    renderPage();

    fireEvent.change(composerInput(), { target: { value: 'Prepare readable review.' } });
    fireEvent.click(sendButton());

    expect(await screen.findByText('Get Him Moving Gently')).toBeInTheDocument();
    expect(screen.getByText('Iron Out the Kinks')).toBeInTheDocument();
    expect(screen.getByText(/Start with assisted mobility/i)).toBeInTheDocument();
    expect(screen.getByText('Structured packet')).toBeInTheDocument();
  });

  it('opens the PLAUD upload lane from the dock PLAUD action', async () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
    renderPage();

    expect(screen.queryByTestId('mock-plaud-merge-workspace')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Import PLAUD/i }));
    expect(screen.getByTestId('mock-plaud-merge-workspace')).toBeInTheDocument();
    await waitFor(() => expect(clickSpy).toHaveBeenCalled());
    clickSpy.mockRestore();
  });

  it('uses real conversation threads as one-tap client switches that update the dock and status', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Friday intake cleanup/i }));

    expect(composerInput()).toHaveValue('Continue Friday intake cleanup with review-gated context.');
    expect(loadConversationMock).toHaveBeenCalledWith(101);
    expect(screen.getAllByText(/Friday intake cleanup - thread loaded/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Friday intake cleanup/i })).toHaveAttribute('aria-current', 'true');
  });

  it('submits the command dock through the real coach conversation API', async () => {
    renderPage();

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
    renderPage();

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
    renderPage();

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
    renderPage();

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
    renderPage();

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
