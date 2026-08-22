/**
 * GlobalClientContext — actor switch, exercised through the real provider
 * =======================================================================
 * SWA-192. This file exists because the first attempt to cover Sol's finding was
 * a test that could not fail: it asserted that two different strings were not
 * equal, never mounted the provider, and never ran the effect it claimed to
 * protect. Fable caught it. A guard defended by a tautology is unguarded.
 *
 * These tests mount the real GlobalClientProvider and drive it the way the bug
 * happens: one actor pins a client, the authenticated actor changes underneath,
 * and we assert on what the provider actually exposes.
 *
 * The two interleavings under test:
 *   1. A->B switch in the same tab (shared front-desk kiosk). B must never see
 *      A's client, not even for one render, and not while B's roster loads.
 *   2. A's in-flight roster response landing AFTER the switch to B. It must be
 *      discarded rather than written into B's list.
 */
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Auth is the thing that changes underneath the provider.
// ---------------------------------------------------------------------------
let currentUser: { id: number; role: string } | null = { id: 101, role: 'trainer' };
const getMock = vi.fn();

vi.mock('./AuthContext', () => ({
  useAuth: () => ({ user: currentUser, authAxios: { get: getMock } }),
}));

const { GlobalClientProvider, useGlobalClient, writeStoredActiveClientId } = await import('./GlobalClientContext');

const CLIENT_A = { id: 42, firstName: 'Ada', lastName: 'Client', email: 'a42@example.test' };
const CLIENT_B = { id: 77, firstName: 'Ben', lastName: 'Client', email: 'b77@example.test' };

/** Roster payload in the trainer shape the normaliser expects. */
const rosterFor = (clients: any[]) => ({ data: { assignments: clients.map((c) => ({ client: c })) } });

/**
 * Every value the provider has exposed, in order. Sol's finding is about a
 * TRANSIENT render — the wrong client visible for one commit before the roster
 * lands — so asserting only the settled state cannot catch it. An earlier
 * version of this file did exactly that and passed with the guard disabled.
 */
const renders: string[] = [];

function Probe() {
  const { activeClient, clientList } = useGlobalClient();
  const value = activeClient ? `${activeClient.id}:${activeClient.email}` : 'none';
  renders.push(value);
  return (
    <div>
      <span data-testid="active">{value}</span>
      <span data-testid="roster">{clientList.map((c) => c.id).join(',') || 'empty'}</span>
    </div>
  );
}

const mount = () => render(<GlobalClientProvider><Probe /></GlobalClientProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  renders.length = 0;
  currentUser = { id: 101, role: 'trainer' };
});

describe('actor switch on a shared kiosk', () => {
  it('never exposes the previous actor\'s client after the actor changes', async () => {
    // Trainer A (101) has client 42 pinned and loaded.
    writeStoredActiveClientId(sessionStorage, 101, 'trainer', 42);
    getMock.mockResolvedValue(rosterFor([CLIENT_A]));

    const view = mount();
    await waitFor(() => expect(screen.getByTestId('active').textContent).toBe('42:a42@example.test'));

    // Trainer B (202) logs in on the same tab. B's roster has a different client.
    currentUser = { id: 202, role: 'trainer' };
    getMock.mockResolvedValue(rosterFor([CLIENT_B]));
    const switchIndex = renders.length;

    await act(async () => { view.rerender(<GlobalClientProvider><Probe /></GlobalClientProvider>); });

    await waitFor(() => expect(screen.getByTestId('roster').textContent).toBe('77'));
    expect(screen.getByTestId('active').textContent).toBe('none');

    // The moment that matters. Not just the settled state: B must not inherit
    // A's client in ANY render, including a single transient commit before B's
    // roster lands. That transient is exactly what Sol found.
    const rendersAfterSwitch = renders.slice(switchIndex);
    expect(rendersAfterSwitch.some((v) => v.startsWith('42:'))).toBe(false);
  });

  it('discards an in-flight roster response that outlived its actor', async () => {
    writeStoredActiveClientId(sessionStorage, 101, 'trainer', 42);

    // A's request hangs; we resolve it manually AFTER the switch.
    let resolveA: (v: any) => void = () => {};
    getMock.mockImplementationOnce(() => new Promise((res) => { resolveA = res; }));

    const view = mount();

    currentUser = { id: 202, role: 'trainer' };
    getMock.mockResolvedValue(rosterFor([CLIENT_B]));
    await act(async () => { view.rerender(<GlobalClientProvider><Probe /></GlobalClientProvider>); });
    await waitFor(() => expect(screen.getByTestId('roster').textContent).toBe('77'));

    // A's response lands late. It must be dropped, not painted into B's session.
    await act(async () => { resolveA(rosterFor([CLIENT_A])); });

    expect(screen.getByTestId('roster').textContent).toBe('77');
    expect(screen.getByTestId('active').textContent).toBe('none');
  });

  it('drops a pin when the roster loads successfully but empty', async () => {
    // Kimi's dead-pin case, and the one Fable said the old guard still broke:
    // a one-client trainer whose only client is unassigned.
    writeStoredActiveClientId(sessionStorage, 101, 'trainer', 42);
    getMock.mockResolvedValue(rosterFor([CLIENT_A]));

    const first = mount();
    await waitFor(() => expect(screen.getByTestId('active').textContent).toBe('42:a42@example.test'));
    first.unmount(); // one provider in the document at a time

    // The client is unassigned; the SAME actor's roster now loads successfully
    // and empty. The pin must be dropped, not held — this is the shape a
    // revocation takes for a trainer with a single client.
    getMock.mockResolvedValue(rosterFor([]));
    writeStoredActiveClientId(sessionStorage, 101, 'trainer', 42);

    mount();
    await waitFor(() => expect(screen.getByTestId('roster').textContent).toBe('empty'));
    expect(screen.getByTestId('active').textContent).toBe('none');
  });
});
