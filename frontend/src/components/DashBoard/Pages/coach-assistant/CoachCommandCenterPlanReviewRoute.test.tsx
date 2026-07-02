import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  renderPage,
  resetCoachCommandCenterMocks,
  sendMessageWithConversationMock,
} from './CoachCommandCenterPage.test.harness';

const composerInput = () => screen.getByPlaceholderText(/Talk or type to Swan Coach/i);

describe('CoachCommandCenterPage plan review route', () => {
  beforeEach(resetCoachCommandCenterMocks);

  it('hydrates a Build Plan review prompt and returns to Build Plan', async () => {
    const prompt = [
      'Build Plan generated day review.',
      'Client #42.',
      'Day 2 lower body strength.',
      'Goblet Squat - 3 x 8.',
      'Do not claim anything was logged.',
    ].join(' ');

    renderPage(
      `/dashboard/admin/coach-assistant?clientId=42&intent=plan_review&source=admin-workout-planner&returnTo=%2Fdashboard%2Fadmin%2Fworkout-planner%3FclientId%3D42&teachPrompt=${encodeURIComponent(prompt)}`,
    );

    const composer = composerInput();
    await waitFor(() => {
      expect((composer as HTMLTextAreaElement).value).toContain('Build Plan generated day review');
    });

    expect(screen.getAllByText(/Build Plan review context loaded/i).length).toBeGreaterThan(0);
    expect(await screen.findByRole('link', { name: /back to build plan/i }))
      .toHaveAttribute('href', '/dashboard/admin/workout-planner?clientId=42');

    fireEvent.change(composer, { target: { value: 'Check if Day 2 is safe to log.' } });
    fireEvent.click(screen.getByRole('button', { name: /send to swan coach/i }));

    await waitFor(() => {
      expect(sendMessageWithConversationMock).toHaveBeenCalledWith(
        expect.stringContaining('Build Plan generated day review'),
        'coach_assistant',
        'Client #42 Build Plan review',
        42,
        'both',
        null,
        {
          source: 'admin-workout-planner',
          intent: 'plan_review',
          surface: 'coach-command-center',
        },
      );
    });
  });
});
