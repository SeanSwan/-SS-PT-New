import React from 'react';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClientQuickActions } from './ClientDashboardHome.quickActions';

describe('ClientQuickActions', () => {
  it('routes the first-viewport Challenges action through the dashboard target with a trophy icon', () => {
    const onNavigate = vi.fn();
    const onTarget = vi.fn();

    render(
      <ClientQuickActions
        actions={[
          { label: 'Log Workout', path: '/dashboard/client/log-workout?loadPlan=today' },
          { label: 'View Progress', target: 'progress' },
          { label: 'View Challenges', target: 'challenges' },
          { label: 'Book Session', path: '/dashboard/client/schedule' },
        ]}
        onNavigate={onNavigate}
        onTarget={onTarget}
      />,
    );

    const challengesButton = screen.getByRole('button', { name: /view challenges/i });
    expect(challengesButton.querySelector('svg.lucide-trophy')).toBeTruthy();

    fireEvent.click(challengesButton);
    expect(onTarget).toHaveBeenCalledWith('challenges');
    expect(onNavigate).not.toHaveBeenCalledWith('/dashboard/client/schedule');

    fireEvent.click(screen.getByRole('button', { name: /book session/i }));
    expect(onNavigate).toHaveBeenCalledWith('/dashboard/client/schedule');
  });
});

