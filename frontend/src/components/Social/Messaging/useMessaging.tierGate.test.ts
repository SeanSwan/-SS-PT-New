import { renderHook, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessaging } from './useMessaging';

const apiServiceMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

const socketMocks = vi.hoisted(() => ({
  emit: vi.fn(),
  on: vi.fn(() => vi.fn()),
}));

vi.mock('../../../services/api.service', () => ({
  default: apiServiceMocks,
}));

vi.mock('../../../hooks/useSocket', () => ({
  useSocket: () => ({
    connected: false,
    connectionState: 'disconnected',
    emit: socketMocks.emit,
    on: socketMocks.on,
  }),
}));

const source = (file: string) => readFileSync(resolve(__dirname, file), 'utf8');

describe('useMessaging access gate', () => {
  beforeEach(() => {
    Object.values(apiServiceMocks).forEach((mock) => mock.mockReset());
    socketMocks.emit.mockClear();
    socketMocks.on.mockClear();
  });

  it('does not fetch conversations when messaging is disabled by tier', async () => {
    const { result } = renderHook(() => useMessaging(103, { enabled: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(apiServiceMocks.get).not.toHaveBeenCalled();
    expect(socketMocks.emit).not.toHaveBeenCalled();
  });

  it('passes the page-level access decision into the live messaging hook', () => {
    // 2026-08-22 (Wave 1 Slice 2) — RE-ANCHORED, not relaxed.
    //
    // This previously pinned the literal string
    //   `const messagingEnabled = isStaffRole || isElite;`
    // which froze the defect: `isElite` is a SUBSCRIPTION tier standing in for
    // a COACHING relationship, so clients on training packages (tier stays
    // 'free') were walled off from their trainer, while live trials were
    // allowed by the API and blocked by the UI.
    //
    // The invariant this test actually exists to protect is the WIRING: the
    // page-level decision must flow into useMessaging rather than the hook
    // deciding for itself. That invariant is asserted below, now against the
    // server-issued capability. Behavioral coverage of the decision itself is
    // in useMessaging.capabilities.test.tsx and, server-side, in
    // backend/tests/api/messagingRelationshipLane.test.mjs.
    const messagingViewSource = source('./MessagingView.tsx');

    expect(messagingViewSource).toContain('const messagingEnabled = capabilities.canMessageAssignedCoach;');
    expect(messagingViewSource).toContain('useMessaging(currentUserId, { enabled: messagingEnabled && !capabilitiesLoading })');
    // The frontend must not recompute entitlement locally ever again.
    expect(messagingViewSource).not.toContain('isStaffRole || isElite');
    expect(messagingViewSource).not.toContain("from '../../../hooks/useSubscription'");
  });

  it('returns raw live search arrays from the mounted hook as visible users', async () => {
    apiServiceMocks.get.mockImplementation((url: string) => Promise.resolve({
      data: url.includes('/users/search')
        ? [{ id: 88, name: 'Sean Swan', username: 'sean', role: 'admin', photo: null }]
        : [],
    }));

    const { result } = renderHook(() => useMessaging(103, { enabled: true }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(result.current.searchUsers('Sean Swan')).resolves.toEqual([
      expect.objectContaining({ id: 88, firstName: 'Sean', lastName: 'Swan', role: 'admin' }),
    ]);
  });
});
