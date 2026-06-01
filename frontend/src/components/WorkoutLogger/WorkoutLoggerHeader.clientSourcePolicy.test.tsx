import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import WorkoutLoggerHeader from './WorkoutLoggerHeader';

const headerSource = readFileSync(resolve(__dirname, './WorkoutLoggerHeader.tsx'), 'utf8');

const renderHeader = (overrides: Partial<React.ComponentProps<typeof WorkoutLoggerHeader>> = {}) =>
  render(
    <WorkoutLoggerHeader
      clientFirstName="Mia"
      clientLastName="Move"
      availableSessions={0}
      clientSource="move_fitness"
      totalSets={8}
      estimatedDuration={40}
      workoutDate="2026-05-26"
      onOPTPhaseChange={vi.fn()}
      {...overrides}
    />
  );

describe('WorkoutLoggerHeader client source policy', () => {
  it('shows non-deducting clients as free tracking instead of paid session debt', () => {
    renderHeader({ availableSessions: 9, clientSource: 'move_fitness' });

    expect(screen.getByText('free tracking')).toBeInTheDocument();
    expect(screen.queryByText(/Move Fitness Access/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sessions Remaining/i)).not.toBeInTheDocument();
  });

  it('shows SwanStudios clients as paid session inventory', () => {
    renderHeader({
      clientFirstName: 'Sean',
      clientLastName: 'Swan',
      availableSessions: 4,
      clientSource: 'swanstudios',
    });

    expect(screen.getByText('4 paid sessions')).toBeInTheDocument();
    expect(screen.queryByText(/Sessions Remaining/i)).not.toBeInTheDocument();
  });

  it('keeps header glow layers on shared Crystalline Swan tokens', () => {
    expect(headerSource).toContain('withAlpha');
    expect(headerSource).not.toMatch(
      /rgba\((0, 0, 0|96, 192, 240|80, 160, 240|139, 92, 246|224, 236, 244)/
    );
  });
});
