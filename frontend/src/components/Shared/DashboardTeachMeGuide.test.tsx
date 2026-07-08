import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardTeachMeGuide from './DashboardTeachMeGuide';

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('DashboardTeachMeGuide', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the admin Coach terminal guide and can hand the workflow to Coach', () => {
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

    expect(screen.getByRole('button', { name: /teach me: admin coach command terminal/i }))
      .toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: /teach me: admin coach command terminal.*first move: open coach/i }))
      .toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /^start now: open coach$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^ask swan coach: admin coach command terminal$/i }))
      .not.toBeInTheDocument();
    expect(screen.getByText('Open guide')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /admin coach command terminal visible fast path/i }))
      .not.toBeInTheDocument();
    expect(screen.queryByText(/Start with Coach or Client Hub/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /teach me: admin coach command terminal/i }));

    const visibleFastPath = screen.getByRole('list', { name: /admin coach command terminal visible fast path/i });
    expect(visibleFastPath).toHaveTextContent(/Confirm the client scope or owner self context/i);
    expect(visibleFastPath).toHaveTextContent(/Ask Coach for the specific draft/i);
    expect(visibleFastPath).toHaveTextContent(/Review the staged action/i);

    fireEvent.click(screen.getByRole('button', { name: /^start now: open coach$/i }));
    expect(onNavigate).toHaveBeenCalledWith('/dashboard/admin/coach-assistant');

    fireEvent.click(screen.getByRole('button', { name: /^ask swan coach: admin coach command terminal$/i }));
    expect(onAskCoach).toHaveBeenCalledWith('teach me the admin Coach command terminal workflow for client and owner workout actions');

    expect(screen.getByRole('button', { name: /^first move: open coach$/i })).toBeInTheDocument();
    const expandedFastPath = screen.getByRole('list', { name: /^Admin Coach command terminal fast path$/i });
    expect(within(expandedFastPath).getByText(/Confirm the client scope or owner self context/i)).toBeInTheDocument();
    expect(within(expandedFastPath).getByText(/Ask Coach for the specific draft/i)).toBeInTheDocument();
    expect(within(expandedFastPath).getByText(/Review the staged action/i)).toBeInTheDocument();
    expect(screen.getByText(/Use Coach as the review-gated terminal/i)).toBeInTheDocument();
    expect(screen.getByText(/Keep final writes approval-gated/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /ask swan coach for help/i }));
    expect(onAskCoach).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: /^first move: open coach$/i }));
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

    expect(screen.queryByRole('link', { name: /start now: review progress/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^ask swan coach:/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /teach me: client progress proof/i }));

    expect(screen.getByRole('link', { name: /start now: review progress/i })).toHaveAttribute(
      'href',
      '/dashboard/client/progress',
    );
    expect(screen.getByRole('link', { name: /first move: review progress/i })).toHaveAttribute(
      'href',
      '/dashboard/client/progress',
    );
    const expandedFastPath = screen.getByRole('list', { name: /^Client progress proof fast path$/i });
    expect(within(expandedFastPath).getByText(/Read the current trend/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log workout/i })).toHaveAttribute(
      'href',
      '/dashboard/client/log-workout?loadPlan=today',
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

    expect(screen.queryByRole('button', { name: /ask swan coach: client progress proof/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /teach me: client progress proof/i }));
    fireEvent.click(screen.getByRole('button', { name: /ask swan coach: client progress proof/i }));
    expect(onAskCoach).toHaveBeenCalledWith('teach me the client progress workflow');

    fireEvent.click(screen.getByRole('button', { name: /ask swan coach for help/i }));

    expect(onAskCoach).toHaveBeenCalledTimes(2);
  });
  it('uses router search so admin self planner routes teach the owner workflow', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/admin/workout-planner?self=1&source=swan-coach']}>
        <DashboardTeachMeGuide
          role="admin"
          pathname="/dashboard/admin/workout-planner"
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /teach me: admin self workout planning/i }));
    // The self-planner guide's primary action label is now "Build My Plan".
    expect(screen.getByRole('link', { name: /^start now: build my plan$/i }))
      .toHaveAttribute('href', '/dashboard/admin/workout-planner?self=1');
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


  it('renders the Coach header popover variant without the shell quick strip', () => {
    const onNavigate = vi.fn();

    render(
      <DashboardTeachMeGuide
        role="admin"
        pathname="/dashboard/admin/coach-assistant"
        variant="headerPopover"
        onNavigate={onNavigate}
      />,
    );

    expect(screen.getByRole('button', { name: /teach me: admin coach command terminal/i }))
      .toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Open guide')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /visible fast path/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /teach me: admin coach command terminal/i }));

    expect(screen.getByRole('button', { name: /^first move: open coach$/i })).toBeInTheDocument();
    expect(screen.getByText(/Use Coach as the review-gated terminal/i)).toBeInTheDocument();
  });

  it('keeps the closed phone guide compact and action-first on phones', () => {
    const quickStyles = readSource('src/components/Shared/DashboardTeachMeGuide.quickStyles.ts');

    expect(quickStyles).toMatch(/@media \(max-width: 620px\) \{[\s\S]*grid-template-columns: 1fr;/);
    expect(quickStyles).toMatch(/@media \(max-width: 620px\) \{[\s\S]*display: none;/);
    expect(quickStyles).toMatch(/@media \(max-width: 620px\) \{[\s\S]*min-height: 44px;/);
    expect(quickStyles).toMatch(/@media \(max-width: 620px\) \{[\s\S]*font: 800 11px\/1.25 'Sora', sans-serif;/);
    expect(quickStyles).toMatch(/@media \(max-width: 620px\) \{[\s\S]*flex: 1 1 100%;/);
  });
});
