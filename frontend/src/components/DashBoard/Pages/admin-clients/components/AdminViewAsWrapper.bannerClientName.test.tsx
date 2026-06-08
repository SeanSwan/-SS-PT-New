/**
 * Phase 18 P1-O / F-1 — Banner client-name unwrap test
 * =====================================================
 * Locks the banner's name binding against the real backend response shape
 * served by adminClientController.getClientDetails:
 *
 *   { success: true, data: { client: {...}, mcpStats: {} } }
 *
 * Pre-fix (production smoke 2026-04-25): the unwrap chain at
 * AdminViewAsWrapper.tsx:278 read `data.client || data.user || data` —
 * one level too shallow — so `profile` collapsed to the response wrapper
 * and `firstName`/`lastName` rendered as empty strings inside the banner's
 * <strong>.
 *
 * Regression guards:
 *   - Older one-level `{ client }` shape still works.
 *   - `{ user }` fallback shape still works.
 *   - Banner copy NO LONGER claims "read-only preview" (Rule 28: surface
 *     fidelity — the inherited PATCH-edit on EnhancedWorkoutsModal makes
 *     the read-only assertion false).
 *
 * Synthetic fixtures only (rule 44).
 */
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockAuthAxiosGet = vi.fn();
const mockAuthAxios = { get: mockAuthAxiosGet };

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({
    authAxios: mockAuthAxios,
    user: { id: 1, role: 'admin' },
  }),
}));

// Stub the modal — we don't exercise it here.
vi.mock('./EnhancedWorkoutsModal', () => ({
  default: () => null,
}));

import AdminViewAsWrapper from './AdminViewAsWrapper';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/dashboard/admin/client-management/view-as/:userId"
          element={<AdminViewAsWrapper />}
        />
      </Routes>
    </MemoryRouter>
  );

const okEmpty = { data: {} };

const synthClient = {
  id: 424242,
  firstName: 'Fixture',
  lastName: 'Client',
  role: 'client',
};

describe('AdminViewAsWrapper — Phase 18 P1-O / F-1 banner name', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders firstName + lastName from the canonical { data: { client } } shape', async () => {
    mockAuthAxiosGet.mockImplementation((url: string) => {
      if (url === '/api/admin/clients/424242') {
        return Promise.resolve({
          data: { success: true, data: { client: synthClient, mcpStats: {} } },
        });
      }
      return Promise.resolve(okEmpty);
    });

    renderAt('/dashboard/admin/client-management/view-as/424242');

    // The banner <strong> must hold the composed name.
    const nameEl = await screen.findByText('Fixture Client');
    expect(nameEl.tagName).toBe('STRONG');
  });

  it('renders firstName + lastName from the legacy { client } shape (regression)', async () => {
    mockAuthAxiosGet.mockImplementation((url: string) => {
      if (url === '/api/admin/clients/424242') {
        return Promise.resolve({ data: { client: synthClient } });
      }
      return Promise.resolve(okEmpty);
    });

    renderAt('/dashboard/admin/client-management/view-as/424242');

    const nameEl = await screen.findByText('Fixture Client');
    expect(nameEl.tagName).toBe('STRONG');
  });

  it('renders firstName + lastName from the { user } fallback shape (regression)', async () => {
    mockAuthAxiosGet.mockImplementation((url: string) => {
      if (url === '/api/admin/clients/424242') {
        return Promise.resolve({ data: { user: synthClient } });
      }
      return Promise.resolve(okEmpty);
    });

    renderAt('/dashboard/admin/client-management/view-as/424242');

    const nameEl = await screen.findByText('Fixture Client');
    expect(nameEl.tagName).toBe('STRONG');
  });

  it('banner copy states the enforced read-only preview contract', async () => {
    mockAuthAxiosGet.mockImplementation((url: string) => {
      if (url === '/api/admin/clients/424242') {
        return Promise.resolve({
          data: { success: true, data: { client: synthClient, mcpStats: {} } },
        });
      }
      return Promise.resolve(okEmpty);
    });

    renderAt('/dashboard/admin/client-management/view-as/424242');

    // Wait for hydration so the banner has rendered.
    await screen.findByText('Fixture Client');
    expect(screen.getByText(/read-only admin preview of their dashboard/i)).toBeInTheDocument();
  });
});
