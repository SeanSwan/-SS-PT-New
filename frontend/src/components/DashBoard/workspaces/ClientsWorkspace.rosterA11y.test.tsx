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

  it('announces loading from a live region that is NOT inside the aria-busy subtree', async () => {
    let release: (value: unknown) => void = () => {};
    dataMock.fetchClientHubClientsStrict.mockReturnValue(new Promise((r) => { release = r; }));

    renderHub();

    // Asserted while the fetch is genuinely in flight — a source-text check cannot
    // distinguish "the attribute is written" from "the element ever renders".
    // The generous timeout is not papering over a race: the fetch is held open by
    // `release`, so the announcement cannot legitimately vanish. It exists because
    // this hub mounts a dozen panels and the default 1000ms expired once under a full
    // parallel suite run while passing 5/5 in isolation.
    const status = await screen.findByRole('status', {}, { timeout: 5000 });
    expect(status).toHaveTextContent(/loading clients/i);

    // THE LOAD-BEARING ASSERTION. ARIA 1.2 lets assistive tech defer changes inside
    // an aria-busy subtree until busy clears. If this live region sat inside
    // ContentArea (which is busy while loading), the announcement could be deferred
    // and then lost when the pulse unmounts. It must not have a busy ancestor.
    expect(status.closest('[aria-busy="true"]')).toBeNull();

    release(roster);

    // The region PERSISTS and empties, rather than unmounting — a region that mounts
    // already containing its text is unreliably announced.
    await waitFor(() => expect(status).toBeEmptyDOMElement(), { timeout: 5000 });
    expect(status).toBeInTheDocument();
  });

  it('marks the persistent content region busy while loading and clears it after', async () => {
    let release: (value: unknown) => void = () => {};
    dataMock.fetchClientHubClientsStrict.mockReturnValue(new Promise((r) => { release = r; }));

    renderHub();

    // Assert the invariant directly rather than hunting for a specific node: the hub
    // renders exactly ONE aria-busy region (ContentArea), the announcer must sit
    // OUTSIDE it, and the visible loading text must sit INSIDE it.
    //
    // A stale comment here used to claim sibling nutrition panels "carry their own
    // aria-busy and stay loading forever under these mocks" — left over from an
    // earlier version that hunted for the pulse by text. All three panel seats
    // flagged it, correctly, as contradicting the assertion directly below it: both
    // cannot be true. The assertion is the true one (verified: the census is 1), and
    // the comment was a leftover. Kept as a note because a test whose commentary
    // disputes its own assertion teaches the next reader to distrust the assertion.
    const announcer = await screen.findByRole('status', {}, { timeout: 5000 });
    const busyNodes = document.querySelectorAll('[aria-busy]');
    expect(busyNodes.length).toBe(1);
    const region = busyNodes[0];
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(region.contains(announcer)).toBe(false);
    expect(region.textContent).toMatch(/loading clients/i);

    release(roster);

    // aria-busy on a PERSISTENT node has something to flip back to. Same element
    // re-read, so this proves an actual flip rather than a disappearance.
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
