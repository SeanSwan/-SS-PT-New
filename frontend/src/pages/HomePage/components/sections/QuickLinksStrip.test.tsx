/**
 * QuickLinksStrip — role-aware utility links (Blueprint v2 S5 / D5).
 * A link a visitor cannot open is not navigation, it is noise: the strip
 * shipped offering logged-out strangers two dashboards and a staff review.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockAuth = vi.fn();
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => mockAuth(),
}));

// eslint-disable-next-line import/first
import QuickLinksStrip from './QuickLinksStrip';

const renderAs = (isAuthenticated: boolean, role?: string) => {
  mockAuth.mockReturnValue({ isAuthenticated, user: role ? { id: 1, role } : null });
  return render(
    <MemoryRouter>
      <QuickLinksStrip />
    </MemoryRouter>,
  );
};

describe('QuickLinksStrip', () => {
  beforeEach(() => mockAuth.mockReset());

  it('offers a logged-out visitor only what they can actually open', () => {
    renderAs(false);
    expect(screen.getByText('SwanStudios Photography')).toBeInTheDocument();
    expect(screen.getByText('Waiver')).toBeInTheDocument();
    expect(screen.getByText('Trainer Staff Review')).toBeInTheDocument();
    expect(screen.queryByText('Client Dashboard')).toBeNull();
    expect(screen.queryByText('Trainer Dashboard')).toBeNull();
    expect(screen.queryByText('SwanStudios Social')).toBeNull();
  });

  it('gives a client their own dashboard and not the trainer console', () => {
    renderAs(true, 'client');
    expect(screen.getByText('Client Dashboard')).toBeInTheDocument();
    expect(screen.getByText('SwanStudios Social')).toBeInTheDocument();
    expect(screen.queryByText('Trainer Dashboard')).toBeNull();
  });

  it('gives a trainer the trainer console and not the client dashboard', () => {
    renderAs(true, 'trainer');
    expect(screen.getByText('Trainer Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Client Dashboard')).toBeNull();
  });

  it('gives an admin both consoles', () => {
    renderAs(true, 'admin');
    expect(screen.getByText('Client Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Trainer Dashboard')).toBeInTheDocument();
  });

  it('gives a signed-in account with no training relationship neither dashboard', () => {
    renderAs(true, 'user');
    expect(screen.getByText('SwanStudios Social')).toBeInTheDocument();
    expect(screen.queryByText('Client Dashboard')).toBeNull();
    expect(screen.queryByText('Trainer Dashboard')).toBeNull();
  });

  it('labels the band for screen readers', () => {
    renderAs(false);
    expect(screen.getByRole('navigation', { name: 'Quick links' })).toBeInTheDocument();
  });
});
