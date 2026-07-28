/**
 * Tests for the client onboarding entry point (launch audit S4, 2026-07-27).
 *
 * THE GAP THIS CLOSES
 * The onboarding wizard was built and routed at /dashboard/client/onboarding,
 * but nothing in the app linked to it. The only gate that referenced it
 * (`shouldRedirectClientToOnboarding`) was never wired into the layout — dead
 * logic with passing tests. A newly signed-up client therefore landed on an
 * empty dashboard with no way to reach their assessment.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

import ClientOnboardingLaunchCard, {
  CLIENT_ONBOARDING_PATH,
} from './ClientOnboardingLaunchCard';

const renderCard = (props: React.ComponentProps<typeof ClientOnboardingLaunchCard>) =>
  render(
    <MemoryRouter>
      <ClientOnboardingLaunchCard {...props} />
    </MemoryRouter>
  );

beforeEach(() => navigate.mockReset());

describe('ClientOnboardingLaunchCard', () => {
  it('renders for a client whose onboarding is known-incomplete', () => {
    renderCard({ isOnboardingComplete: false });
    expect(screen.getByRole('button', { name: /start my assessment/i })).toBeTruthy();
  });

  it('does NOT render once onboarding is complete', () => {
    const { container } = renderCard({ isOnboardingComplete: true });
    expect(container.firstChild).toBeNull();
  });

  // Nagging on a maybe is worse than staying quiet — undefined means "not loaded yet".
  it('does NOT render when the flag is unknown (undefined)', () => {
    const { container } = renderCard({ isOnboardingComplete: undefined });
    expect(container.firstChild).toBeNull();
  });

  it('navigates to the real onboarding route on start', () => {
    renderCard({ isOnboardingComplete: false });
    fireEvent.click(screen.getByRole('button', { name: /start my assessment/i }));
    expect(navigate).toHaveBeenCalledWith(CLIENT_ONBOARDING_PATH);
  });

  it('points at the route that is actually mounted for clients', () => {
    expect(CLIENT_ONBOARDING_PATH).toBe('/dashboard/client/onboarding');
  });

  it('prefers an injected onStart handler over navigation', () => {
    const onStart = vi.fn();
    renderCard({ isOnboardingComplete: false, onStart });
    fireEvent.click(screen.getByRole('button', { name: /start my assessment/i }));
    expect(onStart).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('can be dismissed for the session', () => {
    const { container } = renderCard({ isOnboardingComplete: false });
    fireEvent.click(screen.getByRole('button', { name: /not right now/i }));
    expect(container.firstChild).toBeNull();
  });

  it('greets the client by first name when known', () => {
    renderCard({ isOnboardingComplete: false, firstName: 'Alex' });
    expect(screen.getByText(/Alex, let's build your training profile/i)).toBeTruthy();
  });

  it('falls back to a neutral greeting with no first name', () => {
    renderCard({ isOnboardingComplete: false });
    expect(screen.getByText(/Let's build your training profile/i)).toBeTruthy();
  });

  // Rule 75: the card states how long it takes; that claim must match the wizard.
  it('sets honest expectations up front', () => {
    renderCard({ isOnboardingComplete: false });
    expect(screen.getByText('8 sections')).toBeTruthy();
    expect(screen.getByText('about 10 minutes')).toBeTruthy();
    expect(screen.getByText('saves as you go')).toBeTruthy();
  });

  it('exposes an accessible landmark and heading', () => {
    renderCard({ isOnboardingComplete: false });
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.id).toBe('onboarding-launch-title');
  });
});
