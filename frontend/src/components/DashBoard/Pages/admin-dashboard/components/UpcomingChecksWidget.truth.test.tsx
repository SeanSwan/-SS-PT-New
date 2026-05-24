import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UpcomingChecksWidget from './UpcomingChecksWidget';

const mockAuthAxios = {
  get: vi.fn(),
};

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/UpcomingChecksWidget.tsx'),
  'utf8',
);

describe('UpcomingChecksWidget backend contract', () => {
  beforeEach(() => {
    mockAuthAxios.get.mockReset();
    mockAuthAxios.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          clients: [
            {
              id: 11,
              firstName: 'Private',
              lastName: 'Client',
              measurementStatus: {
                status: 'yellow',
                daysRemaining: 2,
                dueDate: '2026-05-25',
              },
              weighInStatus: {
                status: 'red',
                daysRemaining: -1,
                dueDate: '2026-05-22',
              },
            },
          ],
        },
      },
    });
  });

  it('renders object-shaped measurement statuses returned by /api/measurements/schedule/upcoming', async () => {
    render(<UpcomingChecksWidget />);

    expect(mockAuthAxios.get).toHaveBeenCalledWith('/api/measurements/schedule/upcoming');
    expect(await screen.findAllByText('Private Client')).toHaveLength(2);
    expect(screen.getByText('1d overdue')).toBeInTheDocument();
    expect(screen.getByText('2d left')).toBeInTheDocument();
    expect(screen.queryByText('0d overdue')).not.toBeInTheDocument();
  });

  it('does not depend on legacy flat daysRemaining fields that the backend does not return', () => {
    expect(SOURCE).not.toContain('measurementDaysRemaining');
    expect(SOURCE).not.toContain('weighInDaysRemaining');
  });
});
