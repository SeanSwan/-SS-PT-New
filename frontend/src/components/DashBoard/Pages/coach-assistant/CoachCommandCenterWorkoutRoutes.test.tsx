import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  renderPage,
  resetCoachCommandCenterMocks,
  sendMessageWithConversationMock,
} from './CoachCommandCenterPage.test.harness';

describe('CoachCommandCenterPage workout route actions', () => {
  beforeEach(resetCoachCommandCenterMocks);

  it('hides workout surface shortcuts until a route client is loaded', () => {
    renderPage('/dashboard/admin/coach-assistant');

    expect(screen.queryByRole('link', { name: /open workout logger/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /open workout planner/i })).not.toBeInTheDocument();
  });

  it('links route clients to the canonical client training logger and planner surfaces', () => {
    renderPage('/dashboard/admin/coach-assistant?clientId=42&intent=log_workout&source=clients-team');

    expect(screen.getByRole('link', { name: /open workout logger/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/client-management?clientId=42&tab=training&trainingSection=logger&loadPlan=today',
    );
    expect(screen.getByRole('link', { name: /open workout planner/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/workout-planner?clientId=42&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D42%26tab%3Dtraining%26trainingSection%3Dplans',
    );
  });

  it('offers a logger draft handoff for generated workout answers on a selected-client route', async () => {
    const user = userEvent.setup();
    sendMessageWithConversationMock.mockResolvedValueOnce({
      role: 'assistant',
      content: [
        'Workout for today:',
        '- Goblet squat: 3 sets x 10 reps',
        '- Push-up: 3 sets x 8 reps',
      ].join('\n'),
      timestamp: '2026-06-14T07:30:00.000Z',
    });

    renderPage('/dashboard/admin/coach-assistant?clientId=42&intent=log_workout&source=clients-team');

    await user.type(screen.getByPlaceholderText(/talk or type to swan coach/i), 'Write today workout');
    await user.click(screen.getByRole('button', { name: /send to swan coach/i }));

    expect(await screen.findByRole('link', { name: /send 2 exercises to logger/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/client-management?clientId=42&tab=training&trainingSection=logger&loadPlan=today',
    );
  });
});
