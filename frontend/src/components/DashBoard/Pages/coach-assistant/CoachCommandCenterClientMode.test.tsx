import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  executeCommandMock,
  listConversationsMock,
  renderPage,
  resetCoachCommandCenterMocks,
  sendMessageWithConversationMock,
  useCoachIntakeQueueMock,
} from './CoachCommandCenterPage.test.harness';

const composerInput = () => screen.getByPlaceholderText(/Talk or type to Swan Coach/i);
const sendButton = () => screen.getByRole('button', { name: /send to swan coach/i });
const openCommandTools = () => {
  fireEvent.click(screen.getByRole('button', { name: /^More command tools$/i }));
  return screen.getByRole('menu', { name: /^More command tools$/i });
};

describe('CoachCommandCenterPage client mode', () => {
  beforeEach(resetCoachCommandCenterMocks);

  it('renders a client-safe talk bridge without operator-only tabs, drawer, or PLAUD import', () => {
    renderPage('/dashboard/client/coach-assistant?teachPrompt=Teach%20me%20today', 'client');

    expect(listConversationsMock).toHaveBeenCalledWith('active', true);
    expect(useCoachIntakeQueueMock).toHaveBeenCalledWith({ scope: 'actionable', limit: 12, enabled: false });
    expect(screen.getByText(/Your coach terminal/i)).toBeInTheDocument();
    expect(screen.getAllByText(/My training/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /^New coach chat$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Talk$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^History$/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /^Review/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^More coach actions$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Onboard client$/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Coach header quick actions')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Workout surfaces')).not.toBeInTheDocument();

    const tools = openCommandTools();
    expect(within(tools).queryByRole('menuitem', { name: /^Audio$/i })).not.toBeInTheDocument();
    expect(within(tools).getByRole('menuitem', { name: /^Open workout logger$/i }))
      .toHaveAttribute('href', '/dashboard/client/log-workout?loadPlan=today');
    expect(within(tools).getByRole('menuitem', { name: /^Open workout planner$/i }))
      .toHaveAttribute('href', '/dashboard/client/workouts');
    expect(within(tools).getByRole('menuitemcheckbox', { name: /Voice replies off/i })).toBeInTheDocument();
    expect(screen.getByText(/Next: Log today or choose the next safe move/i)).toBeInTheDocument();
  });

  it('keeps client prompts in chat instead of sending them through the admin command lane', async () => {
    renderPage('/dashboard/client/coach-assistant', 'client');

    fireEvent.change(composerInput(), { target: { value: 'List active clients' } });
    fireEvent.click(sendButton());

    await waitFor(() => {
      expect(sendMessageWithConversationMock).toHaveBeenCalledWith(
        'List active clients',
        'coach_assistant',
        'Friday intake cleanup',
        null,
        'both',
      );
    });
    expect(executeCommandMock).not.toHaveBeenCalled();
  });

  it('hydrates a client teach prompt and preserves a safe sourcePath return', async () => {
    const clientPrompt = 'Teach me my community tab and tell me whether to log a workout next.';

    renderPage(
      `/dashboard/client/coach-assistant?sourcePath=%2Fdashboard%2Fclient%2Fcommunity&teachPrompt=${encodeURIComponent(clientPrompt)}`,
      'client',
    );

    const composer = composerInput();
    await waitFor(() => {
      expect((composer as HTMLTextAreaElement).value).toBe(clientPrompt);
    });

    expect(screen.getAllByText(/Coach route prompt loaded/i).length).toBeGreaterThan(0);
    expect(await screen.findByRole('link', { name: /back to client dashboard/i }))
      .toHaveAttribute('href', '/dashboard/client/community');
  });

  it('hydrates the client current-workout Coach handoff and returns to overview', async () => {
    const assignmentPrompt = [
      'Client overview current assignment: Coach Homework Lower Strength.',
      'Position: 6 Month Primary, Week 2, Day 3.',
      'Type: homework.',
      'First exercise: Goblet Squat.',
      'Do not claim the workout was logged until I save it in the Workout Logger.',
    ].join(' ');

    renderPage(
      `/dashboard/client/coach-assistant?intent=log_self_workout&source=client-dashboard&returnTo=%2Fdashboard%2Fclient%2Foverview&teachPrompt=${encodeURIComponent(assignmentPrompt)}`,
      'client',
    );

    const composer = composerInput();
    await waitFor(() => {
      expect((composer as HTMLTextAreaElement).value).toBe(assignmentPrompt);
    });

    expect(await screen.findByRole('link', { name: /back to client dashboard/i }))
      .toHaveAttribute('href', '/dashboard/client/overview');
    expect(screen.queryByRole('button', { name: /^More coach actions$/i })).not.toBeInTheDocument();
  });
});
