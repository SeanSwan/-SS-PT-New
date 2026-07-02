import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkoutPlannerStatusAssistantStrip from './WorkoutPlannerStatusAssistantStrip';

const terminalPanelProps = vi.hoisted(() => [] as Array<{ clientId?: number }>);

vi.mock('../../../Shared/AITerminalPanel', () => ({
  default: (props: { clientId?: number }) => {
    terminalPanelProps.push(props);
    return <div data-testid="ai-terminal" />;
  },
}));

const defaultProps = {
  statusMsg: { type: 'success' as const, text: 'Plan saved and made current.', nextAction: 'current-plan-ready' as const },
  plannerReturnTo: '/dashboard/admin/client-management?clientId=42&tab=training&trainingSection=plans',
  activePlanLoggerRoute: '/dashboard/admin/client-management?clientId=42&tab=training&trainingSection=logger&loadPlan=today&source=workout-planner',
  selectedClientId: 42,
  degradedIntelligence: false,
  hasPlanExercises: true,
  onReturnToClientHub: vi.fn(),
  onDismissStatus: vi.fn(),
};

describe('WorkoutPlannerStatusAssistantStrip', () => {
  beforeEach(() => {
    terminalPanelProps.length = 0;
  });
  it('offers immediate Client Hub and logger next actions after a successful save', async () => {
    render(<WorkoutPlannerStatusAssistantStrip {...defaultProps} />);
    await act(async () => {});

    expect(screen.getByRole('button', { name: /return to client hub/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log current plan/i })).toHaveAttribute(
      'href',
      defaultProps.activePlanLoggerRoute,
    );
  });

  it('offers the logger next action after direct planner saves without a return target', async () => {
    const loggerRoute = '/dashboard/admin/client-management?clientId=42&tab=training&trainingSection=logger&loadPlan=today&source=workout-planner';

    render(
      <WorkoutPlannerStatusAssistantStrip
        {...defaultProps}
        plannerReturnTo={null}
        activePlanLoggerRoute={loggerRoute}
      />,
    );
    await act(async () => {});

    expect(screen.queryByRole('button', { name: /return to client hub/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log current plan/i })).toHaveAttribute('href', loggerRoute);
  });
  it('labels self-planner return actions as Workout Logger instead of Client Hub', async () => {
    render(
      <WorkoutPlannerStatusAssistantStrip
        {...defaultProps}
        plannerReturnTo="/dashboard/admin/log-my-workout?loadPlan=today"
        activePlanLoggerRoute="/dashboard/admin/log-my-workout?loadPlan=today&source=workout-planner"
      />,
    );
    await act(async () => {});

    expect(screen.getByRole('button', { name: /return to workout logger/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /return to client hub/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log current plan/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/log-my-workout?loadPlan=today&source=workout-planner',
    );
  });
  it('labels trainer logger return actions as Workout Logger instead of Client Hub', async () => {
    render(
      <WorkoutPlannerStatusAssistantStrip
        {...defaultProps}
        plannerReturnTo="/dashboard/trainer/log-workout?clientId=42"
        activePlanLoggerRoute="/dashboard/trainer/log-workout?clientId=42&source=workout-planner&loadPlan=today"
      />,
    );
    await act(async () => {});

    expect(screen.getByRole('button', { name: /return to workout logger/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /return to client hub/i })).not.toBeInTheDocument();
  });
  it('does not bind the self-planner assistant to the selected admin id', async () => {
    render(
      <WorkoutPlannerStatusAssistantStrip
        {...defaultProps}
        plannerReturnTo={null}
        activePlanLoggerRoute="/dashboard/admin/log-my-workout?loadPlan=today&source=workout-planner"
        selectedClientId={7}
      />,
    );
    await act(async () => {});

    expect(screen.getByTestId('ai-terminal')).toBeInTheDocument();
    expect(terminalPanelProps.at(-1)?.clientId).toBeUndefined();
  });

  it('does not offer a logger handoff on failed saves', async () => {
    render(
      <WorkoutPlannerStatusAssistantStrip
        {...defaultProps}
        statusMsg={{ type: 'error', text: 'Failed to save plan.' }}
      />,
    );
    await act(async () => {});

    expect(screen.queryByRole('link', { name: /log current plan/i })).not.toBeInTheDocument();
  });

  it('does not offer a logger handoff after saving a draft', async () => {
    render(
      <WorkoutPlannerStatusAssistantStrip
        {...defaultProps}
        statusMsg={{ type: 'success', text: 'Plan saved as draft.' }}
      />,
    );
    await act(async () => {});

    expect(screen.getByRole('button', { name: /return to client hub/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /log current plan/i })).not.toBeInTheDocument();
  });
});