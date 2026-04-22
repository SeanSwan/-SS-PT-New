/**
 * Phase 18.A (2026-04-20) — ViewAsBanner behavior test
 * =====================================================
 * Locks the Codex-finalized banner copy and role-labelled heading:
 *   Admin view: Trainer Dashboard   (activeRole='trainer')
 *   Admin view: Client Dashboard    (activeRole='client')
 * Supporting text:
 *   You are still signed in as Admin. Actions audit to your admin account.
 * Return button navigates to /dashboard/admin/client-management by default
 * and the consumer-supplied `returnPath` when provided.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import ViewAsBanner from './ViewAsBanner';

describe('ViewAsBanner — Phase 18.A', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('renders "Admin view: Trainer Dashboard" heading for activeRole="trainer"', () => {
    render(
      <MemoryRouter>
        <ViewAsBanner activeRole="trainer" />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Admin view: Trainer Dashboard/i)).not.toBeNull();
    expect(screen.queryByText(/Admin view: Client Dashboard/i)).toBeNull();
  });

  it('renders "Admin view: Client Dashboard" heading for activeRole="client"', () => {
    render(
      <MemoryRouter>
        <ViewAsBanner activeRole="client" />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Admin view: Client Dashboard/i)).not.toBeNull();
    expect(screen.queryByText(/Admin view: Trainer Dashboard/i)).toBeNull();
  });

  it('renders the Codex-finalized supporting text verbatim', () => {
    render(
      <MemoryRouter>
        <ViewAsBanner activeRole="trainer" />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/You are still signed in as Admin\. Actions audit to your admin account\./i),
    ).not.toBeNull();
  });

  it('has a Return to Admin Dashboard button that navigates to /dashboard/admin/client-management by default', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ViewAsBanner activeRole="trainer" />
      </MemoryRouter>,
    );

    const btn = screen.getByRole('button', { name: /return to admin dashboard/i });
    await user.click(btn);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/admin/client-management');
  });

  it('uses consumer-supplied returnPath when provided', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ViewAsBanner activeRole="client" returnPath="/dashboard/admin/overview" />
      </MemoryRouter>,
    );

    const btn = screen.getByRole('button', { name: /return to admin dashboard/i });
    await user.click(btn);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/admin/overview');
  });

  it('is exposed as a polite aria-live region for screen readers', () => {
    render(
      <MemoryRouter>
        <ViewAsBanner activeRole="trainer" />
      </MemoryRouter>,
    );

    const banner = screen.getByTestId('view-as-banner');
    expect(banner.getAttribute('role')).toBe('status');
    expect(banner.getAttribute('aria-live')).toBe('polite');
  });
});
