/**
 * SWA-138 S15 — the three ops rollups S11 deferred.
 * These lock what makes them honest: every rate carries the backend's stated
 * counting basis, and "no availability declared" stays distinguishable from
 * "0% utilized" — an unknown rendered as a zero is the same class of lie as
 * the synthetic KPI targets S6 removed.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ActivationFunnelWidget, CancellationImpactWidget, TrainerUtilizationWidget, utilizationTone,
} from './OpsAggregateWidgets';

const mockAuthAxios = { get: vi.fn() };
vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const route = read('../backend/routes/adminOpsAggregateRoutes.mjs');
const coreRoutes = read('../backend/core/routes.mjs');
const panel = read('src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx');
const signalBar = read('src/components/DashBoard/Pages/admin-dashboard/overview/AdminSignalBar.tsx');

const utilization = { data: { success: true, data: {
  basis: 'weekly declared availability x weeks in window (ignores one-off blackouts)',
  trainers: [
    { trainerId: 7, firstName: 'Alex', sessions: 22, bookedHours: 24, capacityHours: 40, utilizationPct: 60 },
    { trainerId: 9, firstName: 'Sam', sessions: 3, bookedHours: 3, capacityHours: 0, utilizationPct: null },
  ],
} } };

const cancellations = { data: { success: true, data: {
  basis: 'sessions with status=cancelled in window, grouped by admin decision',
  totalCancellations: 12,
  byDecision: { pending: 4, charged: 5, waived: 3, undecided: 0 },
  chargedAmountUSD: 525, waivedAmountUSD: 350, leakageUSD: 350,
} } };

const funnel = { data: { success: true, data: {
  basis: 'clients created in window; booked/completed measured on their sessions',
  signups: 20, booked: 14, completed: 9, bookedPct: 70, completedPct: 45,
} } };

describe('backend aggregate contract (S15)', () => {
  it('registers all three rollups behind admin auth', () => {
    expect(coreRoutes).toContain("import adminOpsAggregateRoutes from '../routes/adminOpsAggregateRoutes.mjs'");
    expect(coreRoutes).toContain("app.use('/api/admin', adminOpsAggregateRoutes)");
    expect(route).toContain("router.get('/ops/trainer-utilization', protect, adminOnly");
    expect(route).toContain("router.get('/ops/cancellation-impact', protect, adminOnly");
    expect(route).toContain("router.get('/ops/activation-funnel', protect, adminOnly");
  });

  it('computes in SQL rather than summing a fetched page (the S6 defect)', () => {
    expect(route).toContain("fn('COUNT'");
    expect(route).toContain("fn('SUM'");
    expect(route).toContain("group: ['trainerId']");
    expect(route).toContain("fn('DISTINCT'");
  });

  it('bounds its own window and states its counting basis in every response', () => {
    expect(route).toContain('MAX_WINDOW_DAYS');
    expect(route).toContain('basis:');
  });

  it('returns null utilization when a trainer has declared no availability', () => {
    expect(route).toContain('utilizationPct: capacityMinutes > 0');
    expect(route).toContain('? Math.round((bookedMinutes / capacityMinutes) * 100)\n          : null');
  });
});

describe('TrainerUtilizationWidget', () => {
  beforeEach(() => { mockAuthAxios.get.mockReset().mockResolvedValue(utilization); });

  it('shows utilization, booked vs capacity, and the stated basis', async () => {
    render(<TrainerUtilizationWidget />);
    expect(await screen.findByText('60%')).toBeInTheDocument();
    expect(screen.getByText(/Alex · #7/)).toBeInTheDocument();
    expect(screen.getByText(/24h booked of 40h/)).toBeInTheDocument();
    expect(screen.getByText(/ignores one-off blackouts/)).toBeInTheDocument();
  });

  it('renders "no availability set" rather than 0% when capacity is unknown', async () => {
    render(<TrainerUtilizationWidget />);
    expect(await screen.findByText('—')).toBeInTheDocument();
    expect(screen.getByText(/no availability set/)).toBeInTheDocument();
  });

  it('tones both under- and over-booking as problems', () => {
    expect(utilizationTone(null)).toContain('--text-muted');
    expect(utilizationTone(10)).toContain('--error');   // idle
    expect(utilizationTone(70)).toContain('--success'); // healthy
    expect(utilizationTone(99)).toContain('--error');   // overbooked
  });
});

describe('CancellationImpactWidget', () => {
  beforeEach(() => { mockAuthAxios.get.mockReset().mockResolvedValue(cancellations); });

  it('leads with what the policy let go, and flags pending decisions in the title', async () => {
    render(<CancellationImpactWidget />);
    expect(await screen.findByText('$350')).toBeInTheDocument();
    expect(screen.getByText('Waived (leakage)')).toBeInTheDocument();
    expect(screen.getByText('$525')).toBeInTheDocument();
    expect(screen.getByText(/Cancellation Impact \(4 pending\)/)).toBeInTheDocument();
  });

  it('a failed fetch shows the shell error, never the empty copy', async () => {
    mockAuthAxios.get.mockReset().mockRejectedValue(new Error('boom'));
    render(<CancellationImpactWidget />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Cancellation data unavailable');
    expect(screen.queryByText('No cancellations in this window.')).not.toBeInTheDocument();
  });
});

describe('ActivationFunnelWidget', () => {
  beforeEach(() => { mockAuthAxios.get.mockReset().mockResolvedValue(funnel); });

  it('shows the signup → booked → trained progression with rates', async () => {
    render(<ActivationFunnelWidget />);
    expect(await screen.findByText('20')).toBeInTheDocument();
    expect(screen.getByText('Booked (70%)')).toBeInTheDocument();
    expect(screen.getByText('Trained (45%)')).toBeInTheDocument();
  });

  it('states the denominator so the rate cannot be misread', async () => {
    render(<ActivationFunnelWidget />);
    expect(await screen.findByText(/clients created in window/)).toBeInTheDocument();
  });
});

describe('IA', () => {
  it('mounts the three rollups in their own anchored band, behind crash boundaries', () => {
    expect(panel).toContain('id="admin-ops-intelligence"');
    expect(panel).toContain('<WidgetErrorBoundary name="Trainer utilization"><TrainerUtilizationWidget /></WidgetErrorBoundary>');
    expect(panel).toContain('<WidgetErrorBoundary name="Cancellation impact"><CancellationImpactWidget /></WidgetErrorBoundary>');
    expect(panel).toContain('<WidgetErrorBoundary name="Activation funnel"><ActivationFunnelWidget /></WidgetErrorBoundary>');
  });

  it('gives the new band a SignalBar shortcut in scroll order', () => {
    expect(signalBar).toContain("href: '#admin-ops-intelligence'");
    const opsIdx = signalBar.indexOf("'#admin-ops-intelligence'");
    const communityIdx = signalBar.indexOf("'#admin-community-safety'");
    expect(opsIdx).toBeLessThan(communityIdx);
  });
});
