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

  it('a failed fetch renders "Data unavailable" — NEVER "All clients are up to date" (SWA-138 S1 / blueprint C4)', async () => {
    mockAuthAxios.get.mockReset();
    mockAuthAxios.get.mockRejectedValue(new Error('Request failed with status code 500'));

    render(<UpcomingChecksWidget />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Data unavailable');
    expect(screen.queryByText('All clients are up to date')).not.toBeInTheDocument();
  });

  it('does not depend on legacy flat daysRemaining fields that the backend does not return', () => {
    expect(SOURCE).not.toContain('measurementDaysRemaining');
    expect(SOURCE).not.toContain('weighInDaysRemaining');
  });

  it('uses theme tokens and color-mix for status visuals', () => {
    expect(SOURCE).toContain("red: 'var(--error, #EF4444)'");
    expect(SOURCE).toContain("yellow: 'var(--warning, #EAB308)'");
    expect(SOURCE).toContain("green: 'var(--success, #22C55E)'");
    expect(SOURCE).toContain("const STATUS_FALLBACK = 'var(--text-muted, #94A3B8)'");
    expect(SOURCE).toContain('color-mix(in srgb, ${({ $color }) => $color} 20%, transparent)');
    expect(SOURCE).not.toContain("red: '#ef4444'");
    expect(SOURCE).not.toContain("yellow: '#eab308'");
    expect(SOURCE).not.toContain("green: '#22c55e'");
    expect(SOURCE).not.toContain('color: #e2e8f0;');
    expect(SOURCE).not.toContain('color: #94a3b8;');
    expect(SOURCE).not.toContain("color: '#60C0F0'");
    expect(SOURCE).not.toContain("|| '#94a3b8'");
    expect(SOURCE).not.toContain('${({ $color }) => $color}20');
    expect(SOURCE).not.toContain('${({ $color }) => $color}40');
    expect(SOURCE).not.toContain('${({ $color }) => $color}80');
  });
});
