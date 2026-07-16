
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import RevenueChart from './RevenueChart';

const mockAuthAxios = {
  get: vi.fn(),
};

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SOURCE = readFileSync(resolve(__dirname, './RevenueChart.tsx'), 'utf8');
const STYLES_SOURCE = readFileSync(resolve(__dirname, './RevenueChart.styles.ts'), 'utf8');
const TYPES_SOURCE = readFileSync(resolve(__dirname, './RevenueChart.types.ts'), 'utf8');

describe('RevenueChart truth handling', () => {
  beforeEach(() => {
    mockAuthAxios.get.mockReset();
  });

  it('renders revenue values returned by the revenue API', async () => {
    mockAuthAxios.get.mockResolvedValueOnce({
      data: {
        data: {
          overview: {
            totalRevenue: 8400,
            monthlyRecurring: 4200,
            averageTransaction: 210,
            totalCustomers: 12,
          },
          revenueHistory: [
            { date: 'May', revenue: 3600, transactions: 8 },
            { date: 'Jun', revenue: 4200, transactions: 10 },
          ],
        },
      },
    });

    render(<RevenueChart />);

    await waitFor(() => expect(screen.getByText(/MRR:\s*\$4,200/i)).toBeInTheDocument());
    expect(screen.getByText(/Avg:\s*\$210/i)).toBeInTheDocument();
    expect(screen.queryByText(/MRR:\s*\$8,750/i)).not.toBeInTheDocument();
  });

  it('shows unavailable state instead of demo revenue when the API fails', async () => {
    mockAuthAxios.get.mockRejectedValueOnce(new Error('revenue unavailable'));

    render(<RevenueChart />);

    await waitFor(() => expect(screen.getByText('Revenue data could not be loaded.')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText(/MRR:\s*\$8,750/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Avg:\s*\$186/i)).not.toBeInTheDocument();
  });

  it('shows an empty state instead of demo history when the API returns no revenue rows', async () => {
    mockAuthAxios.get.mockResolvedValueOnce({ data: { data: { overview: {}, revenueHistory: [] } } });

    render(<RevenueChart />);

    await waitFor(() => expect(screen.getByText('No revenue trend data for this period.')).toBeInTheDocument());
    expect(screen.queryByText(/MRR:\s*\$8,750/i)).not.toBeInTheDocument();
  });

  it('does not retain demo revenue fixtures', () => {
    expect(SOURCE).not.toContain('DEMO_DATA');
    expect(SOURCE).not.toMatch(/8750|26250|5200|6100|Avg:\s*\$186/);
  });

  it('bridges chart controls to Crystalline Swan theme tokens', () => {
    expect(STYLES_SOURCE).toContain("color: ${p => p.$active ? CHART_COLORS.gildedFern : 'var(--text-muted, rgba(255,255,255,0.5))'};");
    expect(STYLES_SOURCE).toContain('&:hover { color: ${CHART_COLORS.iceWing}; background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent); }');
    expect(STYLES_SOURCE).not.toContain("color: ${p => p.$active ? CHART_COLORS.gildedFern : 'rgba(255,255,255,0.5)'};");
    expect(STYLES_SOURCE).not.toContain('background: rgba(96,192,240,0.1);');
  });

  it('keeps the active revenue chart split into bounded files', () => {
    expect(SOURCE).toContain("from './RevenueChart.styles'");
    expect(SOURCE).toContain("from './RevenueChart.types'");
    expect(SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(220);
    expect(STYLES_SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(220);
    expect(TYPES_SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(80);
  });
});
