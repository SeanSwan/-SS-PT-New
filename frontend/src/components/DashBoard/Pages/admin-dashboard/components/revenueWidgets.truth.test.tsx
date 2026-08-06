/**
 * SWA-138 S10b — Lead-SLA + Session-Reconciliation contracts.
 * Both widgets were receipt-proven before code: Lead has created_at +
 * contacted_at; /api/admin/reconciliation/report is mounted and returns
 * completed-but-ungranted carts.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LeadSpeedWidget, { formatDuration, waitTone } from './LeadSpeedWidget';
import SessionReconciliationWidget from './SessionReconciliationWidget';

const mockAuthAxios = { get: vi.fn() };
vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const leadRoutes = read('../backend/routes/leadRoutes.mjs');
const panel = read('src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx');

const slaResponse = {
  data: {
    success: true,
    sla: {
      windowDays: 30, answeredCount: 8, medianMinutes: 4, averageMinutes: 22,
      withinFiveMin: 5, withinHour: 6, waitingCount: 1,
      waiting: [{ id: 31, firstName: 'Alex', source: 'referral', score: 82, waitingMinutes: 134 }],
    },
  },
};

const reconResponse = {
  data: {
    success: true,
    data: {
      summary: { ungrantedCarts: 1, grantedCarts: 24, totalSessionsOwed: 8 },
      ungrantedDetails: [{
        cartId: 412, userId: 77, userName: 'Alex Client', userEmail: 'x@y.test',
        sessionsOwed: 8, cartTotal: 350, completedAt: '2026-08-02T10:00:00Z',
      }],
    },
  },
};

describe('lead SLA endpoint contract (S10b)', () => {
  it('exposes /sla and declares it BEFORE the :id param route (Rule 31)', () => {
    expect(leadRoutes).toContain("router.get('/sla'");
    expect(leadRoutes.indexOf("router.get('/sla'")).toBeLessThan(leadRoutes.indexOf("router.get('/:id'"));
  });

  it('measures created -> first contact and scopes trainers to their own leads', () => {
    expect(leadRoutes).toContain('new Date(l.contactedAt).getTime() - new Date(l.createdAt).getTime()');
    expect(leadRoutes).toContain("where.assignedTrainerId = req.user.id");
  });

  it('reports live exposure (uncontacted, oldest first) alongside performance', () => {
    expect(leadRoutes).toContain('contactedAt: null');
    expect(leadRoutes).toContain("order: [['createdAt', 'ASC']]");
  });
});

describe('LeadSpeedWidget', () => {
  beforeEach(() => {
    mockAuthAxios.get.mockReset().mockResolvedValue(slaResponse);
  });

  it('formats durations across minute/hour/day scales', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(4)).toBe('4m');
    expect(formatDuration(134)).toBe('2h 14m');
    expect(formatDuration(1500)).toBe('1d 1h');
  });

  it('tones by the speed-to-lead benchmark (<=5m good, <=60m warn, beyond cold)', () => {
    expect(waitTone(3)).toContain('--success');
    expect(waitTone(30)).toContain('--warning');
    expect(waitTone(600)).toContain('--error');
  });

  it('renders median, within-hour %, and the waiting queue with IDs + first name only', async () => {
    render(<LeadSpeedWidget />);
    expect(await screen.findByText('4m')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument(); // 6 of 8 within the hour
    expect(screen.getByText(/Alex · #31/)).toBeInTheDocument();
    expect(screen.getByText('2h 14m')).toBeInTheDocument();
  });

  it('a failed fetch shows the shell error, never the empty copy', async () => {
    mockAuthAxios.get.mockReset().mockRejectedValue(new Error('boom'));
    render(<LeadSpeedWidget />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Lead response data unavailable');
    expect(screen.queryByText('No leads captured in this window')).not.toBeInTheDocument();
  });
});

describe('SessionReconciliationWidget', () => {
  beforeEach(() => {
    mockAuthAxios.get.mockReset().mockResolvedValue(reconResponse);
  });

  it('surfaces paid-but-not-granted carts with sessions owed and money affected', async () => {
    render(<SessionReconciliationWidget />);
    expect(await screen.findByText('8 owed')).toBeInTheDocument();
    expect(screen.getByText(/Alex Client · #77/)).toBeInTheDocument();
    expect(screen.getByText(/Cart #412 · \$350/)).toBeInTheDocument();
  });

  it('does NOT render customer emails even though the API returns them (Rule 8)', async () => {
    render(<SessionReconciliationWidget />);
    await screen.findByText('8 owed');
    expect(screen.queryByText(/x@y\.test/)).not.toBeInTheDocument();
  });

  it('zero unfulfilled carts is an explicit healthy state, not a blank', async () => {
    mockAuthAxios.get.mockReset().mockResolvedValue({
      data: { data: { summary: { ungrantedCarts: 0, grantedCarts: 30, totalSessionsOwed: 0 }, ungrantedDetails: [] } },
    });
    render(<SessionReconciliationWidget />);
    expect(await screen.findByText('Every completed purchase has its sessions granted.')).toBeInTheDocument();
  });

  it('a failed fetch shows the shell error, never the healthy copy', async () => {
    mockAuthAxios.get.mockReset().mockRejectedValue(new Error('boom'));
    render(<SessionReconciliationWidget />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Reconciliation data unavailable');
    expect(screen.queryByText('Every completed purchase has its sessions granted.')).not.toBeInTheDocument();
  });
});

describe('both widgets are mounted in Business Lens behind crash boundaries', () => {
  it('appears in the panel with boundaries', () => {
    expect(panel).toContain('<WidgetErrorBoundary name="Speed to lead"><LeadSpeedWidget /></WidgetErrorBoundary>');
    expect(panel).toContain('<WidgetErrorBoundary name="Session reconciliation"><SessionReconciliationWidget /></WidgetErrorBoundary>');
  });
});
