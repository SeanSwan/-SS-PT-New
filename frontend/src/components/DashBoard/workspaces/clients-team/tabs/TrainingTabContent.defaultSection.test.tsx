import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { useState, type ComponentProps } from 'react';
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
  default: ({ onPlanCreated }: { onPlanCreated?: (plan: unknown) => void }) => (
    <div data-testid="workout-plan-builder">
      <button type="button" onClick={() => onPlanCreated?.({ id: 'new-plan' })}>
        Mock save generated plan
      </button>
    </div>
  ),
}));
vi.mock('./ClientWorkoutPlansPanel', () => ({
  default: ({ onLogToday, refreshSignal }: { onLogToday?: () => void; refreshSignal?: number }) => (
    <div data-testid="client-workout-plans-panel" data-refresh-signal={String(refreshSignal ?? 0)}>
      <button type="button" onClick={onLogToday}>
        Mock plan log today
      </button>
    </div>
  ),
}));
vi.mock('../../../../WorkoutLogger/WorkoutLogger', () => ({
  default: ({
    loadTodayPlanSignal,
    onComplete,
    scheduledSessionDate,
    scheduledSessionId,
  }: {
    loadTodayPlanSignal?: number;
    onComplete: (formData: unknown) => void;
    scheduledSessionDate?: string | null;
    scheduledSessionId?: string | null;
  }) => (
    <button
      type="button"
      data-testid="workout-logger"
      data-load-today-plan-signal={String(loadTodayPlanSignal ?? 0)}
      data-scheduled-session-date={scheduledSessionDate ?? ''}
      data-scheduled-session-id={scheduledSessionId ?? ''}
      onClick={() => onComplete({ id: 'fixture-form' })}
    >
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
type TestTrainingSection = 'architect' | 'plans' | 'logger' | 'plaud' | 'copilot' | 'history';
const renderTraining = (props: Partial<ComponentProps<typeof TrainingTabContent>> = {}) => render(
  <TrainingTabContent clientId={424242} clientName="Fixture Client" {...props} />
);
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
    renderTraining();
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
  it('can open directly on Workout History after returning from a saved full-page log', async () => {
    renderTraining({ initialSection: 'history' });
    expect(await screen.findByTestId('workout-history-panel')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /workout history/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
  it('can open directly on saved Plans after returning from a saved full-page planner', async () => {
    renderTraining({ initialSection: 'plans' });
    expect(await screen.findByTestId('client-workout-plans-panel')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /plans/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
  it('opens the logger from the saved plan card action', async () => {
    const user = userEvent.setup();
    const onSectionChange = vi.fn();
    renderTraining({ initialSection: 'plans', onSectionChange });
    await user.click(await screen.findByRole('button', { name: /mock plan log today/i }));
    expect(await screen.findByTestId('workout-logger')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /workout logger/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(onSectionChange).toHaveBeenCalledWith('logger');
  });
  it('loads today from the active plan when opening the logger from a saved plan', async () => {
    const user = userEvent.setup();
    renderTraining({ initialSection: 'plans' });
    await user.click(await screen.findByRole('button', { name: /mock plan log today/i }));
    expect(await screen.findByTestId('workout-logger')).toHaveAttribute(
      'data-load-today-plan-signal',
      '1'
    );
  });
  it('opens and refreshes Plan Vault after Program Architect saves a generated plan', async () => {
    const user = userEvent.setup();
    const onSectionChange = vi.fn();
    renderTraining({ initialSection: 'architect', onSectionChange });
    await user.click(await screen.findByRole('button', { name: /mock save generated plan/i }));
    expect(await screen.findByTestId('client-workout-plans-panel')).toHaveAttribute(
      'data-refresh-signal',
      '1'
    );
    expect(screen.getByRole('tab', { name: /plans/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(onSectionChange).toHaveBeenCalledWith('plans');
  });
  it('forwards scheduled session context into the embedded workout logger', async () => {
    renderTraining({ scheduledSessionDate: '2026-06-07', scheduledSessionId: '72' });
    expect(await screen.findByTestId('workout-logger')).toHaveAttribute(
      'data-scheduled-session-id',
      '72'
    );
    expect(screen.getByTestId('workout-logger')).toHaveAttribute(
      'data-scheduled-session-date',
      '2026-06-07'
    );
  });
  it('keeps training sub-section tabs as explicit non-submit buttons', () => {
    renderTraining();
    screen.getAllByRole('tab').forEach((tab) => {
      expect(tab).toHaveAttribute('type', 'button');
    });
  });
  it('announces manual training sub-section changes to the parent route state', async () => {
    const user = userEvent.setup();
    const onSectionChange = vi.fn();
    renderTraining({ onSectionChange });
    await user.click(screen.getByRole('tab', { name: /workout history/i }));
    expect(onSectionChange).toHaveBeenCalledWith('history');
  });
  it('moves to Workout History after a logged workout completes', async () => {
    const user = userEvent.setup();
    renderTraining();
    await user.click(await screen.findByRole('button', { name: /complete mock workout/i }));
    expect(await screen.findByTestId('workout-history-panel')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /workout history/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
  it('shows a post-save receipt with a one-tap progress proof action', async () => {
    const user = userEvent.setup();
    const onOpenProgress = vi.fn();
    renderTraining({ onOpenProgress });
    await user.click(await screen.findByRole('button', { name: /complete mock workout/i }));
    expect(await screen.findByRole('status')).toHaveTextContent(/workout saved/i);
    expect(screen.getByText(/fixture-form/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /open fixture client progress proof/i }));
    expect(onOpenProgress).toHaveBeenCalledTimes(1);
  });
  it('keeps the post-save receipt when parent route state syncs to history', async () => {
    const user = userEvent.setup();
    const RouteSyncedTraining = () => {
      const [section, setSection] = useState<TestTrainingSection | undefined>(undefined);
      return (
        <TrainingTabContent clientId={424242} clientName="Fixture Client" initialSection={section} onSectionChange={setSection} />
      );
    };
    render(<RouteSyncedTraining />);
    await user.click(await screen.findByRole('button', { name: /complete mock workout/i }));
    expect(await screen.findByRole('status')).toHaveTextContent(/workout saved/i);
    expect(screen.getByText(/fixture-form/i)).toBeInTheDocument();
  });
  it('re-opens the logger before inline Swan workout-form commands dispatch', async () => {
    const user = userEvent.setup();
    renderTraining();
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
  it('re-opens the logger for natural trainer dictation from history', async () => {
    const user = userEvent.setup();
    renderTraining();
    await user.click(screen.getByRole('tab', { name: /workout history/i }));
    expect(await screen.findByTestId('workout-history-panel')).toBeInTheDocument();
    await user.type(
      screen.getByLabelText(/tell swan about fixture client/i),
      'We did bench press 3 sets of 10 at 135'
    );
    await user.click(screen.getByRole('button', { name: /send to swan/i }));
    await waitFor(() => expect(commandMock.executeCommand).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('tab', { name: /workout logger/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
  it('does not leave history for non-workout command-lane text', async () => {
    const user = userEvent.setup();
    commandMock.executeCommand.mockResolvedValueOnce({ type: 'fallback_to_chat' });
    renderTraining();
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
    renderTraining({ clientId: 'fixture-424242' });
    expect(await screen.findByRole('alert')).toHaveTextContent(/valid client/i);
    expect(screen.queryByTestId('workout-logger')).not.toBeInTheDocument();
  });
  it('does not treat completed workouts as console-only events', () => {
    expect(source).not.toMatch(/console\.log\('Workout completed:'/);
  });
});
