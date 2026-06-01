import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const commandMock = vi.hoisted(() => ({
  cancelCommand: vi.fn(),
  confirmCommand: vi.fn(),
  executeCommand: vi.fn(),
}));

vi.mock('../../../../../hooks/useAIChat', () => ({
  useAIChat: () => ({
    clearError: vi.fn(),
    error: null,
    messages: [],
    newChat: vi.fn(),
    sendMessageWithConversation: vi.fn(),
    sending: false,
  }),
}));

vi.mock('../../../../../hooks/useCoachCommand', () => ({
  useCoachCommand: () => ({
    cancelCommand: commandMock.cancelCommand,
    confirmCommand: commandMock.confirmCommand,
    executeCommand: commandMock.executeCommand,
    executingCommand: false,
  }),
}));

vi.mock('../../../../WorkoutManagement/WorkoutPlanBuilder', () => ({
  default: () => <div data-testid="workout-plan-builder" />,
}));

vi.mock('../../../../WorkoutLogger/WorkoutLogger', () => ({
  default: ({ onComplete }: { onComplete: (formData: unknown) => void }) => (
    <button type="button" data-testid="workout-logger" onClick={() => onComplete({ id: 'fixture-form' })}>
      Complete Mock Workout
    </button>
  ),
}));

vi.mock('../../../../PlaudClipMerge/PlaudMergeWorkspace', () => ({
  PlaudMergeWorkspace: () => <div data-testid="plaud-merge-workspace" />,
}));

vi.mock('../../../../DashBoard/Pages/admin-clients/components/WorkoutCopilotPanel', () => ({
  default: () => <div data-testid="workout-copilot-panel" />,
}));

vi.mock('../../../../DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel', () => ({
  default: () => <div data-testid="workout-history-panel" />,
}));

import TrainingTabContent from './TrainingTabContent';

describe('TrainingTabContent daily workflow default', () => {
  const source = readFileSync(resolve(__dirname, 'TrainingTabContent.tsx'), 'utf8');

  beforeEach(() => {
    commandMock.cancelCommand.mockReset();
    commandMock.confirmCommand.mockReset();
    commandMock.executeCommand.mockReset();
    commandMock.executeCommand.mockResolvedValue({
      type: 'frontend_dispatch',
      command: 'add_exercise_to_form',
      message: 'Sent to the active workout form.',
      event: 'AI_ADD_EXERCISE',
      payload: { exerciseName: 'Push Up' },
      dispatched: true,
    });
  });

  it('opens on Workout Logger so the selected-client workflow starts with today', async () => {
    render(<TrainingTabContent clientId={424242} clientName="Fixture Client" />);

    expect(
      screen.getByRole('region', { name: /fixture client swan daily training command/i })
    ).toBeInTheDocument();
    expect(await screen.findByTestId('workout-logger')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /workout logger/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.queryByTestId('workout-plan-builder')).not.toBeInTheDocument();
  });

  it('keeps training sub-section tabs as explicit non-submit buttons', () => {
    render(<TrainingTabContent clientId={424242} clientName="Fixture Client" />);

    screen.getAllByRole('tab').forEach((tab) => {
      expect(tab).toHaveAttribute('type', 'button');
    });
  });

  it('moves to Workout History after a logged workout completes', async () => {
    const user = userEvent.setup();

    render(<TrainingTabContent clientId={424242} clientName="Fixture Client" />);

    await user.click(await screen.findByRole('button', { name: /complete mock workout/i }));

    expect(await screen.findByTestId('workout-history-panel')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /workout history/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('re-opens the logger before inline Swan workout-form commands dispatch', async () => {
    const user = userEvent.setup();

    render(<TrainingTabContent clientId={424242} clientName="Fixture Client" />);

    await user.click(screen.getByRole('tab', { name: /workout history/i }));
    expect(await screen.findByTestId('workout-history-panel')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /workout history/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    await user.type(
      screen.getByLabelText(/tell swan about fixture client/i),
      'Add push ups to the workout'
    );
    await user.click(screen.getByRole('button', { name: /send to swan/i }));

    await waitFor(() => expect(commandMock.executeCommand).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('tab', { name: /workout logger/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(await screen.findByTestId('workout-logger')).toBeInTheDocument();
  });

  it('does not leave history for non-workout command-lane text', async () => {
    const user = userEvent.setup();
    commandMock.executeCommand.mockResolvedValueOnce({ type: 'fallback_to_chat' });

    render(<TrainingTabContent clientId={424242} clientName="Fixture Client" />);

    await user.click(screen.getByRole('tab', { name: /workout history/i }));
    expect(await screen.findByTestId('workout-history-panel')).toBeInTheDocument();

    await user.type(
      screen.getByLabelText(/tell swan about fixture client/i),
      'Log meals for today'
    );
    await user.click(screen.getByRole('button', { name: /send to swan/i }));

    await waitFor(() => expect(commandMock.executeCommand).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('tab', { name: /workout history/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('blocks invalid client ids before training tools receive NaN', async () => {
    render(<TrainingTabContent clientId="fixture-424242" clientName="Fixture Client" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/valid client/i);
    expect(screen.queryByTestId('workout-logger')).not.toBeInTheDocument();
  });

  it('does not treat completed workouts as console-only events', () => {
    expect(source).not.toMatch(/console\.log\('Workout completed:'/);
  });
});
