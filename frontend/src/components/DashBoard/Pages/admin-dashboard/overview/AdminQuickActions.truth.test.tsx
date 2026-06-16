import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarChart3 } from 'lucide-react';
import AdminQuickActions from './AdminQuickActions';

const actions = [
  {
    id: 'coach-command',
    title: 'Coach Command',
    description: 'Ask what to do next',
    icon: <BarChart3 size={20} />,
    action: vi.fn(),
  },
  {
    id: 'coach-client-intake',
    title: 'Onboard Client',
    description: 'Start Swan Coach intake',
    icon: <BarChart3 size={20} />,
    action: vi.fn(),
  },
  {
    id: 'log-client-workout',
    title: 'Log Client',
    description: 'Choose client, log today',
    icon: <BarChart3 size={20} />,
    action: vi.fn(),
  },
  {
    id: 'my-workout',
    title: 'My Workout',
    description: 'Log my workout',
    icon: <BarChart3 size={20} />,
    action: vi.fn(),
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Analytics & insights',
    icon: <BarChart3 size={20} />,
    action: vi.fn(),
  },
];

const renderActions = () => render(
  <ThemeProvider theme={{ colors: { accent: '#60C0F0' }, text: { muted: 'rgba(255,255,255,0.6)' } }}>
    <AdminQuickActions actions={actions} />
  </ThemeProvider>,
);

describe('AdminQuickActions interaction contract', () => {
  beforeEach(() => {
    actions.forEach(action => action.action.mockReset());
  });

  it('renders quick actions as real buttons with useful accessible names', () => {
    renderActions();

    const primary = screen.getByRole('button', { name: /Step 1: Coach Command/i });
    const action = screen.getByRole('button', { name: /Analytics.*Analytics & insights/i });

    expect(primary.tagName).toBe('BUTTON');
    expect(primary).toHaveAttribute('type', 'button');
    expect(action.tagName).toBe('BUTTON');
    expect(action).toHaveAttribute('type', 'button');
  });

  it('promotes client intake, client logging, and admin self logging before operations', () => {
    renderActions();

    expect(screen.getByText('First Moves')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: /admin today flow/i })).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
    expect(screen.getAllByRole('button').map(button => button.textContent)).toEqual([
      'Step 1Coach CommandAsk what to do next',
      'Step 2Log ClientChoose client, log today',
      'Step 3My WorkoutLog my workout',
      'Step 4Onboard ClientStart Swan Coach intake',
      'AnalyticsAnalytics & insights',
    ]);
  });

  it('keeps one ordered action path on the admin first screen', () => {
    renderActions();

    expect(screen.getAllByText(/Step \d/i)).toHaveLength(4);
    expect(screen.getAllByRole('button').map(button => button.textContent)).toEqual([
      'Step 1Coach CommandAsk what to do next',
      'Step 2Log ClientChoose client, log today',
      'Step 3My WorkoutLog my workout',
      'Step 4Onboard ClientStart Swan Coach intake',
      'AnalyticsAnalytics & insights',
    ]);
  });

  it('invokes the action from the button click path', () => {
    renderActions();

    fireEvent.click(screen.getByRole('button', { name: /Analytics/i }));

    expect(actions[4].action).toHaveBeenCalledTimes(1);
  });
});
