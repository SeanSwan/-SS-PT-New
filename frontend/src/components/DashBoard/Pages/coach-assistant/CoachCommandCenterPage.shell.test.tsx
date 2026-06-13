import { fireEvent, screen, waitFor, within } from '@testing-library/react';
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

describe('CoachCommandCenterPage shell', () => {
  beforeEach(resetCoachCommandCenterMocks);

  it('renders command-first labels, dock actions, and approval-gated copy', () => {
    renderPage();

    expect(listConversationsMock).toHaveBeenCalledWith('active', true);
    expect(screen.getAllByText(/Swan Coach Command Center/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Coach Command Modes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Start with a workflow/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Operator next workflow/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Stage next review/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Coach Thread/i })).toBeInTheDocument();
    expect(screen.getByText(/Command input/i)).toBeInTheDocument();
    expect(screen.getByText(/One reviewed instruction at a time/i)).toBeInTheDocument();
    expect(screen.queryByText(/recorder intake/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Upload saved PLAUD clips into Swan Coach/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask Swan Coach, paste notes, or attach audio/transcript...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import PLAUD/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Attach$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Mic$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Readback$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Prepare review$/i })).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: /^Prepare review$/i }));

    expect(await screen.findByText('Get Him Moving Gently')).toBeInTheDocument();
    expect(screen.getByText('Iron Out the Kinks')).toBeInTheDocument();
    expect(screen.getByText(/Start with assisted mobility/i)).toBeInTheDocument();
    expect(screen.getByText('Structured packet')).toBeInTheDocument();
  });

  it('opens the embedded PLAUD uploader from the top command dock', () => {
    renderPage();

    const uploadInput = screen.getByTestId('plaud-uploader-input');
    const clickSpy = vi.spyOn(uploadInput, 'click');

    fireEvent.click(screen.getByRole('button', { name: /Import PLAUD/i }));

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
    fireEvent.click(screen.getByRole('button', { name: /^Prepare review$/i }));

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

    const composer = screen.getByPlaceholderText('Ask Swan Coach, paste notes, or attach audio/transcript...');
    fireEvent.change(composer, { target: { value: 'List active clients' } });
    fireEvent.click(screen.getByRole('button', { name: /^Prepare review$/i }));

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

    const composer = screen.getByPlaceholderText('Ask Swan Coach, paste notes, or attach audio/transcript...');
    fireEvent.change(composer, { target: { value: 'Create external client Ava Stone' } });
    fireEvent.click(screen.getByRole('button', { name: /^Prepare review$/i }));

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
    fireEvent.click(screen.getByRole('button', { name: /^Prepare review$/i }));

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
    fireEvent.click(screen.getByRole('button', { name: /^Prepare review$/i }));

    expect(await screen.findByText(/Confirm Destructive Action/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Cancel action/i }));

    await waitFor(() => {
      expect(cancelCommandMock).toHaveBeenCalledWith('op-session-cancel');
    });
    expect(confirmCommandMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/cancel session cancelled. No data was changed/i)).toBeInTheDocument();
  });
});
