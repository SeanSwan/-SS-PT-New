import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createQuickCoachCommandClientMock,
  executeCommandMock,
  renderPage,
  resetCoachCommandCenterMocks,
  sendMessageWithConversationMock,
  useCoachIntakeQueueMock,
} from './CoachCommandCenterPage.test.harness';

describe('CoachCommandCenterPage route context', () => {
  beforeEach(resetCoachCommandCenterMocks);

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

    fireEvent.click(screen.getByRole('button', { name: /^Prepare review$/i }));

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
    fireEvent.click(screen.getByRole('button', { name: /^Prepare review$/i }));

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
    fireEvent.click(screen.getByRole('button', { name: /^Prepare review$/i }));

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
    fireEvent.click(screen.getByRole('button', { name: /^Prepare review$/i }));

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
    expect(returnLink).toHaveAttribute('href', '/dashboard/admin/client-management?clientId=424242');
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

    fireEvent.click(screen.getByRole('button', { name: /^Prepare review$/i }));

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

  it('hydrates selected-client paid onboarding context from the activation queue', async () => {
    renderPage(
      '/dashboard/admin/coach-assistant?clientId=424242&intent=client_onboarding&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D424242',
    );

    const composer = screen.getByPlaceholderText('Ask Swan Coach, paste notes, or attach audio/transcript...');
    await waitFor(() => {
      expect((composer as HTMLTextAreaElement).value).toContain('Selected paid client onboarding activation');
    });

    expect((composer as HTMLTextAreaElement).value).toContain('selectedClientId');
    expect((composer as HTMLTextAreaElement).value).not.toContain('New client onboarding intake');
    expect(screen.getAllByText(/Client #424242 onboarding context loaded/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /^Prepare review$/i }));

    await waitFor(() => {
      expect(sendMessageWithConversationMock).toHaveBeenCalledWith(
        expect.stringContaining('Selected paid client onboarding activation'),
        'coach_assistant',
        'Client #424242 onboarding',
        424242,
        'both',
      );
    });
  });

  it('does not show static workout or nutrition proof when selected-client data has not been loaded', () => {
    renderPage('/dashboard/admin/coach-assistant?clientId=424242&intent=log_workout&source=clients-team');

    const commandRail = screen.getByLabelText('Coach threads and selected client context');
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
    expect(within(operationsRail).getByRole('heading', { name: /Operator controls/i })).toBeInTheDocument();
    expect(within(operationsRail).getByRole('heading', { name: /Queue snapshot/i })).toBeInTheDocument();
    expect(within(operationsRail).queryByText(/Use Nutrition Context/i)).not.toBeInTheDocument();
    expect(within(operationsRail).queryByRole('heading', { name: /Next operator action/i })).not.toBeInTheDocument();
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
