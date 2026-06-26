import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HomeDashboardSearchPanel, { HOME_DASHBOARD_SEARCH_ITEMS } from './HomeDashboardSearchPanel';

describe('HomeDashboardSearchPanel', () => {
  it('routes Log Workout to the canonical logger instead of the workout history page', () => {
    const logWorkout = HOME_DASHBOARD_SEARCH_ITEMS.find((entry) => entry.label === 'Log Workout');
    expect(logWorkout?.path).toBe('/dashboard/client/log-workout?loadPlan=today');

    const onClose = vi.fn();
    const onNavigate = vi.fn();
    const onTarget = vi.fn();

    render(
      <HomeDashboardSearchPanel
        open
        onClose={onClose}
        onNavigate={onNavigate}
        onTarget={onTarget}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: /search dashboard destinations/i }), {
      target: { value: 'log workout' },
    });
    fireEvent.click(screen.getByRole('button', { name: /log workout/i }));

    expect(onNavigate).toHaveBeenCalledWith('/dashboard/client/log-workout?loadPlan=today');
    expect(onTarget).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
