/**
 * SWA-138 S10 — RenewalRiskWidget contract.
 * The churn pipeline (model + service + 8-function controller) existed for
 * months with NO route file; these lock the wiring and the lifecycle actions.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RenewalRiskWidget from './RenewalRiskWidget';

const mockAuthAxios = { get: vi.fn(), patch: vi.fn() };
vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const routeSource = read('../backend/routes/renewalAlertRoutes.mjs');
const coreRoutes = read('../backend/core/routes.mjs');
const panelSource = read('src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx');

const alertsResponse = {
  data: {
    success: true,
    data: [
      {
        id: 7,
        userId: 128,
        sessionsRemaining: 1,
        daysSinceLastSession: 24,
        urgencyScore: 9,
        user: { id: 128, firstName: 'Private' },
      },
    ],
  },
};

describe('RenewalRiskWidget wiring (S10)', () => {
  it('is mounted in the Work Queues band inside a crash boundary', () => {
    expect(panelSource).toContain("import RenewalRiskWidget from '../components/RenewalRiskWidget'");
    expect(panelSource).toContain('<WidgetErrorBoundary name="Renewal risk"><RenewalRiskWidget /></WidgetErrorBoundary>');
  });

  it('the previously-unmounted renewal controller now has a registered route', () => {
    expect(coreRoutes).toContain("import renewalAlertRoutes from '../routes/renewalAlertRoutes.mjs'");
    expect(coreRoutes).toContain("app.use('/api/renewal-alerts', renewalAlertRoutes)");
    expect(routeSource).toContain("router.get('/', getAlerts)");
    expect(routeSource).toContain("router.patch('/:id/contacted', markAsContacted)");
    expect(routeSource).toContain("router.patch('/:id/renewed', markAsRenewed)");
    expect(routeSource).toContain("router.patch('/:id/dismissed', dismissRenewalAlert)");
  });

  it('gates churn data behind auth AND a staff role, with literal routes before params', () => {
    expect(routeSource).toContain('router.use(protect)');
    expect(routeSource).toContain('router.use(requireStaff)');
    expect(routeSource).toContain("role === 'admin' || role === 'trainer'");
    expect(routeSource.indexOf("router.get('/critical'")).toBeLessThan(routeSource.indexOf("router.get('/user/:userId'"));
  });
});

describe('RenewalRiskWidget behavior (S10)', () => {
  beforeEach(() => {
    mockAuthAxios.get.mockReset().mockResolvedValue(alertsResponse);
    mockAuthAxios.patch.mockReset().mockResolvedValue({ data: { success: true } });
  });

  it('renders urgency, sessions left, and inactivity — IDs and first name only (Rule 8)', async () => {
    render(<RenewalRiskWidget />);
    expect(await screen.findByText(/Private · #128/)).toBeInTheDocument();
    expect(screen.getByText(/1 session left/)).toBeInTheDocument();
    expect(screen.getByText(/24d since last session/)).toBeInTheDocument();
    expect(screen.getByTitle('Urgency 9 of 10')).toBeInTheDocument();
  });

  it('each lifecycle action PATCHes its endpoint and clears the row', async () => {
    render(<RenewalRiskWidget />);
    await screen.findByText(/Private · #128/);
    await userEvent.click(screen.getByRole('button', { name: /Mark Private as renewed/ }));
    expect(mockAuthAxios.patch).toHaveBeenCalledWith('/api/renewal-alerts/7/renewed');
    await waitFor(() => expect(screen.queryByText(/Private · #128/)).not.toBeInTheDocument());
    expect(screen.getByText('No clients at renewal risk')).toBeInTheDocument();
  });

  it('a failed fetch shows the shell error, never the empty copy', async () => {
    mockAuthAxios.get.mockReset().mockRejectedValue(new Error('boom'));
    render(<RenewalRiskWidget />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Renewal risk data unavailable');
    expect(screen.queryByText('No clients at renewal risk')).not.toBeInTheDocument();
  });

  it('a failed action keeps the row and surfaces a row-level error', async () => {
    mockAuthAxios.patch.mockReset().mockRejectedValue(new Error('down'));
    render(<RenewalRiskWidget />);
    await screen.findByText(/Private · #128/);
    await userEvent.click(screen.getByRole('button', { name: /Mark Private as contacted/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not mark contacted');
    expect(screen.getByText(/Private · #128/)).toBeInTheDocument();
  });
});
