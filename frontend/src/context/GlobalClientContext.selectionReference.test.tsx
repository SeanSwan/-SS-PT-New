/**
 * ============================================================================
 * FILE: GlobalClientContext.selectionReference.test.tsx
 * PURPOSE: Plan 55 §3 C1 / §4 — the existing GlobalClientProvider gains a
 *   strict ID-only reference API, a current-actor generation, and at most one
 *   live Coach selection request interceptor.
 * ============================================================================
 *
 * Requirement IDs covered: G04BC-R03 (one selection adapter before side
 * effects), G04BC-R04 (scope CAS / first request wins), G04BC-R09 (Global pin
 * restoration uses ID-only metadata in the EXISTING provider; never synthesize
 * an ActiveClient; its actor generation protects roster, setters and storage).
 * Test ID: G04BC-T13.
 *
 * Mounts the real provider and drives it the way the hazard happens — exactly
 * like GlobalClientContext.actorSwitch.test.tsx, whose harness this mirrors.
 *
 * Negative controls: every refused path is paired with an admitted control in
 * the same file, so neither a blanket allow nor a blanket deny can pass.
 *
 * PARENT-APPROVED SCOPE AMENDMENT — plan 55 §3 C1 names this file explicitly.
 */
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let currentUser: { id: number; role: string } | null = { id: 101, role: 'trainer' };
const getMock = vi.fn();

vi.mock('./AuthContext', () => ({
  useAuth: () => ({ user: currentUser, authAxios: { get: getMock } }),
}));

const {
  GlobalClientProvider,
  useGlobalClient,
  activeClientStorageKey,
  writeStoredActiveClientId,
} = await import('./GlobalClientContext');
type GlobalClientContextType = import('./GlobalClientContext').GlobalClientContextType;

const CLIENT_42 = { id: 42, firstName: 'Ada', lastName: 'Client', email: 'a42@example.test' };
const CLIENT_91 = { id: 91, firstName: 'Nia', lastName: 'Client', email: 'n91@example.test' };

const rosterFor = (clients: any[]) => ({ data: { assignments: clients.map((c) => ({ client: c })) } });
const ACTOR_A_KEY = activeClientStorageKey(101, 'trainer');
const ACTOR_B_KEY = activeClientStorageKey(202, 'trainer');

/** Latest context value + the reference id exposed on EVERY render, in order. */
let ctx: GlobalClientContextType | null = null;
const exposedReferenceRenders: (number | null | undefined)[] = [];

function Probe() {
  const value = useGlobalClient();
  ctx = value;
  exposedReferenceRenders.push(value.pinnedClientId);
  const active = value.activeClient;
  return (
    <div>
      <span data-testid="active">{active ? `${active.id}:${active.email}` : 'none'}</span>
      <span data-testid="roster">{value.clientList.map((c) => c.id).join(',') || 'empty'}</span>
      <span data-testid="reference">{value.pinnedClientId === null ? 'none' : String(value.pinnedClientId)}</span>
      <span data-testid="generation">{String(value.actorGeneration)}</span>
    </div>
  );
}

const tree = () => <GlobalClientProvider><Probe /></GlobalClientProvider>;
const mount = () => render(tree());

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  ctx = null;
  exposedReferenceRenders.length = 0;
  currentUser = { id: 101, role: 'trainer' };
  getMock.mockResolvedValue(rosterFor([]));
});

describe('C1: ID-only client reference in the existing provider', () => {
  it('keeps an admitted reference that is absent from the roster as an ID only', async () => {
    // The roster loads successfully and does NOT contain the admitted id.
    getMock.mockResolvedValue(rosterFor([]));
    mount();
    await waitFor(() => expect(screen.getByTestId('roster').textContent).toBe('empty'));

    let accepted = false;
    await act(async () => {
      accepted = ctx!.commitClientReference({
        targetUserId: 4242,
        requestId: 'req-1',
        generation: ctx!.actorGeneration,
      });
    });

    expect(accepted).toBe(true);
    expect(screen.getByTestId('reference').textContent).toBe('4242');
    // NO fabricated profile: the record stays null until a roster row exists.
    expect(screen.getByTestId('active').textContent).toBe('none');
    expect(ctx!.activeClient).toBeNull();

    // A later roster refresh must NOT silently drop the accepted reference.
    await act(async () => { await ctx!.refreshClients(); });
    expect(screen.getByTestId('reference').textContent).toBe('4242');
    expect(screen.getByTestId('active').textContent).toBe('none');
  });

  it('CONTROL: a roster row for the same id hydrates the real profile, never a blank object', async () => {
    getMock.mockResolvedValue(rosterFor([CLIENT_42]));
    mount();
    await waitFor(() => expect(screen.getByTestId('roster').textContent).toBe('42'));

    await act(async () => {
      ctx!.commitClientReference({ targetUserId: 42, requestId: 'req-2', generation: ctx!.actorGeneration });
    });

    await waitFor(() => expect(screen.getByTestId('active').textContent).toBe('42:a42@example.test'));
    expect(ctx!.activeClient).toMatchObject({ id: 42, firstName: 'Ada', lastName: 'Client' });
  });

  it('rejects a commit carrying a stale actor generation and writes nothing', async () => {
    getMock.mockResolvedValue(rosterFor([]));
    const view = mount();
    await waitFor(() => expect(screen.getByTestId('roster').textContent).toBe('empty'));
    const generationForActorA = ctx!.actorGeneration;

    // Actor changes underneath (shared kiosk): A -> B.
    currentUser = { id: 202, role: 'trainer' };
    await act(async () => { view.rerender(tree()); });
    expect(ctx!.actorGeneration).not.toBe(generationForActorA);

    let accepted = true;
    await act(async () => {
      accepted = ctx!.commitClientReference({
        targetUserId: 91,
        requestId: 'req-stale',
        generation: generationForActorA,
      });
    });

    expect(accepted).toBe(false);
    expect(screen.getByTestId('reference').textContent).toBe('none');
    expect(ctx!.activeClient).toBeNull();
    expect(sessionStorage.getItem(ACTOR_B_KEY)).toBeNull();
  });

  it('CONTROL: the same commit succeeds with the CURRENT generation and persists the id', async () => {
    getMock.mockResolvedValue(rosterFor([]));
    const view = mount();
    await waitFor(() => expect(screen.getByTestId('roster').textContent).toBe('empty'));

    currentUser = { id: 202, role: 'trainer' };
    await act(async () => { view.rerender(tree()); });

    let accepted = false;
    await act(async () => {
      accepted = ctx!.commitClientReference({
        targetUserId: 91,
        requestId: 'req-fresh',
        generation: ctx!.actorGeneration,
      });
    });

    expect(accepted).toBe(true);
    expect(screen.getByTestId('reference').textContent).toBe('91');
    // Only the existing actor-scoped ID key is written — no profile.
    expect(sessionStorage.getItem(ACTOR_B_KEY)).toBe('91');
    expect(sessionStorage.getItem(ACTOR_B_KEY)).not.toContain('Client');
  });

  it('retires the exposed reference synchronously when the actor changes', async () => {
    writeStoredActiveClientId(sessionStorage, 101, 'trainer', 42);
    getMock.mockResolvedValue(rosterFor([CLIENT_42]));
    const view = mount();
    await waitFor(() => expect(screen.getByTestId('active').textContent).toBe('42:a42@example.test'));

    currentUser = { id: 202, role: 'trainer' };
    getMock.mockResolvedValue(rosterFor([]));
    const switchIndex = exposedReferenceRenders.length;
    await act(async () => { view.rerender(tree()); });

    // Not one render after the switch may expose actor A's reference.
    expect(exposedReferenceRenders.slice(switchIndex).some((id) => id === 42)).toBe(false);
    expect(screen.getByTestId('reference').textContent).toBe('none');
  });

  it('CONTROL: without an actor change the same reference stays exposed', async () => {
    writeStoredActiveClientId(sessionStorage, 101, 'trainer', 42);
    getMock.mockResolvedValue(rosterFor([CLIENT_42]));
    const view = mount();
    await waitFor(() => expect(screen.getByTestId('active').textContent).toBe('42:a42@example.test'));

    const switchIndex = exposedReferenceRenders.length;
    await act(async () => { view.rerender(tree()); });

    expect(exposedReferenceRenders.slice(switchIndex).some((id) => id === 42)).toBe(true);
    expect(screen.getByTestId('reference').textContent).toBe('42');
  });
});

describe('C1: the one Coach selection request interceptor', () => {
  it('turns an ordinary setActiveClient call into a candidate request with no mutation', async () => {
    getMock.mockResolvedValue(rosterFor([CLIENT_91]));
    mount();
    await waitFor(() => expect(screen.getByTestId('roster').textContent).toBe('91'));

    const interceptor = vi.fn();
    act(() => { ctx!.registerSelectionInterceptor(interceptor); });
    act(() => { ctx!.setActiveClient({ ...CLIENT_91 }); });

    expect(interceptor).toHaveBeenCalledTimes(1);
    expect(interceptor.mock.calls[0][0]).toMatchObject({ targetUserId: 91, origin: 'picker' });
    // Nothing was mutated, and nothing reached storage.
    expect(screen.getByTestId('reference').textContent).toBe('none');
    expect(ctx!.activeClient).toBeNull();
    expect(sessionStorage.getItem(ACTOR_A_KEY)).toBeNull();
  });

  it('CONTROL: with no interceptor registered, setActiveClient still mutates directly', async () => {
    getMock.mockResolvedValue(rosterFor([CLIENT_91]));
    mount();
    await waitFor(() => expect(screen.getByTestId('roster').textContent).toBe('91'));

    act(() => { ctx!.setActiveClient({ ...CLIENT_91 }); });

    expect(screen.getByTestId('reference').textContent).toBe('91');
    expect(ctx!.activeClient).toMatchObject({ id: 91 });
    expect(sessionStorage.getItem(ACTOR_A_KEY)).toBe('91');
  });

  it('turns clearActiveClient into an explicit null candidate, not a silent clear', async () => {
    writeStoredActiveClientId(sessionStorage, 101, 'trainer', 42);
    getMock.mockResolvedValue(rosterFor([CLIENT_42]));
    mount();
    await waitFor(() => expect(screen.getByTestId('active').textContent).toBe('42:a42@example.test'));

    const interceptor = vi.fn();
    act(() => { ctx!.registerSelectionInterceptor(interceptor); });
    act(() => { ctx!.clearActiveClient(); });

    expect(interceptor).toHaveBeenCalledTimes(1);
    expect(interceptor.mock.calls[0][0]).toMatchObject({ targetUserId: null, origin: 'clear' });
    // The existing reference is retained while the decision is pending.
    expect(screen.getByTestId('reference').textContent).toBe('42');
    expect(sessionStorage.getItem(ACTOR_A_KEY)).toBe('42');
  });

  it('CONTROL: with no interceptor registered, clearActiveClient still clears directly', async () => {
    writeStoredActiveClientId(sessionStorage, 101, 'trainer', 42);
    getMock.mockResolvedValue(rosterFor([CLIENT_42]));
    mount();
    await waitFor(() => expect(screen.getByTestId('active').textContent).toBe('42:a42@example.test'));

    act(() => { ctx!.clearActiveClient(); });

    expect(screen.getByTestId('reference').textContent).toBe('none');
    expect(ctx!.activeClient).toBeNull();
    expect(sessionStorage.getItem(ACTOR_A_KEY)).toBeNull();
  });

  it('keeps at most one interceptor, commits past it, and only the live remover detaches', async () => {
    // Both ids are on the authorised roster, so the post-detach direct mutation
    // exercises the ordinary pin path rather than the drop-an-unknown-pin rule.
    getMock.mockResolvedValue(rosterFor([CLIENT_42, CLIENT_91]));
    mount();
    await waitFor(() => expect(screen.getByTestId('roster').textContent).toBe('42,91'));

    const first = vi.fn();
    const second = vi.fn();
    let removeFirst: () => void = () => undefined;
    let removeSecond: () => void = () => undefined;
    act(() => { removeFirst = ctx!.registerSelectionInterceptor(first); });
    act(() => { removeSecond = ctx!.registerSelectionInterceptor(second); });

    // The newer registration is the live one.
    act(() => { ctx!.setActiveClient({ ...CLIENT_91 }); });
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();

    // A stale remover must not detach the live interceptor.
    act(() => { removeFirst(); });
    act(() => { ctx!.setActiveClient({ ...CLIENT_91 }); });
    expect(second).toHaveBeenCalledTimes(2);

    // The commit port bypasses the interceptor — no recursion.
    let accepted = false;
    await act(async () => {
      accepted = ctx!.commitClientReference({
        targetUserId: 91,
        requestId: 'req-bypass',
        generation: ctx!.actorGeneration,
      });
    });
    expect(accepted).toBe(true);
    expect(second).toHaveBeenCalledTimes(2);

    // Detaching restores direct mutation.
    act(() => { removeSecond(); });
    act(() => { ctx!.setActiveClient({ ...CLIENT_42 }); });
    expect(screen.getByTestId('reference').textContent).toBe('42');
  });

  it('rejects a stale setter captured before an actor change without writing storage', async () => {
    getMock.mockResolvedValue(rosterFor([CLIENT_91]));
    const view = mount();
    await waitFor(() => expect(screen.getByTestId('roster').textContent).toBe('91'));

    // A component captured A's setter before the switch.
    const staleSetter = ctx!.setActiveClient;

    currentUser = { id: 202, role: 'trainer' };
    await act(async () => { view.rerender(tree()); });

    act(() => { staleSetter({ ...CLIENT_91 }); });

    expect(screen.getByTestId('reference').textContent).toBe('none');
    expect(sessionStorage.getItem(ACTOR_A_KEY)).toBeNull();
    expect(sessionStorage.getItem(ACTOR_B_KEY)).toBeNull();
  });

  it('CONTROL: a setter from the current generation still writes its own actor key', async () => {
    getMock.mockResolvedValue(rosterFor([CLIENT_91]));
    mount();
    await waitFor(() => expect(screen.getByTestId('roster').textContent).toBe('91'));

    act(() => { ctx!.setActiveClient({ ...CLIENT_91 }); });

    expect(screen.getByTestId('reference').textContent).toBe('91');
    expect(sessionStorage.getItem(ACTOR_A_KEY)).toBe('91');
  });
});
