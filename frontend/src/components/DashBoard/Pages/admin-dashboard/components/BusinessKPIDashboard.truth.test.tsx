import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import BusinessKPIDashboard from './BusinessKPIDashboard';

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
const SOURCE = readFileSync(resolve(__dirname, './BusinessKPIDashboard.tsx'), 'utf8');

describe('BusinessKPIDashboard truth handling', () => {
  beforeEach(() => {
    mockAuthAxios.get.mockReset();
  });

  it('renders KPI values returned by the business KPI API', async () => {
    mockAuthAxios.get.mockResolvedValueOnce({
      data: {
        data: {
          mrr: 1234,
          mrrChange: 5,
          totalRevenue: 5678,
          revenueChange: 0,
          activeClients: 9,
          newClients: 2,
          churnedClients: 1,
          churnRate: 11.1,
          sessionUtilization: 75,
          avgLTV: 631,
          avgRevenuePerClient: 137,
          sessionsThisMonth: 6,
          sessionsLastMonth: 4,
          revenueSparkline: [100, 200],
          clientSparkline: [8, 9],
        },
      },
    });

    render(<BusinessKPIDashboard />);

    await waitFor(() => expect(screen.getByText('$1,234')).toBeInTheDocument());
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.queryByText('$8,750')).not.toBeInTheDocument();
  });

  it('shows unavailable state instead of demo KPIs when the API fails', async () => {
    mockAuthAxios.get.mockRejectedValueOnce(new Error('analytics unavailable'));

    render(<BusinessKPIDashboard />);

    await waitFor(() => expect(screen.getByText('Business KPI data could not be loaded.')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText('$8,750')).not.toBeInTheDocument();
    expect(screen.queryByText('$26,250')).not.toBeInTheDocument();
    expect(screen.queryByText('$2,840')).not.toBeInTheDocument();
  });

  it('does not retain demo business KPI data', () => {
    expect(SOURCE).not.toContain('buildDemoData');
    expect(SOURCE).not.toMatch(/8750|26250|2840|sessionUtilization:\s*78/);
  });
});
