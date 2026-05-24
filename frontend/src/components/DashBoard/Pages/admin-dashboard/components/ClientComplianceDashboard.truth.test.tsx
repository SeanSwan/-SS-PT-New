import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import ClientComplianceDashboard from './ClientComplianceDashboard';

const mockAuthAxios = {
  get: vi.fn(),
};

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

vi.mock('../admin-dashboard-view', () => ({
  CommandCard: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SOURCE = readFileSync(resolve(__dirname, './ClientComplianceDashboard.tsx'), 'utf8');

describe('ClientComplianceDashboard truth handling', () => {
  beforeEach(() => {
    mockAuthAxios.get.mockReset();
  });

  it('renders live at-risk clients returned by the compliance API', async () => {
    mockAuthAxios.get.mockResolvedValueOnce({
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
    });

    render(<ClientComplianceDashboard />);

    await waitFor(() => expect(screen.getByText('Live Client')).toBeInTheDocument());
    expect(screen.getByText('Compliance dropped to 42%')).toBeInTheDocument();
    expect(screen.queryByText(/Marcus Johnson|Alicia Chen|Priya Patel/i)).not.toBeInTheDocument();
  });

  it('shows unavailable state instead of demo clients when the API fails', async () => {
    mockAuthAxios.get.mockRejectedValueOnce(new Error('network down'));

    render(<ClientComplianceDashboard />);

    await waitFor(() => expect(screen.getByText('Compliance data could not be loaded.')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText(/Marcus Johnson|Alicia Chen|Priya Patel/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/All clients are on track!/i)).not.toBeInTheDocument();
  });

  it('does not retain the old demo data builder', () => {
    expect(SOURCE).not.toContain('buildDemoData');
    expect(SOURCE).not.toMatch(/Marcus|Alicia|Priya/);
  });
});
