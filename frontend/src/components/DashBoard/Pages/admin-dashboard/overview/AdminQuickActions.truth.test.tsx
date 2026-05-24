import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarChart3 } from 'lucide-react';
import AdminQuickActions from './AdminQuickActions';

const actions = [
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
    actions[0].action.mockReset();
  });

  it('renders quick actions as real buttons with useful accessible names', () => {
    renderActions();

    const action = screen.getByRole('button', { name: /Analytics.*Analytics & insights/i });

    expect(action.tagName).toBe('BUTTON');
    expect(action).toHaveAttribute('type', 'button');
  });

  it('invokes the action from the button click path', () => {
    renderActions();

    fireEvent.click(screen.getByRole('button', { name: /Analytics/i }));

    expect(actions[0].action).toHaveBeenCalledTimes(1);
  });
});
