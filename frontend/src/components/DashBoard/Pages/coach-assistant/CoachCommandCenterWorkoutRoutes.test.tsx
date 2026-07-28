import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  renderPage,
  resetCoachCommandCenterMocks,
  sendMessageWithConversationMock,
  setCoachCommandCenterConversations,
} from './CoachCommandCenterPage.test.harness';

const openCommandTools = () => {
  fireEvent.click(screen.getByRole('button', { name: /^More command tools$/i }));
  return screen.getByRole('menu', { name: /^More command tools$/i });
};

describe('CoachCommandCenterPage workout route actions', () => {
  beforeEach(resetCoachCommandCenterMocks);

  it('offers Sean/admin personal Logger and Planner inside More when no route client is loaded', () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    const menu = openCommandTools();
    expect(within(menu).getByRole('menuitem', { name: /open workout logger/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/log-my-workout?loadPlan=today',
    );
    expect(within(menu).getByRole('menuitem', { name: /open workout planner/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/workout-planner?self=1&source=swan-coach&returnTo=%2Fdashboard%2Fadmin%2Flog-my-workout%3FloadPlan%3Dtoday',
    );
    expect(within(menu).getByRole('menuitem', { name: /open workout planner/i })).toHaveTextContent('My Planner');
  });

  it('links route clients to the canonical client training logger and planner surfaces inside More', () => {
    renderPage('/dashboard/admin/coach-assistant?clientId=42&intent=log_workout&source=clients-team');

    const menu = openCommandTools();
    expect(within(menu).getByRole('menuitem', { name: /open workout logger/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/client-management?clientId=42&tab=training&trainingSection=logger&loadPlan=today',
    );
    expect(within(menu).getByRole('menuitem', { name: /open workout planner/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/workout-planner?clientId=42&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D42%26tab%3Dtraining%26trainingSection%3Dplans',
    );
  });

  it('routes trainer command clients to trainer logger and planner surfaces inside More', () => {
    renderPage(
      '/dashboard/trainer/coach-assistant?clientId=42&intent=log_workout&source=trainer-overview&returnTo=%2Fdashboard%2Ftrainer%2Foverview',
      'trainer',
    );

    const menu = openCommandTools();
    expect(within(menu).getByRole('menuitem', { name: /open workout logger/i })).toHaveAttribute(
      'href',
      '/dashboard/trainer/log-workout?clientId=42&source=swan-coach&loadPlan=today&returnTo=%2Fdashboard%2Ftrainer%2Foverview',
    );
    expect(within(menu).getByRole('menuitem', { name: /open workout planner/i })).toHaveAttribute(
      'href',
      '/dashboard/trainer/workout-planner?clientId=42&source=swan-coach&returnTo=%2Fdashboard%2Ftrainer%2Foverview',
    );
  });

  it('routes client command actions to self logging and workout history inside More', () => {
    renderPage('/dashboard/client/coach-assistant?teachPrompt=Teach%20me%20today', 'client');

    const menu = openCommandTools();
    expect(within(menu).getByRole('menuitem', { name: /open workout logger/i })).toHaveAttribute(
      'href',
      '/dashboard/client/log-workout?loadPlan=today',
    );
    expect(within(menu).getByRole('menuitem', { name: /open workout planner/i })).toHaveAttribute(
      'href',
      '/dashboard/client/workouts',
    );
    expect(within(menu).getByRole('menuitem', { name: /open workout planner/i })).toHaveTextContent('My Workouts');
  });

  it('offers a client logger draft handoff for generated workout answers', async () => {
    const user = userEvent.setup();
    sendMessageWithConversationMock.mockResolvedValueOnce({
      role: 'assistant',
      content: [
        'Workout for today:',
        '- Bodyweight squat: 3 sets x 10 reps',
        '- Incline push-up: 3 sets x 8 reps',
      ].join('\n'),
      timestamp: '2026-06-14T08:00:00.000Z',
    });

    renderPage('/dashboard/client/coach-assistant', 'client');

    await user.type(screen.getByPlaceholderText(/talk or type to swan coach/i), 'Write my workout');
    await user.click(screen.getByRole('button', { name: /send to swan coach/i }));

    expect(await screen.findByRole('link', { name: /review 2 exercises in logger/i })).toHaveAttribute(
      'href',
      '/dashboard/client/log-workout?loadPlan=today',
    );
  });

  it('preserves a safe trainer return route in the planner handoff inside More', () => {
    renderPage(
      '/dashboard/trainer/coach-assistant?clientId=42&intent=log_workout&source=master-schedule&returnTo=%2Fdashboard%2Ftrainer%2Fschedule',
      'trainer',
    );

    const menu = openCommandTools();
    expect(within(menu).getByRole('menuitem', { name: /open workout planner/i })).toHaveAttribute(
      'href',
      '/dashboard/trainer/workout-planner?clientId=42&source=swan-coach&returnTo=%2Fdashboard%2Ftrainer%2Fschedule',
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

    expect(await screen.findByRole('link', { name: /review 2 exercises in logger/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/client-management?clientId=42&tab=training&trainingSection=logger&loadPlan=today',
    );
  });

  it('offers a logger draft handoff for generated workout answers to the admin personal logger', async () => {
    const user = userEvent.setup();
    sendMessageWithConversationMock.mockResolvedValueOnce({
      role: 'assistant',
      content: [
        'Workout for today:',
        '- Dumbbell bench press: 3 sets x 8 reps',
        '- Seated row: 3 sets x 10 reps',
      ].join('\n'),
      timestamp: '2026-06-14T07:40:00.000Z',
    });

    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    await user.type(screen.getByPlaceholderText(/talk or type to swan coach/i), 'Write my workout');
    await user.click(screen.getByRole('button', { name: /send to swan coach/i }));

    expect(await screen.findByRole('link', { name: /review 2 exercises in logger/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/log-my-workout?loadPlan=today',
    );
  });

  it('offers the logger draft handoff for generated workout answers on an active thread target', async () => {
    const user = userEvent.setup();
    sendMessageWithConversationMock.mockResolvedValueOnce({
      role: 'assistant',
      content: [
        'Workout for today:',
        '- Trap bar deadlift: 4 sets x 5 reps',
        '- Cable row: 3 sets x 10 reps',
      ].join('\n'),
      timestamp: '2026-06-14T07:45:00.000Z',
    });
    setCoachCommandCenterConversations([
      {
        id: 201,
        title: 'Ava Stone weekly training',
        context: 'coach_assistant',
        status: 'active',
        messageCount: 6,
        lastMessageAt: '2026-06-14T10:00:00.000Z',
        createdAt: '2026-06-13T10:00:00.000Z',
        targetUserId: 424242,
      },
    ]);

    renderPage('/dashboard/admin/coach-assistant?workspace=chat');

    await waitFor(() => {
      const header = screen.getByRole('region', { name: /active coach thread/i });
      expect(within(header).getByText('Ava Stone weekly training')).toBeInTheDocument();
    });
    await user.type(screen.getByPlaceholderText(/talk or type to swan coach/i), 'Write today workout');
    await user.click(screen.getByRole('button', { name: /send to swan coach/i }));

    expect(await screen.findByRole('link', { name: /review 2 exercises in logger/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/client-management?clientId=424242&tab=training&trainingSection=logger&loadPlan=today',
    );
  });
});