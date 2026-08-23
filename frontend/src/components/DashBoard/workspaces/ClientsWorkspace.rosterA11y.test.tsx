/**
 * ClientsWorkspace.rosterA11y.test.tsx
 * ====================================
 * Blueprint
 * ---------
 * PURPOSE   Prove the client-hub roster loading/error affordances BEHAVIOURALLY —
 *           in a real render, against the real caller path — rather than by matching
 *           source text.
 *
 * WHY THIS EXISTS ALONGSIDE LoadingSpinner.retryContract.test.ts
 *           That contract asserts the same guarantees by reading the file. Source-text
 *           assertions are cheap and they survive refactors badly: they pass when the
 *           string is present but the element never renders, and they cannot tell you
 *           that clicking Retry actually refetches. Three reviewers have called that
 *           pattern theatre on this codebase. This file is the behavioural half —
 *           the retry contract keeps the law legible, this proves it is live.
 *
 * The trainer audience is used deliberately: TrainerClientsWorkspace is a 16-line
 * wrapper around <ClientsWorkspace audience="trainer" />, so exercising it proves the
 * fix reaches the component BOTH dashboards render, not an admin-only branch.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dataMock = vi.hoisted(() => ({
  fetchClientHubClients: vi.fn(),
  fetchClientHubClientsStrict: vi.fn(),
  fetchClientHubAdminClients: vi.fn(),
  fetchClientHubTrainerClients: vi.fn(),
  fetchAdminClientById: vi.fn(),
  fetchTrainerClientById: vi.fn(),
  resolveInitialClientSelection: vi.fn(),
}));

vi.mock('./ClientsWorkspace.data', () => dataMock);

const stableAuth = vi.hoisted(() => ({
  authAxios: { get: async () => ({ data: {} }) },
  user: { id: 777, role: 'trainer' },
}));

vi.mock('../../../context/AuthContext', () => ({ useAuth: () => stableAuth }));
vi.mock('../../../hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

vi.mock('./clients-team/useManualClientCreation', () => ({
  useManualClientCreation: () => ({
    manualCreateOpen: false,
    manualCreateTrainers: [],
    creationHandoff: null,
    openManualCreate: vi.fn(),
    closeManualCreate: vi.fn(),
    clearCreationHandoff: vi.fn(),
    handleManualCreate: vi.fn(),
  }),
}));

vi.mock('./ClientActivationQueuePanel', () => ({
  default: () => <div data-testid="activation-queue-panel" />,
}));

import ClientsWorkspace from './ClientsWorkspace';

const roster = [
  {
    id: 61,
    firstName: 'Assigned',
    lastName: 'Client',
    email: 'assigned@example.com',
    clientSource: 'swanstudios',
    sessionBillingMode: 'paid_sessions',
    isActive: true,
    availableSessions: 4,
    workoutCount: 9,
    lastSessionDate: null,
    nextSessionDate: null,
    joinDate: null,
    fitnessGoal: '',
    trainingExperience: '',
    dateOfBirth: null,
    onboardingComplete: true,
    isOnboardingComplete: true,
    onboardingPct: 100,
    onboardingCompletionPercentage: 100,
    completionPercentage: 100,
    onboardingFieldLedger: null,
    onboardingMissingFields: [],
  },
];

const renderHub = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard/trainer/clients']}>
      <ClientsWorkspace audience="trainer" />
    </MemoryRouter>,
  );

describe('client hub roster — loading and failure affordances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dataMock.resolveInitialClientSelection.mockResolvedValue(null);
  });

  it('exposes the loading pulse as a live region so a screen reader hears it', async () => {
    let release: (value: unknown) => void = () => {};
    dataMock.fetchClientHubClientsStrict.mockReturnValue(new Promise((r) => { release = r; }));

    renderHub();

    // Asserted while the fetch is genuinely in flight — a source-text check cannot
    // distinguish "the attribute is written" from "the element ever renders".
    // The generous timeout is not papering over a race: the fetch is held open by
    // `release`, so the pulse cannot legitimately vanish. It exists because this hub
    // mounts a dozen panels and the default 1000ms expired once under a full parallel
    // suite run while passing 5/5 in isolation.
    const status = await screen.findByRole('status', {}, { timeout: 5000 });
    expect(status).toHaveTextContent(/loading clients/i);

    release(roster);

    // Scoped to THIS node rather than queryByRole('status'), which throws when a
    // sibling panel happens to render its own status region at the same moment.
    await waitFor(() => expect(status).not.toBeInTheDocument(), { timeout: 5000 });
  });

  it('marks the persistent content region busy while loading and clears it after', async () => {
    let release: (value: unknown) => void = () => {};
    dataMock.fetchClientHubClientsStrict.mockReturnValue(new Promise((r) => { release = r; }));

    renderHub();

    // Scoped to the region that OWNS the roster, found via the loading status it
    // contains. A container-wide [aria-busy] query is wrong here: sibling nutrition
    // panels carry their own aria-busy and stay loading forever under these mocks,
    // so a broad query proves nothing about the node this fix actually changed.
    const status = await screen.findByRole('status', {}, { timeout: 5000 });
    const region = status.closest('[aria-busy]');
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute('aria-busy', 'true');

    release(roster);

    // The point of putting aria-busy on a PERSISTENT node: it has something to flip
    // back to. A transient node just disappears, and a live region left busy can have
    // its announcement dropped. Same element re-read, so this proves a flip.
    await waitFor(() => expect(region).toHaveAttribute('aria-busy', 'false'));
  });

  it('offers a real Retry control on failure and never says "reload the page"', async () => {
    dataMock.fetchClientHubClientsStrict.mockRejectedValue(new Error('network down'));

    renderHub();

    // Scoped by text: sibling nutrition panels also render role=alert under these
    // mocks, so getByRole('alert') alone is ambiguous and would pass or fail for
    // reasons unrelated to the roster.
    const banner = (await screen.findByText(/couldn't load your client roster/i, {}, { timeout: 5000 })).closest('[role="alert"]');
    expect(banner).not.toBeNull();
    expect(banner).not.toHaveTextContent(/reload the page/i);
    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('refetches when Retry is pressed, and clears the banner once it succeeds', async () => {
    dataMock.fetchClientHubClientsStrict.mockRejectedValueOnce(new Error('network down'));

    renderHub();
    const retry = await screen.findByRole('button', { name: /retry/i }, { timeout: 5000 });
    expect(dataMock.fetchClientHubClientsStrict).toHaveBeenCalledTimes(1);

    dataMock.fetchClientHubClientsStrict.mockResolvedValue(roster);
    await userEvent.click(retry);

    // The whole point of the fix: recovery without throwing away app state.
    await waitFor(() => expect(dataMock.fetchClientHubClientsStrict).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.queryByText(/couldn't load your client roster/i)).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    expect((await screen.findAllByText(/assigned client/i)).length).toBeGreaterThan(0);
  });
});
