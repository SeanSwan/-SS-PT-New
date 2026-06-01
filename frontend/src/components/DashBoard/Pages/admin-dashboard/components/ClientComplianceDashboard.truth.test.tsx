import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
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
const SOURCE_PATH = resolve(__dirname, './ClientComplianceDashboard.tsx');
const STYLE_PATH = resolve(__dirname, './ClientComplianceDashboard.styles.ts');
const SOURCE = readFileSync(SOURCE_PATH, 'utf8');
const STYLE_SOURCE = existsSync(STYLE_PATH) ? readFileSync(STYLE_PATH, 'utf8') : '';
const COMBINED_SOURCE = `${SOURCE}\n${STYLE_SOURCE}`;
const lineCount = (value: string) => value.split(/\r?\n/).length;

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

  it('does not show paid-session debt badges for free-tracking clients', async () => {
    mockAuthAxios.get.mockResolvedValueOnce({
      data: {
        clients: [
          {
            id: 45,
            firstName: 'Free',
            lastName: 'Tracking',
            riskLevel: 'critical',
            reason: 'No workouts in 12 days',
            daysSinceLastWorkout: 12,
            complianceRate7d: 0,
            complianceRate30d: 0,
            sessionsRemaining: null,
            isFreeTracking: true,
          },
        ],
      },
    });

    render(<ClientComplianceDashboard />);

    await waitFor(() => expect(screen.getByText('Free Tracking')).toBeInTheDocument());
    expect(screen.getByText('No workouts in 12 days')).toBeInTheDocument();
    expect(screen.queryByText(/\bleft\b/i)).not.toBeInTheDocument();
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

  it('keeps behavior separate from extracted dashboard styling', () => {
    expect(SOURCE).toContain("from './ClientComplianceDashboard.styles'");
    expect(existsSync(STYLE_PATH)).toBe(true);
    expect(lineCount(SOURCE)).toBeLessThanOrEqual(300);
    expect(lineCount(STYLE_SOURCE)).toBeLessThanOrEqual(300);
  });

  it('uses dashboard theme tokens instead of direct widget color literals', () => {
    expect(COMBINED_SOURCE).toContain("const RISK_CRITICAL = 'var(--error, #EF4444)'");
    expect(COMBINED_SOURCE).toContain("const RISK_WARNING = 'var(--warning, #F59E0B)'");
    expect(COMBINED_SOURCE).toContain("const RISK_WATCH = 'var(--accent-tertiary, #4070C0)'");
    expect(COMBINED_SOURCE).toContain("const RISK_HEALTHY = 'var(--success, #10B981)'");
    expect(COMBINED_SOURCE).toContain('color-mix(in srgb, ${p => riskColor(p.$level)}');
    expect(COMBINED_SOURCE).not.toContain('color="#f59e0b"');
    expect(COMBINED_SOURCE).not.toContain('color="#10b981"');
    expect(COMBINED_SOURCE).not.toContain('$color="#ef4444"');
    expect(COMBINED_SOURCE).not.toContain('$color="#3b82f6"');
    expect(COMBINED_SOURCE).not.toContain('color: #f0f0ff;');
    expect(COMBINED_SOURCE).not.toContain('color: #c4b5fd;');
    expect(COMBINED_SOURCE).not.toContain("p.$level === 'critical' ? '#ef4444'");
  });
});
