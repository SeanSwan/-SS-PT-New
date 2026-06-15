import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkoutLoggerCoachTerminal from './WorkoutLoggerCoachTerminal';

const panelPropsMock = vi.hoisted(() => vi.fn());

vi.mock('../Shared/AITerminalPanel', () => ({
  default: (props: any) => {
    panelPropsMock(props);
    return (
      <section data-testid="mock-ai-terminal">
        <span>{props.initialPrompt}</span>
        {props.quickPrompts?.map((item: { label: string }) => (
          <button key={item.label} type="button">{item.label}</button>
        ))}
      </section>
    );
  },
}));

describe('WorkoutLoggerCoachTerminal', () => {
  beforeEach(() => {
    panelPropsMock.mockClear();
  });

  it('opens a logger-ready command strip with quick prompts and booked-session context', () => {
    const coachCommandRoute =
      '/dashboard/admin/coach-assistant?clientId=42&intent=log_workout&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D42';

    render(
      <WorkoutLoggerCoachTerminal
        clientId={42}
        equipmentProfileId={77}
        workoutDate="2026-06-14"
        scheduledSessionId="314"
        scheduledSessionDate="2026-06-15"
        scheduledSessionCreditHint={1}
        exerciseCount={2}
        coachCommandRoute={coachCommandRoute}
      />,
    );

    expect(screen.getByRole('heading', { name: /swan coach workout command/i })).toBeInTheDocument();
    expect(screen.getByText('2026-06-15')).toBeInTheDocument();
    expect(screen.getByText('Booked session')).toBeInTheDocument();
    expect(screen.getByText('2 exercises in log')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /build into log/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /adjust safely/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /load phase/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save-check/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open full coach command center for this workout/i }))
      .toHaveAttribute('href', coachCommandRoute);

    expect(panelPropsMock).toHaveBeenCalledWith(expect.objectContaining({
      context: 'workout_generation',
      clientId: 42,
      equipmentProfileId: 77,
      requestContext: {
        workoutDate: '2026-06-15',
        scheduledSessionId: '314',
        scheduledSessionDate: '2026-06-15',
        scheduledSessionCredits: 1,
      },
      defaultOpen: true,
    }));

    const props = panelPropsMock.mock.calls.at(-1)?.[0];
    expect(props.initialPrompt).toContain('AI_ADD_EXERCISE');
    expect(props.initialPrompt).toContain('Do not submit or save');
    expect(props.quickPrompts).toHaveLength(4);
    expect(props.quickPrompts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'Build into log',
        sendImmediately: true,
        prompt: expect.stringContaining('AI_ADD_EXERCISE'),
      }),
      expect.objectContaining({
        label: 'Load phase',
        sendImmediately: true,
        prompt: expect.stringContaining('AI_LOAD_TEMPLATE'),
      }),
      expect.objectContaining({
        label: 'Save-check',
        sendImmediately: true,
        prompt: expect.stringContaining('Do not submit or save'),
      }),
    ]));
  });

  it('uses workout date wording without inventing scheduled-session context', () => {
    render(
      <WorkoutLoggerCoachTerminal
        clientId={9}
        equipmentProfileId={null}
        workoutDate="2026-06-14"
        exerciseCount={0}
      />,
    );

    expect(screen.getByText('2026-06-14')).toBeInTheDocument();
    expect(screen.getByText('0 exercises in log')).toBeInTheDocument();

    const lastProps = panelPropsMock.mock.calls.at(-1)?.[0];
    expect(lastProps.requestContext).toEqual({ workoutDate: '2026-06-14' });
    expect(lastProps.initialPrompt).toContain('selected client on 2026-06-14');
    expect(lastProps.initialPrompt).not.toContain('Client #');
  });

  it('uses self-logging wording when the signed-in athlete is logging their own workout', () => {
    render(
      <WorkoutLoggerCoachTerminal
        selfMode
        clientId={9}
        equipmentProfileId={null}
        workoutDate="2026-06-14"
        exerciseCount={1}
      />,
    );

    expect(screen.getByText('1 exercise in log')).toBeInTheDocument();
    const lastProps = panelPropsMock.mock.calls.at(-1)?.[0];
    expect(lastProps.initialPrompt).toContain('your workout on 2026-06-14');
    expect(lastProps.initialPrompt).not.toContain('selected client');
    expect(lastProps.quickPrompts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'Adjust safely',
        prompt: expect.stringContaining('your 2026-06-14 workout'),
      }),
      expect.objectContaining({
        label: 'Load phase',
        prompt: expect.stringContaining('your 2026-06-14 session'),
      }),
    ]));
    for (const quickPrompt of lastProps.quickPrompts) {
      expect(quickPrompt.prompt).not.toMatch(/selected client/i);
    }
  });

  it('omits the full command center action until a safe route is available', () => {
    render(
      <WorkoutLoggerCoachTerminal
        clientId={9}
        equipmentProfileId={null}
        workoutDate="2026-06-14"
        exerciseCount={1}
      />,
    );

    expect(screen.queryByRole('link', { name: /open full coach command center/i })).not.toBeInTheDocument();
  });
});
