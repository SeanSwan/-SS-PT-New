/**
 * SpeedToLeadStatusCard — L5 S5
 * =============================
 * authAxios is mocked (no real network). The security-relevant assertion here is
 * that a full recipient address NEVER reaches the DOM: masking is a render-layer
 * concern, and the only way to be sure it happened is to assert the raw string is
 * absent from the rendered output while the masked form is present.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authAxios, authGet } = vi.hoisted(() => {
  const authGet = vi.fn();
  return { authGet, authAxios: { get: authGet } };
});

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios }),
}));

import SpeedToLeadStatusCard, { maskAddress } from './SpeedToLeadStatusCard';

const items = [
  {
    id: 1, channel: 'email', templateName: 'stl_instant_reply',
    recipient: 'jane@gmail.com', action: 'send', createdAt: new Date().toISOString(),
  },
  {
    id: 2, channel: 'email', templateName: 'stl_followup_2d',
    recipient: 'marcus@yahoo.com', action: 'fail', reason: 'missing_recipient',
    createdAt: new Date().toISOString(),
  },
  {
    id: 3, channel: 'email', templateName: 'stl_followup_5d',
    recipient: 'kate@aol.com', action: 'defer', reason: 'quiet_hours',
    createdAt: new Date().toISOString(),
  },
  { id: 4, channel: 'sms', templateName: 'nurture_sms', recipient: '+15551234567', action: 'send' },
];

const mockApi = ({ armed = true, rows = items } = {}) => {
  authGet.mockImplementation((url: string) => {
    if (url.includes('/status')) {
      return Promise.resolve({ data: { success: true, data: { armed } } });
    }
    return Promise.resolve({ data: { success: true, data: { items: rows } } });
  });
};

describe('SpeedToLeadStatusCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  it('renders the ARMED badge when the engine is armed', async () => {
    render(<SpeedToLeadStatusCard />);
    expect(await screen.findByText('ARMED')).toBeTruthy();
    expect(screen.queryByText('DISARMED')).toBeNull();
  });

  it('renders the DISARMED badge when the engine is off', async () => {
    mockApi({ armed: false });
    render(<SpeedToLeadStatusCard />);
    expect(await screen.findByText('DISARMED')).toBeTruthy();
    expect(screen.queryByText('ARMED')).toBeNull();
  });

  it('renders the pending count', async () => {
    render(<SpeedToLeadStatusCard />);
    await screen.findByText('ARMED');
    expect(screen.getByText('Pending emails')).toBeTruthy();
    // rows 2 and 3 are not `send` -> pending is 2
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });

  it('masks recipient addresses and keeps the FULL address out of the DOM', async () => {
    const { container } = render(<SpeedToLeadStatusCard />);
    await screen.findByText('ARMED');

    expect(screen.getByText(/j\*\*\*@gmail\.com/)).toBeTruthy();
    // The security property: the raw address must appear NOWHERE in the markup.
    expect(container.innerHTML).not.toContain('jane@gmail.com');
    expect(container.innerHTML).not.toContain('marcus@yahoo.com');
    expect(container.innerHTML).not.toContain('kate@aol.com');
  });

  it('filters out non-email channels', async () => {
    const { container } = render(<SpeedToLeadStatusCard />);
    await screen.findByText('ARMED');
    expect(container.innerHTML).not.toContain('nurture_sms');
    expect(container.innerHTML).not.toContain('+15551234567');
  });

  it('shows the empty state when there is no email activity', async () => {
    mockApi({ rows: [] });
    render(<SpeedToLeadStatusCard />);
    expect(await screen.findByText(/No email activity yet/i)).toBeTruthy();
  });

  it('shows the error state copy when a request fails', async () => {
    authGet.mockRejectedValue(new Error('network'));
    render(<SpeedToLeadStatusCard />);
    expect(
      await screen.findByText(
        "Couldn't load automation status — refresh or check /api/automation/status."
      )
    ).toBeTruthy();
  });

  it('renders the Open Preview button at least 44px tall', async () => {
    render(<SpeedToLeadStatusCard />);
    await screen.findByText('ARMED');
    const btn = screen.getByRole('link', { name: /Open Preview/i });
    // styled-components emits the class rule into the head, not onto the node, so
    // assert against the stylesheet rather than the element's own inline style.
    // A node carries BOTH a component-id class (sc-XXXX) and a generated rule
    // class; the generated one is what the stylesheet actually keys on.
    const rules = Array.from(document.querySelectorAll('style'))
      .map((s) => s.textContent || '')
      .join('\n');
    const classes = Array.from(btn.classList);
    const ruleWithMinHeight = classes.find((c) =>
      new RegExp(`\\.${c}\\{[^}]*min-height:44px`).test(rules)
    );
    expect(ruleWithMinHeight).toBeTruthy();
  });
});

describe('maskAddress', () => {
  it('masks to first char + *** + @domain', () => {
    expect(maskAddress('jane@gmail.com')).toBe('j***@gmail.com');
  });

  it('returns empty for non-address input rather than a partial leak', () => {
    expect(maskAddress('')).toBe('');
    expect(maskAddress(null)).toBe('');
    expect(maskAddress(undefined)).toBe('');
    expect(maskAddress('not-an-email')).toBe('');
    expect(maskAddress('@leading.com')).toBe('');
  });

  it('never returns the full local part for a one-char local part', () => {
    expect(maskAddress('a@b.com')).toBe('a***@b.com');
  });
});
