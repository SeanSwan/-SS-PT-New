import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActivePlanContextStrip from './ActivePlanContextStrip';
import type { PlannedAssignment } from './WorkoutLogger.localTypes';

describe('ActivePlanContextStrip', () => {
  it('renders nothing when no plan is loaded', () => {
    const { container } = render(<ActivePlanContextStrip assignment={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an assignment with no usable title or facts', () => {
    const { container } = render(
      <ActivePlanContextStrip assignment={{ planId: 7 } as PlannedAssignment} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows title, week, day, exercise count, and status from real fields', () => {
    const assignment: PlannedAssignment = {
      title: 'Upper Body Strength',
      weekNumber: 3,
      dayNumber: 2,
      dayLabel: 'Day 2 - Push',
      exerciseCount: 6,
      status: 'in_progress',
      firstExerciseName: 'Barbell Bench Press',
    };
    render(<ActivePlanContextStrip assignment={assignment} />);

    const strip = screen.getByRole('note', { name: 'Active plan context' });
    expect(strip).toBeTruthy();
    expect(screen.getByText('Upper Body Strength')).toBeTruthy();
    expect(screen.getByText('Week 3')).toBeTruthy();
    expect(screen.getByText('Day 2 - Push')).toBeTruthy();
    expect(screen.getByText('6 exercises')).toBeTruthy();
    expect(screen.getByText('In progress')).toBeTruthy();
    expect(screen.getByText('Starts with Barbell Bench Press')).toBeTruthy();
  });

  it('falls back to dayLabel for the title and pluralizes correctly', () => {
    render(
      <ActivePlanContextStrip
        assignment={{ dayLabel: 'Leg Day', exerciseCount: 1 } as PlannedAssignment}
      />,
    );
    expect(screen.getAllByText('Leg Day').length).toBeGreaterThan(0);
    expect(screen.getByText('1 exercise')).toBeTruthy();
  });

  it('derives a "Day N" label from dayNumber when no dayLabel exists', () => {
    render(
      <ActivePlanContextStrip
        assignment={{ title: 'Plan A', dayNumber: 4 } as PlannedAssignment}
      />,
    );
    expect(screen.getByText('Day 4')).toBeTruthy();
  });
});
