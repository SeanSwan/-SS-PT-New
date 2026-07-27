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
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockNavigate = vi.fn();
/** Drives the banner's place-preserving exit resolution. */
const mockLocation = { pathname: '/dashboard/trainer/overview', search: '' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

import ViewAsBanner from './ViewAsBanner';

describe('ViewAsBanner — Phase 18.A', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockLocation.pathname = '/dashboard/trainer/overview';
    mockLocation.search = '';
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

  /**
   * Redesign 2026-07-24: exiting View-As preserves the work. Now that the admin
   * mounts every coaching capability, the exit target is the SAME surface on the
   * admin dashboard rather than a fixed landing page — one click, no lost place.
   */
  it('returns the admin to the equivalent surface on their own dashboard', async () => {
    const user = userEvent.setup();
    mockLocation.pathname = '/dashboard/trainer/build-plan';
    mockLocation.search = '?clientId=61&loadPlan=today';

    render(
      <MemoryRouter>
        <ViewAsBanner activeRole="trainer" />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /return to admin dashboard/i }));

    expect(mockNavigate).toHaveBeenCalledWith(
      '/dashboard/admin/build-plan?clientId=61&loadPlan=today',
    );
  });

  it('falls back to an admin surface when the current one has no admin equivalent', async () => {
    const user = userEvent.setup();
    mockLocation.pathname = '/dashboard/trainer/earnings';
    mockLocation.search = '';

    render(
      <MemoryRouter>
        <ViewAsBanner activeRole="trainer" />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /return to admin dashboard/i }));

    const [target] = mockNavigate.mock.calls[0] as [string];
    expect(target.startsWith('/dashboard/admin/')).toBe(true);
    expect(target).not.toContain('/dashboard/trainer/');
  });

  it('reads as a warning rather than as normal brand chrome', () => {
    // The pre-redesign banner used --accent-primary (Ice Wing cyan), the same
    // token as ordinary UI, which is why an admin could not tell View-As apart
    // from the app demoting them. Impersonation must never look routine.
    const SOURCE = readFileSync(resolve(__dirname, './ViewAsBanner.tsx'), 'utf8');

    expect(SOURCE).toContain('var(--warning, #f59e0b)');
    expect(SOURCE).not.toContain('background: color-mix(in srgb, var(--accent-primary');
    expect(SOURCE).toContain('prefers-reduced-motion');
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
