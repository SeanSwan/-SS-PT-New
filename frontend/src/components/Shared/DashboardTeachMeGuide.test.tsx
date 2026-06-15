import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardTeachMeGuide from './DashboardTeachMeGuide';

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

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
    expect(screen.getByRole('button', { name: /^start now: log client workout$/i }))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^ask swan coach: admin command center$/i }))
      .toBeInTheDocument();
    expect(screen.getByText('Open guide')).toBeInTheDocument();
    const visibleFastPath = screen.getByRole('list', { name: /admin command center visible fast path/i });
    expect(visibleFastPath).toHaveTextContent(/Pick the client or Coach thread/i);
    expect(visibleFastPath).toHaveTextContent(/Open the Training tab/i);
    expect(visibleFastPath).toHaveTextContent(/Review, then save/i);
    expect(screen.queryByText(/Start with Coach or Client Hub/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^start now: log client workout$/i }));
    expect(onNavigate).toHaveBeenCalledWith('/dashboard/admin/client-management?intent=log_workout');

    fireEvent.click(screen.getByRole('button', { name: /^ask swan coach: admin command center$/i }));
    expect(onAskCoach).toHaveBeenCalledWith('teach me the admin dashboard workflow');

    fireEvent.click(screen.getByRole('button', { name: /teach me: admin command center/i }));

    expect(screen.getByRole('button', { name: /^first move: log client workout$/i })).toBeInTheDocument();
    const expandedFastPath = screen.getByRole('list', { name: /^Admin command center fast path$/i });
    expect(within(expandedFastPath).getByText(/Pick the client or Coach thread/i)).toBeInTheDocument();
    expect(within(expandedFastPath).getByText(/Open the Training tab/i)).toBeInTheDocument();
    expect(within(expandedFastPath).getByText(/Review, then save/i)).toBeInTheDocument();
    expect(screen.getByText(/Start with Coach or Client Hub/i)).toBeInTheDocument();
    expect(screen.getByText(/Keep final writes approval-gated/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /ask swan coach for help/i }));
    expect(onAskCoach).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: /^first move: log client workout$/i }));
    expect(onNavigate).toHaveBeenCalledTimes(2);

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

    expect(screen.getByRole('link', { name: /start now: review progress/i })).toHaveAttribute(
      'href',
      '/dashboard/client/progress',
    );
    expect(screen.queryByRole('button', { name: /^ask swan coach:/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /teach me: client progress proof/i }));

    expect(screen.getByRole('link', { name: /first move: review progress/i })).toHaveAttribute(
      'href',
      '/dashboard/client/progress',
    );
    const expandedFastPath = screen.getByRole('list', { name: /^Client progress proof fast path$/i });
    expect(within(expandedFastPath).getByText(/Read the current trend/i)).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: /ask swan coach: client progress proof/i }));
    expect(onAskCoach).toHaveBeenCalledWith('teach me the client progress workflow');

    fireEvent.click(screen.getByRole('button', { name: /teach me: client progress proof/i }));
    fireEvent.click(screen.getByRole('button', { name: /ask swan coach for help/i }));

    expect(onAskCoach).toHaveBeenCalledTimes(2);
  });

  it('can hand the client workout logging flow to Coach when Coach is available', () => {
    const onAskCoach = vi.fn();

    render(
      <DashboardTeachMeGuide
        role="client"
        pathname="/dashboard/client/log-workout"
        onAskCoach={onAskCoach}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /teach me: client workout logging/i }));
    fireEvent.click(screen.getByRole('button', { name: /ask swan coach for help/i }));

    expect(onAskCoach).toHaveBeenCalledWith('teach me the client workout logging workflow');
  });

  it('keeps the closed phone guide compact enough to preserve the first workout CTA', () => {
    const quickStyles = readSource('src/components/Shared/DashboardTeachMeGuide.quickStyles.ts');

    expect(quickStyles).toMatch(/@media \(max-width: 620px\) \{[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
    expect(quickStyles).toMatch(/@media \(max-width: 620px\) \{[\s\S]*min-height: 34px;/);
    expect(quickStyles).toMatch(/@media \(max-width: 620px\) \{[\s\S]*font: 800 9px\/1.15 'Sora', sans-serif;/);
  });
});
