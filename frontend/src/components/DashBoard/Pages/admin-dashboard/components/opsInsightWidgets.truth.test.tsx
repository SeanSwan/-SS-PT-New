/**
 * SWA-138 S11 — ops/insight widgets (the two candidates with solid receipts).
 * Both surface ESTIMATED money figures, so the tests lock the honesty labels as
 * hard as the numbers: an estimate must never read as a booked figure.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SessionLiabilityWidget from './SessionLiabilityWidget';
import AiSpendWidget from './AiSpendWidget';

const mockAuthAxios = { get: vi.fn() };
vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const liabilityRoute = read('../backend/routes/adminSessionLiabilityRoutes.mjs');
const coreRoutes = read('../backend/core/routes.mjs');
const panel = read('src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx');

const liabilityResponse = {
  data: { success: true, data: {
    totalSessions: 142, holderCount: 18, estimatedValueUSD: 24850, rateUSD: 175,
    valuation: 'estimate',
    topHolders: [{ id: 128, firstName: 'Alex', role: 'client', sessions: 24 }],
  } },
};

const aiResponse = {
  data: { success: true, data: {
    period: '2026-08',
    totals: { messages: 4210, generations: 88, activeAiUsers: 37, estimatedCostUSD: 12.4 },
    topUsers: [{ id: 412, name: 'Alex Private Client', role: 'client', tier: 'crystalline', messages: 412, generations: 6 }],
    flaggedUsers: [{ id: 9 }, { id: 11 }],
    revenue: { activeSubscriptions: 5 },
  } },
};

describe('SessionLiabilityWidget', () => {
  beforeEach(() => { mockAuthAxios.get.mockReset().mockResolvedValue(liabilityResponse); });

  it('surfaces sessions owed, estimated exposure, and holder count', async () => {
    render(<SessionLiabilityWidget />);
    expect(await screen.findByText('142')).toBeInTheDocument();
    expect(screen.getByText('~$24,850')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
  });

  it('states plainly that the dollar figure is an estimate, not a booked figure', async () => {
    render(<SessionLiabilityWidget />);
    expect(await screen.findByText(/not a booked accounting figure/)).toBeInTheDocument();
    // money() uses maximumFractionDigits: 0, so the rate renders as "$175";
    // and the interpolation splits the sentence across text nodes.
    expect(
      screen.getByText((_, el) => /Estimated at \$175\/session/.test(el?.textContent ?? '')
        && el?.tagName === 'P'),
    ).toBeInTheDocument();
  });

  it('renders holders as first name + id only (Rule 8)', async () => {
    render(<SessionLiabilityWidget />);
    expect(await screen.findByText('Alex · #128')).toBeInTheDocument();
  });

  it('zero outstanding is an explicit healthy state', async () => {
    mockAuthAxios.get.mockReset().mockResolvedValue({
      data: { data: { totalSessions: 0, holderCount: 0, estimatedValueUSD: 0, rateUSD: 175, topHolders: [] } },
    });
    render(<SessionLiabilityWidget />);
    expect(await screen.findByText('No unredeemed prepaid sessions outstanding.')).toBeInTheDocument();
  });

  it('a failed fetch shows the shell error, never the healthy copy', async () => {
    mockAuthAxios.get.mockReset().mockRejectedValue(new Error('boom'));
    render(<SessionLiabilityWidget />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Session liability unavailable');
  });
});

describe('AiSpendWidget', () => {
  beforeEach(() => { mockAuthAxios.get.mockReset().mockResolvedValue(aiResponse); });

  it('shows estimated cost, volume, and active users for the period', async () => {
    render(<AiSpendWidget />);
    expect(await screen.findByText('~$12.40')).toBeInTheDocument();
    expect(screen.getByText('4,210')).toBeInTheDocument();
    expect(screen.getByText('37')).toBeInTheDocument();
  });

  it('labels the cost as an estimate, not a provider invoice', async () => {
    render(<AiSpendWidget />);
    expect(await screen.findByText(/not a provider invoice/)).toBeInTheDocument();
  });

  it('truncates API-supplied display names to the FIRST name only (Rule 8)', async () => {
    render(<AiSpendWidget />);
    // API returns "Alex Private Client"; only "Alex" may reach the DOM.
    expect(await screen.findByText('Alex · #412')).toBeInTheDocument();
    expect(screen.queryByText(/Private Client/)).not.toBeInTheDocument();
  });

  it('raises a banner when users are flagged for unusual usage', async () => {
    render(<AiSpendWidget />);
    expect(await screen.findByText(/2 users flagged for unusual usage/)).toBeInTheDocument();
  });

  it('a failed fetch shows the shell error, never the empty copy', async () => {
    mockAuthAxios.get.mockReset().mockRejectedValue(new Error('boom'));
    render(<AiSpendWidget />);
    expect(await screen.findByRole('alert')).toHaveTextContent('AI usage data unavailable');
    expect(screen.queryByText('No AI usage recorded this period.')).not.toBeInTheDocument();
  });
});

describe('wiring', () => {
  it('the liability endpoint is registered and admin-gated', () => {
    expect(coreRoutes).toContain("import adminSessionLiabilityRoutes from '../routes/adminSessionLiabilityRoutes.mjs'");
    expect(coreRoutes).toContain("app.use('/api/admin', adminSessionLiabilityRoutes)");
    expect(liabilityRoute).toContain("router.get('/session-liability', protect, adminOnly");
  });

  it('the backend declares its valuation as an estimate and exposes the rate used', () => {
    expect(liabilityRoute).toContain("valuation: 'estimate'");
    expect(liabilityRoute).toContain('rateUSD: rate');
  });

  it('both widgets mount in Revenue Integrity behind crash boundaries', () => {
    expect(panel).toContain('<WidgetErrorBoundary name="Session liability"><SessionLiabilityWidget /></WidgetErrorBoundary>');
    expect(panel).toContain('<WidgetErrorBoundary name="AI spend"><AiSpendWidget /></WidgetErrorBoundary>');
  });
});
