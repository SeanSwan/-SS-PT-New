/**
 * MarketingReadinessCockpit RENDER test.
 *
 * The sibling contract test reads this component as a SOURCE STRING and never
 * mounts it — so it can prove a field is referenced but not that rendering it
 * survives real data. This file mounts the component against the actual payload
 * shapes the backend can emit, including the degraded shape where the
 * speed-to-lead card's fields are ABSENT (the service's fail-soft branch returns
 * only { status, enabled, error }).
 *
 * That absent-field path is the one worth guarding: a card that reads
 * `Object.keys(s2l.replyPoints).length` on a degraded payload would crash the
 * whole cockpit — and the cockpit's entire job is to keep reporting when a
 * subsystem is unavailable.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// NOTE: mockResolvedValue (persistent), never mockResolvedValueOnce. The effect
// can fire more than once per mount, and a consumed Once-queue makes
// authAxios.get() return undefined — which surfaces as "cannot read 'then'"
// rather than as a useful assertion failure.
const mockGet = vi.fn();

// The returned object MUST be stable across renders. The component does
// `useCallback(..., [authAxios])` + `useEffect(() => load(), [load])`, so a fresh
// object literal per useAuth() call changes `load`'s identity every render,
// re-fires the effect, cancels the in-flight request, and pins the component in
// 'loading' forever. Production is fine — the real AuthContext value is stable.
const stableAuth = { authAxios: { get: mockGet } };
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => stableAuth,
}));

const { default: MarketingReadinessCockpit } = await import('./MarketingReadinessCockpit');

const baseSubsystem = { status: 'ready' as const, note: 'n', nextAction: null };

const payload = (speedToLead: Record<string, unknown>) => ({
  data: {
    data: {
      overall: 'ready',
      generatedAt: '2026-08-14T07:00:00.000Z',
      subsystems: {
        socialPublishing: { ...baseSubsystem, providers: [] },
        automation: { ...baseSubsystem },
        email: { ...baseSubsystem },
        speedToLead,
        leadCapture: { ...baseSubsystem },
        calendar: { ...baseSubsystem },
        campaigns: { ...baseSubsystem },
        contentTools: { ...baseSubsystem, status: 'demo', tools: [] },
      },
    },
  },
});

describe('MarketingReadinessCockpit render', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('renders the speed-to-lead card as a calm resting state when dark', async () => {
    mockGet.mockResolvedValue(payload({
      ...baseSubsystem,
      enabled: false,
      sendgridConfigured: true,
      fromEmailConfigured: true,
      fromEmailOnBrandDomain: true,
      businessAddressConfigured: true,
      replyPoints: { consult: true, contact: true, prism: true, newsletter: false, signup: false, checkout: false },
    }));

    render(<MarketingReadinessCockpit />);

    await waitFor(() => expect(screen.getByText('Speed-to-Lead Reply')).toBeInTheDocument());
    expect(screen.getByText('Dark (safe)')).toBeInTheDocument();
    expect(screen.getByText('3 of 6')).toBeInTheDocument();
  });

  it('renders LIVE when the flag is on and the chain is complete', async () => {
    mockGet.mockResolvedValue(payload({
      ...baseSubsystem,
      enabled: true,
      sendgridConfigured: true,
      fromEmailConfigured: true,
      fromEmailOnBrandDomain: true,
      businessAddressConfigured: true,
      replyPoints: { consult: true, contact: true, prism: true, newsletter: false, signup: false, checkout: false },
    }));

    render(<MarketingReadinessCockpit />);
    await waitFor(() => expect(screen.getByText('LIVE')).toBeInTheDocument());
    expect(screen.getByText('On brand domain')).toBeInTheDocument();
  });

  it('survives the fail-soft payload where every speed-to-lead field is absent', async () => {
    // Exactly what speedToLeadReadiness returns from its catch block.
    mockGet.mockResolvedValue(payload({
      status: 'degraded',
      enabled: false,
      error: 'speed-to-lead state unavailable',
    }));

    render(<MarketingReadinessCockpit />);

    // The cockpit must still render every other card rather than blanking out.
    await waitFor(() => expect(screen.getByText('Speed-to-Lead Reply')).toBeInTheDocument());
    expect(screen.getByText('Lead Capture')).toBeInTheDocument();
    expect(screen.getByText('0 of 0')).toBeInTheDocument(); // degraded, but not a crash
  });

  it('never renders a credential value even when the payload carries extra fields', async () => {
    mockGet.mockResolvedValue(payload({
      ...baseSubsystem,
      enabled: true,
      sendgridConfigured: true,
      fromEmailConfigured: true,
      fromEmailOnBrandDomain: false,
      businessAddressConfigured: false,
      replyPoints: { consult: true, contact: true, prism: true },
      // A future/rogue backend field must not be blindly rendered.
      fromEmail: 'leaked@example.com',
    }));

    const { container } = render(<MarketingReadinessCockpit />);
    await waitFor(() => expect(screen.getByText('Speed-to-Lead Reply')).toBeInTheDocument());

    // POSITIVE CONTROL FIRST. A bare `not.toContain` passes trivially when the
    // component renders nothing — it would report success while proving nothing.
    // Assert the card actually painted its data before trusting the absence.
    expect(screen.getByText('Off domain')).toBeInTheDocument();
    expect(screen.getByText('3 of 3')).toBeInTheDocument();

    expect(container.textContent).not.toContain('leaked@example.com');
  });
});
