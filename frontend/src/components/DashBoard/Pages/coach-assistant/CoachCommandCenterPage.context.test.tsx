import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  executeCommandMock,
  renderPage,
  resetCoachCommandCenterMocks,
  sendMessageWithConversationMock,
} from './CoachCommandCenterPage.test.harness';
const COACH_COMMAND_CENTER_TEST_TIMEOUT = 15000;

const PLACEHOLDER = 'Talk or type to Swan Coach...';
const composerInput = () => screen.getByPlaceholderText(PLACEHOLDER);
const sendButton = () => screen.getByRole('button', { name: /send to swan coach/i });

describe('CoachCommandCenterPage route context', () => {
  beforeEach(resetCoachCommandCenterMocks);

  it('hydrates selected-client daily context from Clients & Team and sends targetUserId', async () => {
    renderPage(
      '/dashboard/admin/coach-assistant?clientId=424242&intent=log_workout&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D424242',
    );

    const composer = composerInput();
    await waitFor(() => {
      expect((composer as HTMLTextAreaElement).value).toContain('Client #424242');
    });

    expect(screen.getAllByText(/Client #424242/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/daily log context loaded/i).length).toBeGreaterThan(0);

    fireEvent.click(sendButton());

    await waitFor(() => {
      expect(sendMessageWithConversationMock).toHaveBeenCalledWith(
        expect.stringContaining('Client #424242'),
        'coach_assistant',
        expect.stringContaining('Client #424242'),
        424242,
        'both',
      );
    });
  }, COACH_COMMAND_CENTER_TEST_TIMEOUT);

  it('preserves selected-client daily context when a coach replaces the prefilled prompt', async () => {
    renderPage(
      '/dashboard/admin/coach-assistant?clientId=424242&intent=log_workout&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D424242',
    );

    const composer = composerInput();
    await waitFor(() => {
      expect((composer as HTMLTextAreaElement).value).toContain('Client #424242');
    });

    fireEvent.change(composer, {
      target: { value: 'Bench press 3 sets of 10 at 135, RPE 7.' },
    });
    fireEvent.click(sendButton());

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

    const composer = composerInput();
    await waitFor(() => {
      expect((composer as HTMLTextAreaElement).value).toContain('booked session #777');
    });

    fireEvent.change(composer, {
      target: { value: 'Bench press 3 sets of 10 at 135, RPE 7.' },
    });
    fireEvent.click(sendButton());

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
    fireEvent.click(sendButton());

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
      '/dashboard/admin/coach-assistant?clientId=424242&intent=log_workout&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D424242%26tab%3Dtraining%26trainingSection%3Dlogger%26loadPlan%3Dtoday',
    );

    const returnLink = await screen.findByRole('link', { name: /back to client hub/i });
    expect(returnLink).toHaveAttribute(
      'href',
      '/dashboard/admin/client-management?clientId=424242&tab=training&trainingSection=logger&loadPlan=today',
    );
  });

  it('hydrates new-client onboarding context from Client Hub', async () => {
    renderPage(
      '/dashboard/admin/coach-assistant?intent=client_onboarding&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management',
    );

    const composer = composerInput();
    await waitFor(() => {
      expect((composer as HTMLTextAreaElement).value).toContain('New client onboarding intake');
    });

    expect(screen.getAllByText(/New client onboarding context loaded/i).length).toBeGreaterThan(0);

    fireEvent.click(sendButton());

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

    const composer = composerInput();
    await waitFor(() => {
      expect((composer as HTMLTextAreaElement).value).toContain('Selected paid client onboarding activation');
    });

    expect((composer as HTMLTextAreaElement).value).toContain('selectedClientId');
    expect((composer as HTMLTextAreaElement).value).not.toContain('New client onboarding intake');
    expect(screen.getAllByText(/Client #424242 onboarding context loaded/i).length).toBeGreaterThan(0);

    fireEvent.click(sendButton());

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

  it('hydrates admin overview command triage without requiring a selected client', async () => {
    renderPage(
      '/dashboard/admin/coach-assistant?intent=admin_daily_command&source=admin-overview&returnTo=%2Fdashboard%2Fadmin%2Foverview',
    );

    const composer = composerInput();
    await waitFor(() => {
      expect((composer as HTMLTextAreaElement).value).toContain('Admin daily command triage');
    });

    expect((composer as HTMLTextAreaElement).value).toContain('client logging');
    expect((composer as HTMLTextAreaElement).value).toContain('review-gated');
    expect(screen.getAllByText(/Admin daily command context loaded/i).length).toBeGreaterThan(0);
    expect(await screen.findByRole('link', { name: /back to admin overview/i }))
      .toHaveAttribute('href', '/dashboard/admin/overview');
  });

  it('hydrates admin self-workout context without a selected client target', async () => {
    renderPage(
      '/dashboard/admin/coach-assistant?intent=log_self_workout&source=admin-workout-logger&returnTo=%2Fdashboard%2Fadmin%2Flog-my-workout%3FloadPlan%3Dtoday&workoutDate=2026-06-18',
    );

    const composer = composerInput();
    await waitFor(() => {
      expect((composer as HTMLTextAreaElement).value).toContain('My 2026-06-18 workout log');
    });

    expect((composer as HTMLTextAreaElement).value).not.toContain('selected client');
    expect(screen.getAllByText(/My 2026-06-18 workout context loaded/i).length).toBeGreaterThan(0);
    expect(await screen.findByRole('link', { name: /back to workout logger/i }))
      .toHaveAttribute('href', '/dashboard/admin/log-my-workout?loadPlan=today');

    fireEvent.click(sendButton());

    await waitFor(() => {
      expect(sendMessageWithConversationMock).toHaveBeenCalledWith(
        expect.stringContaining('My 2026-06-18 workout log'),
        'coach_assistant',
        expect.stringContaining('My 2026-06-18 workout log'),
        null,
        'both',
        null,
        { workoutDate: '2026-06-18' },
      );
    });
  });

  it('hydrates the trainer Home command prompt and return route', async () => {
    const trainerPrompt = [
      'Teach me my trainer Home.',
      'Current trainer-day snapshot: 4 sessions today; 3 clients today; 25% complete; next booked client needs action.',
      'Keep the answer low-click.',
    ].join(' ');

    renderPage(
      `/dashboard/trainer/coach-assistant?intent=trainer_daily_command&source=trainer-overview&returnTo=%2Fdashboard%2Ftrainer%2Foverview&teachPrompt=${encodeURIComponent(trainerPrompt)}`,
      'trainer',
    );

    const composer = composerInput();
    await waitFor(() => {
      expect((composer as HTMLTextAreaElement).value).toBe(trainerPrompt);
    });

    expect(screen.getAllByText(/Trainer day command context loaded/i).length).toBeGreaterThan(0);
    expect(await screen.findByRole('link', { name: /back to trainer home/i }))
      .toHaveAttribute('href', '/dashboard/trainer/overview');
  });

});
