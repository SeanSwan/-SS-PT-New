import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OnboardClientCard from './OnboardClientCard';

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
});
