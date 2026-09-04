import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cancelCommandMock,
  apiPostMock,
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
const PLACEHOLDER = 'Talk or type to Swan Coach...';
const composerInput = () => screen.getByPlaceholderText(PLACEHOLDER);
const sendButton = () => screen.getByRole('button', { name: /send to swan coach/i });
const openCommandTools = () => {
  fireEvent.click(screen.getByRole('button', { name: /^More command tools$/i }));
  return screen.getByRole('menu', { name: /^More command tools$/i });
};
describe('CoachCommandCenterPage shell', () => {
  beforeEach(resetCoachCommandCenterMocks);
  it('renders Floor Mode with Talk, Review, History, and a minimal command dock', () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');
    expect(listConversationsMock).toHaveBeenCalledWith('active', true);
    expect(screen.getByText(/Now coaching/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^New chat$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^More coach actions$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Talk$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Review/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^History$/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /^Intake/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /^PLAUD/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /^Workbench/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Talk to Swan Coach/i)).toBeInTheDocument();
    expect(screen.getByText(/Log today's workout: bench 4x8 at 185/i)).toBeInTheDocument();
    expect(screen.getByText(/Nothing saves until you confirm/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Use suggestion: Log workout/i })).toBeInTheDocument();
    expect(screen.queryByText(/Ready when you are/i)).not.toBeInTheDocument();
    expect(composerInput()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^More command tools$/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /^Review intake$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start voice dictation/i })).toBeInTheDocument();
    expect(sendButton()).toBeInTheDocument();
    expect(screen.getByText(/Confirm before save/i)).toBeInTheDocument();
  }, COACH_COMMAND_CENTER_TEST_TIMEOUT);

  it('keeps secondary tools inside the dock More menu', () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');
    const menu = openCommandTools();
    expect(within(menu).getByRole('menuitem', { name: /^Review intake$/i })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: /^Import audio$/i })).toBeInTheDocument();
    expect(within(menu).queryByText(/PLAUD/i)).not.toBeInTheDocument();
    expect(within(menu).queryByRole('menuitem', { name: /^Readback help$/i })).not.toBeInTheDocument();
    expect(within(menu).getByRole('menuitemcheckbox', { name: /Read replies aloud/i })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: /Open workout logger/i })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: /Open Workout Planner/i })).toBeInTheDocument();
  });
  it('turns empty transcript suggestions into composer drafts without submitting', () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');
    fireEvent.click(screen.getByRole('button', { name: /Use suggestion: Log workout/i }));
    expect(composerInput()).toHaveValue("Log today's workout: ");
    expect(composerInput()).toHaveFocus();
    expect(sendMessageWithConversationMock).not.toHaveBeenCalled();
  });

  it('closes the dock More menu with Escape and returns focus to the trigger', () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');
    const moreButton = screen.getByRole('button', { name: /^More command tools$/i });
    fireEvent.click(moreButton);
    const menu = screen.getByRole('menu', { name: /^More command tools$/i });
    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(screen.queryByRole('menu', { name: /^More command tools$/i })).not.toBeInTheDocument();
    expect(moreButton).toHaveFocus();
  });
  it('supports arrow, Home, and End keyboard movement inside the dock More menu', async () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');
    const menu = openCommandTools();
    // v2 P1.3: the command catalog entry leads the menu.
    const catalog = within(menu).getByRole('menuitem', { name: /^What can I say\?$/i });
    const reviewIntake = within(menu).getByRole('menuitem', { name: /^Review intake$/i });
    const buildPlan = within(menu).getByRole('menuitem', { name: /Open Workout Planner/i });
    await waitFor(() => expect(catalog).toHaveFocus());
    fireEvent.keyDown(catalog, { key: 'ArrowDown' });
    expect(reviewIntake).toHaveFocus();
    fireEvent.keyDown(reviewIntake, { key: 'End' });
    expect(buildPlan).toHaveFocus();
    fireEvent.keyDown(buildPlan, { key: 'Home' });
    expect(catalog).toHaveFocus();
  });

  it('opens the intake review lane from the dock More menu and moves focus to the review workspace', async () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');
    fireEvent.click(within(openCommandTools()).getByRole('menuitem', { name: /^Review intake$/i }));
    expect(screen.getByRole('tab', { name: /^Review/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('mock-coach-intake-workspace')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('tabpanel', { name: /^Review/i })).toHaveFocus());
    fireEvent.click(screen.getByRole('tab', { name: /^Talk$/i }));
    expect(within(document.querySelector('.transcript-stream') as HTMLElement).getByText(/Intake review lane opened for notes/i)).toBeInTheDocument();
  });

  it('groups intake, audio, and draft work under Review', () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    fireEvent.click(screen.getByRole('tab', { name: /^Review/i }));
    expect(screen.getByRole('heading', { name: /^Review$/i })).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: /Review sections/i })).queryByText(/PLAUD/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-coach-intake-workspace')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-plaud-merge-workspace')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /open intake review queue/i }));
    expect(screen.getByTestId('mock-coach-intake-workspace')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /open audio import review/i }));
    expect(screen.getByTestId('mock-plaud-merge-workspace')).toBeInTheDocument();
  });

  it('keeps user composer text untouched when Review is opened and Talk resumes', () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    fireEvent.change(composerInput(), { target: { value: 'Manual coach draft stays mine.' } });
    fireEvent.click(screen.getByRole('tab', { name: /^Review/i }));
    expect(screen.queryByPlaceholderText(PLACEHOLDER)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /^Talk$/i }));
    expect(composerInput()).toHaveValue('Manual coach draft stays mine.');
    expect(sendMessageWithConversationMock).not.toHaveBeenCalled();
  });

  it('opens the audio upload review lane from the dock More menu', async () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    expect(screen.queryByTestId('mock-plaud-merge-workspace')).not.toBeInTheDocument();
    fireEvent.click(within(openCommandTools()).getByRole('menuitem', { name: /^Import audio$/i }));
    expect(screen.getByTestId('mock-plaud-merge-workspace')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('tabpanel', { name: /^Review/i })).toHaveFocus());
    await waitFor(() => expect(clickSpy).toHaveBeenCalled());
    clickSpy.mockRestore();
  });

  it('keeps thread switching in History and returns to Talk without staging a prompt', async () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    fireEvent.click(screen.getByRole('tab', { name: /^History/i }));
    const historyPanel = document.getElementById('coach-tabpanel-history') as HTMLElement;
    fireEvent.click(within(historyPanel).getByRole('button', { name: /Friday intake cleanup/i }));

    expect(composerInput()).toHaveValue('');
    expect(loadConversationMock).toHaveBeenCalledWith(101);
    await waitFor(() => expect(screen.getByRole('tab', { name: /^Talk$/i })).toHaveAttribute('aria-selected', 'true'));
    expect(screen.getAllByText(/Friday intake cleanup - thread loaded/i).length).toBeGreaterThan(0);
  });

  it('starts a new conversation without inserting canned composer text', () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    fireEvent.change(composerInput(), { target: { value: 'Keep this user-authored draft out of new chat.' } });
    fireEvent.click(screen.getByRole('button', { name: /^New chat$/i }));

    expect(newChatMock).toHaveBeenCalled();
    expect(composerInput()).toHaveValue('');
    expect(screen.getAllByText(/New Coach Thread ready/i).length).toBeGreaterThan(0);
  });

  it('renders loaded history messages in the conversation transcript', () => {
    setCoachCommandCenterActiveConversation();
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    expect(screen.getByText(/We reviewed Ava squat pattern and left knee note/i)).toBeInTheDocument();
    expect(within(document.querySelector('.transcript-stream') as HTMLElement).getByText(/check pain before loading/i)).toBeInTheDocument();
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
        inputMode: 'text',
      });
    });

    expect(sendMessageWithConversationMock).not.toHaveBeenCalled();
    expect(within(document.querySelector('.transcript-stream') as HTMLElement).getByText(/2 of 2 active clients loaded/i)).toBeInTheDocument();
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

    expect(await screen.findByText(/Cancel session 42/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('confirmation-sheet').dataset.state).toBe('ready'), { timeout: 5000 });
    fireEvent.click(screen.getByTestId('confirm-button'));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith('/api/ai-command/confirm', expect.objectContaining({
        operationId: 'op-session-42',
        confirmChannel: 'tap',
        renderedDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
      }));
    });
    expect(confirmCommandMock).not.toHaveBeenCalled();
    expect(await within(document.querySelector('.transcript-stream') as HTMLElement).findByText(/Session #42 cancelled for Ava/i)).toBeInTheDocument();
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

    expect(await screen.findByText(/Cancel session 43/i)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cancel-button'));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith('/api/ai-command/cancel', { operationId: 'op-session-cancel' });
    });
    expect(cancelCommandMock).not.toHaveBeenCalled();
    expect(confirmCommandMock).not.toHaveBeenCalled();
    expect(await within(document.querySelector('.transcript-stream') as HTMLElement).findByText(/cancel session cancelled. No data was changed/i)).toBeInTheDocument();
  });
});
