/**
 * Phase 18.C.1B.1 — AdminViewAsWrapper viewAs wiring tests
 * ========================================================
 * Locks the canonical admin "view as client" gamification fetch to:
 *   GET /api/v1/gamification/profile?viewAs=<userId>
 *
 * Regression guards:
 *   - The legacy/nonexistent path `/api/gamification/profile/:userId`
 *     must never be called again (it 404'd silently via Promise.allSettled
 *     for the entire life of the admin view-as page pre-fix).
 *   - The short-circuit at line 250 (no route userId → no fetch) must hold.
 *
 * Scope: component-level fetch-URL assertions only. The backend end-to-end
 * behavior is covered by the Phase 18.C.1A API integration tests at
 * backend/tests/api/gamificationViewAs.test.mjs.
 */
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuthAxiosGet = vi.fn();

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({
    authAxios: { get: mockAuthAxiosGet },
    user: { id: 1, role: 'admin' },
  }),
}));

import AdminViewAsWrapper from './AdminViewAsWrapper';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/dashboard/people/view-as/:userId" element={<AdminViewAsWrapper />} />
        <Route path="/dashboard/people/view-as" element={<AdminViewAsWrapper />} />
      </Routes>
    </MemoryRouter>
  );

const okClientProfile = {
  data: {
    client: { id: 42, firstName: 'Jackie', lastName: 'Smith', role: 'client' },
  },
};
const okEmpty = { data: {} };

describe('AdminViewAsWrapper — Phase 18.C.1B viewAs wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: all four parallel fetches succeed with empty-ish data so the
    // profile extraction doesn't throw (profile fetch is the only required one).
    mockAuthAxiosGet.mockImplementation((url: string) => {
      if (url === '/api/admin/clients/42') return Promise.resolve(okClientProfile);
      return Promise.resolve(okEmpty);
    });
  });

  it('calls canonical /api/v1/gamification/profile with ?viewAs=<userId>', async () => {
    renderAt('/dashboard/people/view-as/42');

    await waitFor(() => {
      expect(mockAuthAxiosGet).toHaveBeenCalledWith(
        '/api/v1/gamification/profile',
        { params: { viewAs: '42' } }
      );
    });
  });

  it('never calls the legacy nonexistent path /api/gamification/profile/:userId', async () => {
    renderAt('/dashboard/people/view-as/42');

    await waitFor(() => {
      expect(mockAuthAxiosGet).toHaveBeenCalled();
    });

    const urls = mockAuthAxiosGet.mock.calls.map(([url]) => url as string);
    const legacyHit = urls.find((u) => u === '/api/gamification/profile/42');
    expect(legacyHit).toBeUndefined();
    expect(urls.some((u) => u.startsWith('/api/gamification/profile/'))).toBe(false);
  });

  it('does not fetch gamification profile when route userId is missing', async () => {
    // Short-circuit guard at AdminViewAsWrapper.tsx:250 — if useParams yields
    // no userId, the whole fetchViewAsData bails before Promise.allSettled.
    renderAt('/dashboard/people/view-as');

    // Give React a tick to flush the initial effect.
    await new Promise((resolve) => setTimeout(resolve, 0));

    const gamificationCalls = mockAuthAxiosGet.mock.calls.filter(([url]) =>
      String(url).includes('/gamification/profile')
    );
    expect(gamificationCalls).toHaveLength(0);
  });
});
