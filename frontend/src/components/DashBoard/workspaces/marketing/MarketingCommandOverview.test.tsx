/**
 * MarketingCommandOverview — "Leads by Channel" rollup.
 * Verifies the Overview renders the acquisition-channel breakdown from /api/leads/stats
 * (which channel produces leads), shows a helpful empty state, and survives a route
 * failure. authAxios is a STABLE mock (matches production context) so the one-shot
 * stats effect can't re-fire. No real network.
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authAxios, authGet } = vi.hoisted(() => {
  const authGet = vi.fn();
  return { authGet, authAxios: { get: authGet } };
});
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios }),
}));

import MarketingCommandOverview from './MarketingCommandOverview';

const renderOverview = () =>
  render(<MarketingCommandOverview onSelectTab={vi.fn()} onOpenLeads={vi.fn()} />);

describe('MarketingCommandOverview — Leads by Channel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the channel breakdown (name + count) from /stats', async () => {
    authGet.mockResolvedValue({ data: { stats: {
      total: 17, hotLeads: 2, needsFollowUp: 1, conversionRate: 12,
      byChannel: [{ channel: 'youtube', count: 9, converted: 2 }, { channel: 'direct', count: 5, converted: 0 }, { channel: 'tiktok', count: 3, converted: 1 }],
    } } });

    renderOverview();

    expect(await screen.findByText('Leads by Channel')).toBeInTheDocument();
    expect(await screen.findByText('youtube')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('tiktok')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/2 won/)).toBeInTheDocument(); // conversion signal per channel
  });

  it('renders the top-referrers list (first name + id, count, won) under the channel card', async () => {
    authGet.mockResolvedValue({ data: { stats: {
      total: 4, hotLeads: 0, needsFollowUp: 0, conversionRate: 25,
      byChannel: [{ channel: 'referral', count: 4, converted: 1 }],
      byReferrer: [{ referrerId: 42, firstName: 'Ava', count: 3, converted: 1 }, { referrerId: 7, firstName: null, count: 1, converted: 0 }],
    } } });

    renderOverview();

    expect(await screen.findByText('Ava (#42)')).toBeInTheDocument();
    expect(screen.getByText('Client #7')).toBeInTheDocument();
    expect(screen.getByLabelText('Top referrers')).toBeInTheDocument();
    expect(screen.getByText('Who referred them')).toBeInTheDocument(); // distinct from the channel list above
  });

  it('shows an empty-state hint when no channels are attributed yet', async () => {
    authGet.mockResolvedValue({ data: { stats: { total: 0, byChannel: [] } } });
    renderOverview();
    expect(await screen.findByText(/Channels appear here/i)).toBeInTheDocument();
  });

  it('survives a stats route failure without crashing', async () => {
    authGet.mockRejectedValue(new Error('offline'));
    renderOverview();
    expect(await screen.findByText('Leads by Channel')).toBeInTheDocument();
    expect(screen.getByText(/Channels appear here/i)).toBeInTheDocument();
  });
});