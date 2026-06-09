import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OnboardClientCard, { getOnboardClientSourceMeta } from './OnboardClientCard';

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const action = {
  type: 'ONBOARD_CLIENT' as const,
  data: {
    firstName: 'Ari',
    lastName: 'Lane',
    clientSource: 'external',
  },
  rawJson: '{}',
};

describe('OnboardClientCard response contract', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders backend data.client success payloads with claim codes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({
          success: true,
          message: 'Client onboarded successfully (External - free tracking)',
          data: {
            client: {
              id: 88,
              firstName: 'Ari',
              lastName: 'Lane',
              email: 'ari@example.com',
            },
            claimCode: 'SWAN-1234',
            claimUrl: 'https://sswanstudios.com/claim/SWAN-1234',
          },
        }),
      }),
    );

    render(<OnboardClientCard action={action} />);

    fireEvent.click(screen.getByRole('button', { name: /confirm & create client/i }));

    await waitFor(() => expect(screen.getByText('Client Created')).toBeInTheDocument());
    expect(screen.getByText('#88')).toBeInTheDocument();
    expect(screen.getByText('SWAN-1234')).toBeInTheDocument();
    expect(screen.getByText('https://sswanstudios.com/claim/SWAN-1234')).toBeInTheDocument();
  });

  it('surfaces SwanStudios paid inventory and claim status after creation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({
          success: true,
          message: 'Client onboarded successfully (SwanStudios - paid sessions)',
          data: {
            client: {
              id: 89,
              firstName: 'Ari',
              lastName: 'Lane',
              clientSource: 'swanstudios',
              availableSessions: 8,
              accountStatus: 'stub',
            },
            claimCode: 'SWAN-PAID',
          },
        }),
      }),
    );

    render(<OnboardClientCard action={{ ...action, data: { ...action.data, clientSource: 'swanstudios' } }} />);

    fireEvent.click(screen.getByRole('button', { name: /confirm & create client/i }));

    await waitFor(() => expect(screen.getByText('Client Created')).toBeInTheDocument());
    expect(screen.getByText('SwanStudios (Paid)')).toBeInTheDocument();
    expect(screen.getByText('8 paid sessions')).toBeInTheDocument();
    expect(screen.getByText('deducts when logged')).toBeInTheDocument();
    expect(screen.getByText('Claim pending')).toBeInTheDocument();
  });

  it('surfaces Move Fitness as free tracking after creation without paid inventory copy', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({
          success: true,
          message: 'Client onboarded successfully (Move Fitness - free tracking)',
          data: {
            client: {
              id: 90,
              firstName: 'Mira',
              lastName: 'Flow',
              clientSource: 'move_fitness',
              availableSessions: 0,
              accountStatus: 'stub',
            },
          },
        }),
      }),
    );

    render(<OnboardClientCard action={{ ...action, data: { ...action.data, clientSource: 'move_fitness' } }} />);

    fireEvent.click(screen.getByRole('button', { name: /confirm & create client/i }));

    await waitFor(() => expect(screen.getByText('Client Created')).toBeInTheDocument());
    expect(screen.getByText('Move Fitness (Free Tracking)')).toBeInTheDocument();
    expect(screen.getByText('free tracking')).toBeInTheDocument();
    expect(screen.getByText('no deduction')).toBeInTheDocument();
    expect(screen.queryByText('0 paid sessions')).not.toBeInTheDocument();
  });

  it('normalizes human-formatted source text in AI onboarding cards', () => {
    expect(getOnboardClientSourceMeta(' Move Fitness ')).toEqual({
      source: 'move_fitness',
      label: 'Move Fitness (Free Tracking)',
    });
    expect(getOnboardClientSourceMeta('move-fitness')).toEqual({
      source: 'move_fitness',
      label: 'Move Fitness (Free Tracking)',
    });
    expect(getOnboardClientSourceMeta(' External ')).toEqual({
      source: 'external',
      label: 'External (Free Tracking)',
    });
  });
});
