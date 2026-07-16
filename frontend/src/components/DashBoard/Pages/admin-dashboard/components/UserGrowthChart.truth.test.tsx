
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import UserGrowthChart from './UserGrowthChart';

const mockAuthAxios = {
  get: vi.fn(),
};

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SOURCE = readFileSync(resolve(__dirname, './UserGrowthChart.tsx'), 'utf8');

describe('UserGrowthChart truth handling', () => {
  beforeEach(() => {
    mockAuthAxios.get.mockReset();
  });

  it('renders user growth values returned by the analytics API', async () => {
    mockAuthAxios.get.mockResolvedValueOnce({
      data: {
        data: {
          overview: {
            totalUsers: 42,
            activeToday: 17,
            newThisWeek: 4,
            retentionRate: 82.5,
          },
          userActivity: [
            { date: '2026-05-16', activeUsers: 14, newUsers: 3 },
            { date: '2026-05-17', activeUsers: 17, newUsers: 4 },
          ],
        },
      },
    });

    render(<UserGrowthChart />);

    await waitFor(() => expect(screen.getByText(/17 active/i)).toBeInTheDocument());
    expect(screen.getByText(/82\.5% retention/i)).toBeInTheDocument();
    expect(screen.getByText(/\+4 this week/i)).toBeInTheDocument();
    expect(screen.getByText(/\+7 this month/i)).toBeInTheDocument();
    expect(screen.queryByText(/47 active/i)).not.toBeInTheDocument();
  });

  it('shows unavailable state instead of demo growth when the API fails', async () => {
    mockAuthAxios.get.mockRejectedValueOnce(new Error('users unavailable'));

    render(<UserGrowthChart />);

    await waitFor(() => expect(screen.getByText('User growth data could not be loaded.')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText(/47 active/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+3 this week/i)).not.toBeInTheDocument();
  });

  it('shows an empty state instead of demo history when the API returns no growth rows', async () => {
    mockAuthAxios.get.mockResolvedValueOnce({
      data: { data: { overview: { activeToday: 0, retentionRate: 0 }, userActivity: [] } },
    });

    render(<UserGrowthChart />);

    await waitFor(() => expect(screen.getByText('No user growth data for this period.')).toBeInTheDocument());
    expect(screen.queryByText(/47 active/i)).not.toBeInTheDocument();
  });

  it('does not retain demo user growth fixtures', () => {
    expect(SOURCE).not.toContain('const DEMO');
    expect(SOURCE).not.toMatch(/142|87\.5|Week 1|\+3 this week/);
  });
});
