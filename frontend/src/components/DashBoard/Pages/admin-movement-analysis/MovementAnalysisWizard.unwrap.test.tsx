/**
 * Phase 18 P1-O sibling-sweep — MovementAnalysisWizard pre-fill unwrap
 * =====================================================================
 * Locks the canonical unwrap depth at MovementAnalysisWizard.tsx:399 against
 * the real getClientDetails response shape (adminClientController.mjs:570-576):
 *
 *   { success: true, data: { client: {...}, mcpStats: {} } }
 *
 * Pre-fix: `const c = res.data?.data || res.data;` resolved `c` to
 * `{ client, mcpStats }`, so `c.id`, `c.firstName`, `c.lastName`, `c.email`,
 * `c.phone`, `c.dateOfBirth` were ALL undefined → wizard pre-fill silently
 * wrote empty strings and `setStep(1)` never fired (because `c` was truthy
 * but its `.id` and other fields weren't, so the form had no client info to
 * skip past step 0).
 *
 * Wait — `c` was truthy (= `{ client, mcpStats }`), so `setStep(1)` DID
 * fire. The visible bug was that the form silently advanced without any
 * pre-fill. Either way, the unwrap depth was wrong; this test locks the
 * fix.
 *
 * Synthetic fixtures only (rule 44).
 */
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockAuthAxiosGet = vi.fn();
const mockAuthAxios = { get: mockAuthAxiosGet };

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({
    authAxios: mockAuthAxios,
    user: { id: 1, role: 'admin' },
  }),
}));

import MovementAnalysisWizard from './MovementAnalysisWizard';

const renderWithClientId = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard/admin/movement-analysis/new']}>
      <Routes>
        <Route
          path="/dashboard/admin/movement-analysis/new"
          element={<MovementAnalysisWizard mode="new" propClientId={424242} />}
        />
      </Routes>
    </MemoryRouter>
  );

const synthClient = {
  id: 424242,
  firstName: 'Fixture',
  lastName: 'Client',
  email: 'fixture@example.test',
  phone: '555-0100',
  dateOfBirth: '1990-01-01',
};

describe('MovementAnalysisWizard — Phase 18 P1-O sibling-sweep unwrap', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // The pre-fill effect both writes form data and advances `setStep(1)` on
  // success, so step 0's <Input> is unmounted at the moment data lands. To
  // assert form values without racing the step transition, we wait for the
  // post-prefill state ("Step 2 of 7"), then click Back to return to step 0
  // where the input mounts with the populated value.
  const navigateBackToStep0 = async () => {
    await screen.findByText(/step 2 of 7/i);
    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
  };

  it('pre-fills client info from the canonical { data: { client } } shape', async () => {
    mockAuthAxiosGet.mockImplementation((url: string) => {
      if (url === '/api/admin/clients/424242') {
        return Promise.resolve({
          data: { success: true, data: { client: synthClient, mcpStats: {} } },
        });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithClientId();
    await navigateBackToStep0();

    expect(await screen.findByDisplayValue('Fixture Client')).toBeInTheDocument();
    expect(screen.getByDisplayValue('fixture@example.test')).toBeInTheDocument();
  });

  it('still pre-fills from the legacy single-level { data } shape (regression)', async () => {
    // Legacy unwrapped shape — body IS the client object directly.
    mockAuthAxiosGet.mockImplementation((url: string) => {
      if (url === '/api/admin/clients/424242') {
        return Promise.resolve({ data: synthClient });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithClientId();
    await navigateBackToStep0();

    expect(await screen.findByDisplayValue('Fixture Client')).toBeInTheDocument();
  });
});
