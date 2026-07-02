import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

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
    cancelCommand: vi.fn(),
    confirmCommand: vi.fn(),
    executeCommand: vi.fn(),
    executingCommand: false,
  }),
}));

vi.mock('../../../../WorkoutManagement/WorkoutPlanBuilder', () => ({
  default: () => <div data-testid="workout-plan-builder" />,
}));

vi.mock('./ClientWorkoutPlansPanel', () => ({
  default: () => <div data-testid="client-workout-plans-panel" />,
}));

vi.mock('../../../../WorkoutLogger/WorkoutLogger', () => ({
  default: ({ onCancel }: { onCancel?: () => void }) => (
    <button type="button" data-testid="workout-logger" onClick={onCancel}>
      Cancel Mock Workout
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

const renderTraining = (props: Partial<ComponentProps<typeof TrainingTabContent>> = {}) => render(
  <TrainingTabContent clientId={424242} clientName="Fixture Client" {...props} />
);

describe('TrainingTabContent logger return route', () => {
  it('returns to the planner when a planner-launched embedded log is canceled', async () => {
    const user = userEvent.setup();
    const onLoggerReturnTo = vi.fn();
    const onSectionChange = vi.fn();

    renderTraining({
      loggerReturnTo: '/dashboard/admin/workout-planner?clientId=424242',
      onLoggerReturnTo,
      onSectionChange,
    });

    await user.click(await screen.findByRole('button', { name: /cancel mock workout/i }));

    expect(onLoggerReturnTo).toHaveBeenCalledWith('/dashboard/admin/workout-planner?clientId=424242');
    expect(onSectionChange).not.toHaveBeenCalledWith('history');
  });

  it('keeps the default history fallback when no planner return route is present', async () => {
    const user = userEvent.setup();
    const onSectionChange = vi.fn();

    renderTraining({ onSectionChange });

    await user.click(await screen.findByRole('button', { name: /cancel mock workout/i }));

    expect(onSectionChange).toHaveBeenCalledWith('history');
    expect(await screen.findByTestId('workout-history-panel')).toBeInTheDocument();
  });
});