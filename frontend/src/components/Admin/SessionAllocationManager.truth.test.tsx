import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SessionAllocationManager from './SessionAllocationManager';
import { buildManualSessionAllocationRequest } from './SessionAllocationManager.logic';

const mockNavigate = vi.fn();
const mockToast = vi.fn();
const mockSessionService = vi.hoisted(() => ({
  getClients: vi.fn(),
  getUserSessionSummary: vi.fn(),
  addSessionsToClient: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('../../services/sessionService', () => ({
  default: mockSessionService,
}));

const repoRoot = resolve(__dirname, '../../../..');
const source = readFileSync(resolve(__dirname, './SessionAllocationManager.tsx'), 'utf8');
const layoutSource = readFileSync(
  resolve(repoRoot, 'frontend/src/components/DashBoard/UniversalDashboardLayout.tsx'),
  'utf8',
);
const coreRoutes = readFileSync(resolve(repoRoot, 'backend/core/routes.mjs'), 'utf8');
const sessionsRoutes = readFileSync(resolve(repoRoot, 'backend/routes/sessions.mjs'), 'utf8');

const client = {
  id: 9,
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.test',
  availableSessions: 4,
  clientSource: 'swanstudios',
  createdAt: '2026-05-23T12:00:00.000Z',
};

const moveFitnessClient = {
  id: 10,
  firstName: 'Mia',
  lastName: 'Move',
  email: 'mia@example.test',
  availableSessions: 0,
  clientSource: 'move_fitness',
  createdAt: '2026-05-23T12:00:00.000Z',
};

describe('SessionAllocationManager active admin contract', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockToast.mockReset();
    mockSessionService.getClients.mockReset();
    mockSessionService.getUserSessionSummary.mockReset();
    mockSessionService.addSessionsToClient.mockReset();

    mockSessionService.getClients.mockResolvedValue([client]);
    mockSessionService.getUserSessionSummary.mockResolvedValue({
      userId: 9,
      available: 4,
      scheduled: 1,
      completed: 7,
      cancelled: 0,
      total: 12,
    });
    mockSessionService.addSessionsToClient.mockResolvedValue({
      success: true,
      data: { availableSessions: 7 },
    });
  });

  it('is the mounted admin allocation surface backed by mounted session compatibility routes', () => {
    expect(layoutSource).toContain("const SessionAllocationManager = React.lazy(() => import('../Admin/SessionAllocationManager'))");
    expect(layoutSource).toContain("{ path: '/session-allocation', component: SessionAllocationManager");
    expect(coreRoutes).toContain("app.use('/api/sessions', sessionsRoutes)");
    expect(sessionsRoutes).toContain('router.get("/users/clients"');
    expect(sessionsRoutes).toContain('router.get("/user-summary/:userId"');
    expect(sessionsRoutes).toContain('router.post("/add-to-user"');
  });

  it('loads client balances through the shared session service auth pipeline', async () => {
    render(<SessionAllocationManager />);

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockSessionService.getClients).toHaveBeenCalledTimes(1);
      expect(mockSessionService.getUserSessionSummary).toHaveBeenCalledWith(9);
    });

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getAllByText('7').length).toBeGreaterThan(0);
  });

  it('adds manual sessions through sessionService.addSessionsToClient', async () => {
    render(<SessionAllocationManager />);

    fireEvent.click(await screen.findByRole('button', { name: /add sessions to ada lovelace/i }));
    fireEvent.change(screen.getByLabelText(/number of sessions/i), {
      target: { value: '3' },
    });
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: 'Revenue recovery' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add 3 sessions/i }));

    await waitFor(() => expect(mockSessionService.addSessionsToClient).toHaveBeenCalledWith(
      9,
      3,
      'Revenue recovery',
    ));
  });

  it('clamps manual paid-session additions to the backend-supported maximum', async () => {
    render(<SessionAllocationManager />);

    fireEvent.click(await screen.findByRole('button', { name: /add sessions to ada lovelace/i }));
    fireEvent.change(screen.getByLabelText(/number of sessions/i), {
      target: { value: '99' },
    });

    expect(screen.getByRole('button', { name: /add 50 sessions/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /add 50 sessions/i }));

    await waitFor(() => expect(mockSessionService.addSessionsToClient).toHaveBeenCalledWith(
      9,
      50,
      'Admin added sessions',
    ));
  });

  it('clamps manual paid-session additions to at least one session', async () => {
    render(<SessionAllocationManager />);

    fireEvent.click(await screen.findByRole('button', { name: /add sessions to ada lovelace/i }));
    fireEvent.change(screen.getByLabelText(/number of sessions/i), {
      target: { value: '-3' },
    });

    expect(screen.getByRole('button', { name: /add 1 session/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /add 1 session/i }));

    await waitFor(() => expect(mockSessionService.addSessionsToClient).toHaveBeenCalledWith(
      9,
      1,
      'Admin added sessions',
    ));
  });

  it('builds clamped manual paid-session requests from admin input', () => {
    expect(buildManualSessionAllocationRequest(client, 99, '')).toEqual({
      blockedReason: null,
      request: {
        userId: 9,
        sessionCount: 50,
        reason: 'Admin added sessions',
        clientDisplayName: 'Ada Lovelace',
      },
    });
  });

  it('blocks free-tracking clients before building a paid-session request', () => {
    expect(buildManualSessionAllocationRequest(moveFitnessClient, 3, 'Manual add')).toEqual({
      blockedReason: 'Manual paid-session allocation is disabled for free-tracking clients.',
      request: null,
    });
  });

  it('shows Move Fitness clients as free tracking and blocks manual paid-session allocation', async () => {
    mockSessionService.getClients.mockResolvedValue([moveFitnessClient]);
    mockSessionService.getUserSessionSummary.mockResolvedValue({
      userId: 10,
      available: 0,
      scheduled: 0,
      completed: 2,
      cancelled: 0,
      total: 2,
    });

    render(<SessionAllocationManager />);

    expect(await screen.findByText('Mia Move')).toBeInTheDocument();
    expect(screen.getByText('free tracking')).toBeInTheDocument();
    expect(screen.getByText('no deduction')).toBeInTheDocument();
    expect(screen.queryByText('No Sessions')).not.toBeInTheDocument();

    const addButton = screen.getByRole('button', {
      name: /paid sessions are disabled for mia move because this is free tracking/i,
    });
    expect(addButton).toBeDisabled();
    fireEvent.click(addButton);

    expect(screen.queryByLabelText(/number of sessions/i)).not.toBeInTheDocument();
    expect(mockSessionService.addSessionsToClient).not.toHaveBeenCalled();
  });

  it('keeps source guards against stale direct auth fetches on the active surface', () => {
    const controllerSource = readFileSync(resolve(__dirname, './SessionAllocationManager.controller.ts'), 'utf8');
    const logicSource = readFileSync(resolve(__dirname, './SessionAllocationManager.logic.ts'), 'utf8');
    const tableSource = readFileSync(resolve(__dirname, './SessionAllocationManager.ClientsTable.tsx'), 'utf8');
    const typesSource = readFileSync(resolve(__dirname, './SessionAllocationManager.types.ts'), 'utf8');
    const combinedSource = [source, controllerSource, logicSource, tableSource, typesSource].join('\n');

    expect(logicSource).toContain("import { getClientSessionSignal, isNonDeductingClientSource } from '../DashBoard/workspaces/clients-team/clientSessionSignal';");
    expect(typesSource).toContain('clientSource?: string;');
    expect(logicSource).toContain("clientSource: textOrFallback(client.clientSource, 'swanstudios')");
    expect(logicSource).toContain('const sessionSignal = getClientSessionSignal(client);');
    expect(tableSource).toContain('const isFreeTrackingClient = isNonDeductingClientSource(client.clientSource);');
    expect(combinedSource).not.toContain('totalAvailableSessions: clients.reduce((sum, client) => sum + client.availableSessions, 0)');
    expect(combinedSource).not.toContain('clientsNeedingSessions: clients.filter(client => client.availableSessions === 0).length');
    expect(controllerSource).toContain('sessionService.getUserSessionSummary(client.id)');
    expect(controllerSource).toContain('sessionService.addSessionsToClient(');
    expect(combinedSource).not.toContain("localStorage.getItem('token')");
    expect(combinedSource).not.toContain('fetch(`/api/sessions/user-summary/${client.id}`');
    expect(combinedSource).not.toContain("fetch('/api/sessions/add-to-user'");
  });

  it('keeps the mounted admin allocation manager split below project file caps', () => {
    const extractedFiles = [
      'SessionAllocationManager.types.ts',
      'SessionAllocationManager.logic.ts',
      'SessionAllocationManager.controller.ts',
      'SessionAllocationManager.layoutStyles.ts',
      'SessionAllocationManager.tableStyles.ts',
      'SessionAllocationManager.modalStyles.ts',
      'SessionAllocationManager.StatsGrid.tsx',
      'SessionAllocationManager.ClientsTable.tsx',
      'SessionAllocationManager.AddSessionsModal.tsx',
    ];

    expect(source).toContain("from './SessionAllocationManager.controller'");
    expect(source).toContain("from './SessionAllocationManager.StatsGrid'");
    expect(source).toContain("from './SessionAllocationManager.ClientsTable'");
    expect(source).toContain("from './SessionAllocationManager.AddSessionsModal'");
    expect(source).not.toContain("import styled");
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);

    extractedFiles.forEach((fileName) => {
      const fileSource = readFileSync(resolve(__dirname, `./${fileName}`), 'utf8');
      expect(fileSource).toContain('export ');
      expect(fileSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    });
  });
});
