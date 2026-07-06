/**
 * ClientComplianceDashboard.actions.test — Wave 1.6 regression locks
 * ====================================================================
 * The 'Send check-in' and 'View profile' buttons rendered with NO
 * onClick (see->act loop dead-ended at the last click; audit doc 08 P0).
 * Contract: View profile deep-links to the canonical Client Hub
 * (?clientId=N via the audience route builder); Send check-in routes to
 * the admin messages surface. Also locks buildClientProfileRoute.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ClientComplianceDashboard from './ClientComplianceDashboard';
import { buildClientProfileRoute } from '../../../workspaces/clients-team/clientDailyTrainingRoutes';

const mockAuthAxios = { get: vi.fn() };
const mockNavigate = vi.fn();

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const ONE_CLIENT = {
  data: {
    clients: [
      {
        id: 44,
        firstName: 'Live',
        lastName: 'Client',
        riskLevel: 'warning',
        reason: 'Compliance dropped to 42%',
        daysSinceLastWorkout: 6,
        complianceRate7d: 33,
        complianceRate30d: 42,
        sessionsRemaining: 5,
      },
    ],
  },
};

describe('buildClientProfileRoute', () => {
  it('builds the canonical admin Client Hub deep link', () => {
    expect(buildClientProfileRoute(44)).toBe('/dashboard/admin/client-management?clientId=44');
  });

  it('is audience-aware for trainers', () => {
    expect(buildClientProfileRoute(44, 'trainer')).toBe('/dashboard/trainer/clients?clientId=44');
  });

  it('refuses invalid ids instead of building a broken link', () => {
    expect(buildClientProfileRoute('abc')).toBeNull();
    expect(buildClientProfileRoute(-1)).toBeNull();
    expect(buildClientProfileRoute(0)).toBeNull();
  });
});

describe('ClientComplianceDashboard intervention actions', () => {
  beforeEach(() => {
    mockAuthAxios.get.mockReset();
    mockNavigate.mockReset();
  });

  it("'View profile' deep-links to the Client Hub for that client", async () => {
    mockAuthAxios.get.mockResolvedValueOnce(ONE_CLIENT);
    render(<ClientComplianceDashboard />);
    await waitFor(() => expect(screen.getByText('Live Client')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /view live client profile/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/admin/client-management?clientId=44');
  });

  it("'Send check-in' routes to the admin messages surface with composeTo param", async () => {
    mockAuthAxios.get.mockResolvedValueOnce(ONE_CLIENT);
    render(<ClientComplianceDashboard />);
    await waitFor(() => expect(screen.getByText('Live Client')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /send check-in to live client/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/admin/messages?composeTo=44');
  });
});
