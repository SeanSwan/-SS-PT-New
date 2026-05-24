import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import RecentActivityFeed from './RecentActivityFeed';

const mockAuthAxios = {
  get: vi.fn(),
};

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SOURCE = readFileSync(resolve(__dirname, './RecentActivityFeed.tsx'), 'utf8');

describe('RecentActivityFeed truth handling', () => {
  beforeEach(() => {
    mockAuthAxios.get.mockReset();
  });

  it('renders platform activity returned by the gamification feed API', async () => {
    mockAuthAxios.get.mockResolvedValueOnce({
      data: {
        data: [{
          id: 77,
          type: 'workout',
          message: 'Live workout logged',
          timeAgo: '3 min ago',
        }],
      },
    });

    render(<RecentActivityFeed />);

    await waitFor(() => expect(screen.getByText('Live workout logged')).toBeInTheDocument());
    expect(screen.getByText('3 min ago')).toBeInTheDocument();
    expect(mockAuthAxios.get).toHaveBeenCalledWith('/api/gamification/activity-feed', {
      params: { limit: 10 },
    });
    expect(screen.queryByText('New user registered')).not.toBeInTheDocument();
  });

  it('shows unavailable state instead of demo activity when the API fails', async () => {
    mockAuthAxios.get.mockRejectedValueOnce(new Error('activity feed unavailable'));

    render(<RecentActivityFeed />);

    await waitFor(() => expect(screen.getByText('Recent activity could not be loaded.')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText('Payment received - $186.00')).not.toBeInTheDocument();
    expect(screen.queryByText('Daily backup completed')).not.toBeInTheDocument();
  });

  it('shows an empty state instead of demo activity when no rows are returned', async () => {
    mockAuthAxios.get.mockResolvedValueOnce({ data: { data: [] } });

    render(<RecentActivityFeed />);

    await waitFor(() => expect(screen.getByText('No recent platform activity yet.')).toBeInTheDocument());
    expect(screen.queryByText('New user registered')).not.toBeInTheDocument();
    expect(screen.queryByText('Training session scheduled')).not.toBeInTheDocument();
  });

  it('does not retain demo recent-activity fixtures', () => {
    expect(SOURCE).not.toContain('DEMO_FEED');
    expect(SOURCE).not.toMatch(/Payment received|Daily backup completed|Upper Body workout|First Workout/);
  });
});
