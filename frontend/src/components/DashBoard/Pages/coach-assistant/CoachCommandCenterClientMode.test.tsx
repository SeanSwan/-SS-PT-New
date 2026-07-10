import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  executeCommandMock,
  listConversationsMock,
  renderPage,
  resetCoachCommandCenterMocks,
  sendMessageWithConversationMock,
  useCoachIntakeQueueMock,
  useAIChatMock,
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
    expect(screen.queryByRole('button', { name: /Use suggestion: Onboard client/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Use suggestion: Plan next workout/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Coach header quick actions')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Workout surfaces')).not.toBeInTheDocument();

    const tools = openCommandTools();
    expect(within(tools).queryByRole('menuitem', { name: /^Review intake$/i })).not.toBeInTheDocument();
    expect(within(tools).queryByRole('menuitem', { name: /^Import audio$/i })).not.toBeInTheDocument();
    expect(within(tools).getByRole('menuitem', { name: /^Open workout logger$/i }))
      .toHaveAttribute('href', '/dashboard/client/log-workout?loadPlan=today');
    expect(within(tools).getByRole('menuitem', { name: /^Open workouts$/i }))
      .toHaveAttribute('href', '/dashboard/client/workouts');
    expect(within(tools).getByRole('menuitemcheckbox', { name: /Read replies aloud/i })).toBeInTheDocument();
    expect(screen.getByText(/Next: Log today or choose the next safe move/i)).toBeInTheDocument();
  });

  it('never exposes an operator Review action that can blank the client workspace', () => {
    renderPage('/dashboard/client/coach-assistant', 'client');

    const tools = openCommandTools();

    expect(within(tools).queryByRole('menuitem', { name: /^Review intake$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('tabpanel', { name: /^Talk$/i })).toBeInTheDocument();
    expect(screen.getByRole('form', { name: /Talk to Swan Coach/i })).toBeInTheDocument();
  });

  it('keeps the client History rail free of staff-only route and approval copy', () => {
    renderPage('/dashboard/client/coach-assistant', 'client');

    fireEvent.click(screen.getByRole('tab', { name: /^History$/i }));
    const history = screen.getByRole('complementary', { name: /Coach threads and selected client context/i });

    expect(within(history).getByText('client / coach-assistant')).toBeInTheDocument();
    expect(within(history).getByText('Swan Coach History')).toBeInTheDocument();
    expect(within(history).getByRole('button', { name: /New Coach Chat/i })).toBeInTheDocument();
    expect(within(history).queryByText(/intake, drafts, holds, and approval work/i)).not.toBeInTheDocument();
    expect(within(history).queryByText('admin / coach-assistant')).not.toBeInTheDocument();
  });
  it('labels the composer and disables an empty no-op send', () => {
    renderPage('/dashboard/client/coach-assistant', 'client');

    const composer = screen.getByRole('textbox', { name: /Message Swan Coach/i });
    const send = sendButton();

    expect(send).toBeDisabled();
    fireEvent.change(composer, { target: { value: 'Show my recent training.' } });
    expect(send).toBeEnabled();
  });

  it('locks the composer and blocks Enter while Swan Coach is processing a request', () => {
    useAIChatMock.mockReturnValue({ ...useAIChatMock(), sending: true });
    renderPage('/dashboard/client/coach-assistant', 'client');

    const composer = composerInput();
    fireEvent.change(composer, { target: { value: 'Show my recent training.' } });
    fireEvent.keyDown(composer, { key: 'Enter' });

    expect(composer).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: /Sending to Swan Coach/i })).toBeDisabled();
    expect(sendMessageWithConversationMock).not.toHaveBeenCalled();
    expect(executeCommandMock).not.toHaveBeenCalled();
  });

  it.each(['admin', 'trainer'] as const)('uses client-safe Coach mode when a %s views the client dashboard', (role) => {
    renderPage('/dashboard/client/coach-assistant', role);

    expect(useCoachIntakeQueueMock).toHaveBeenCalledWith({ scope: 'actionable', limit: 12, enabled: false });
    expect(screen.getByText(/Your coach terminal/i)).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /^Review/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^More coach actions$/i })).not.toBeInTheDocument();
  });
  it('normalizes legacy raw user accounts into the client-safe Coach bridge', async () => {
    renderPage('/dashboard/client/coach-assistant?sourcePath=%2Fdashboard%2Fclient%2Fworkouts&teachPrompt=Plan%20my%20next%20workout', 'user');

    expect(useCoachIntakeQueueMock).toHaveBeenCalledWith({ scope: 'actionable', limit: 12, enabled: false });
    expect(screen.getByText(/Your coach terminal/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Operations$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /^Intake/i })).not.toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /back to client dashboard/i }))
      .toHaveAttribute('href', '/dashboard/client/workouts');
  });

  it('auto-sends pending nutrition Coach food through the mounted client command center', async () => {
    sessionStorage.setItem('swan:pending-coach-food', JSON.stringify({
      message: 'Is this protein bowl a good fit today?',
      foodContext: {
        type: 'restaurant_food',
        foodName: 'Swan Cafe Protein Bowl',
        protein: 38,
      },
    }));

    renderPage('/dashboard/client/coach-assistant', 'user');

    await waitFor(() => {
      expect(sendMessageWithConversationMock).toHaveBeenCalledWith(
        'Is this protein bowl a good fit today?',
        'macro_logging',
        'Nutrition Coach',
        null,
        'both',
        {
          type: 'restaurant_food',
          foodName: 'Swan Cafe Protein Bowl',
          protein: 38,
        },
      );
    });
    expect(sessionStorage.getItem('swan:pending-coach-food')).toBeNull();
    expect(executeCommandMock).not.toHaveBeenCalled();
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
