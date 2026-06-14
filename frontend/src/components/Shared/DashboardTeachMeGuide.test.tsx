import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardTeachMeGuide from './DashboardTeachMeGuide';

describe('DashboardTeachMeGuide', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders a closed-by-default route guide and can ask Coach when available', () => {
    const onAskCoach = vi.fn();
    const onNavigate = vi.fn();

    render(
      <DashboardTeachMeGuide
        role="admin"
        pathname="/dashboard/admin/coach-assistant"
        onAskCoach={onAskCoach}
        onNavigate={onNavigate}
      />,
    );

    expect(screen.getByRole('button', { name: /teach me: admin command center/i }))
      .toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: /teach me: admin command center.*first move: log client workout/i }))
      .toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/Start with Coach or Client Hub/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /teach me: admin command center/i }));

    expect(screen.getByRole('button', { name: /^first move: log client workout$/i })).toBeInTheDocument();
    expect(screen.getByText(/Pick the client or Coach thread/i)).toBeInTheDocument();
    expect(screen.getByText(/Open the Training tab/i)).toBeInTheDocument();
    expect(screen.getByText(/Review, then save/i)).toBeInTheDocument();
    expect(screen.getByText(/Start with Coach or Client Hub/i)).toBeInTheDocument();
    expect(screen.getByText(/Keep final writes approval-gated/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /ask swan coach for help/i }));
    expect(onAskCoach).toHaveBeenCalledWith('teach me the admin dashboard workflow');

    fireEvent.click(screen.getByRole('button', { name: /^first move: log client workout$/i }));
    expect(onNavigate).toHaveBeenCalledWith('/dashboard/admin/client-management?intent=log_workout');

    fireEvent.click(screen.getByRole('button', { name: /client hub training/i }));
    expect(onNavigate).toHaveBeenCalledWith('/dashboard/admin/client-management?tab=training');
  });

  it('keeps the client guide useful without rendering an unavailable Coach action', () => {
    render(
      <DashboardTeachMeGuide
        role="client"
        pathname="/dashboard/client/progress"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /teach me: client progress proof/i }));

    expect(screen.getByRole('link', { name: /first move: review progress/i })).toHaveAttribute(
      'href',
      '/dashboard/client/progress',
    );
    expect(screen.getByText(/Read the current trend/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log workout/i })).toHaveAttribute(
      'href',
      '/dashboard/client/log-workout',
    );
    expect(screen.getByRole('link', { name: /ask coach/i })).toHaveAttribute(
      'href',
      '/dashboard/client/coach-assistant',
    );
    expect(screen.queryByRole('button', { name: /ask swan coach for help/i })).toBeNull();
  });

  it('can hand client Teach Me prompts to the dashboard shell when Coach is available', () => {
    const onAskCoach = vi.fn();

    render(
      <DashboardTeachMeGuide
        role="client"
        pathname="/dashboard/client/progress"
        onAskCoach={onAskCoach}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /teach me: client progress proof/i }));
    fireEvent.click(screen.getByRole('button', { name: /ask swan coach for help/i }));

    expect(onAskCoach).toHaveBeenCalledWith('teach me the client progress workflow');
  });

  it('can hand the base client training loop to Coach when Coach is available', () => {
    const onAskCoach = vi.fn();

    render(
      <DashboardTeachMeGuide
        role="client"
        pathname="/dashboard/client/log-workout"
        onAskCoach={onAskCoach}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /teach me: client training loop/i }));
    fireEvent.click(screen.getByRole('button', { name: /ask swan coach for help/i }));

    expect(onAskCoach).toHaveBeenCalledWith('teach me the client training loop workflow');
  });
});
