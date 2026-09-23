import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import ClientComplianceDashboard from './ClientComplianceDashboard';

const mockAuthAxios = vi.hoisted(() => ({
  get: vi.fn(),
}));
const mockAuthState = vi.hoisted(() => ({
  user: { id: 'actor-1' } as { id: string } | null,
}));

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios, user: mockAuthState.user }),
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
const client = (overrides: Record<string, unknown> = {}) => ({
  id: 44,
  firstName: 'Live',
  lastName: 'Client',
  riskLevel: 'warning',
  reason: 'Compliance dropped to 42%',
  daysSinceLastWorkout: 6,
  complianceRate7d: 33,
  complianceRate30d: 42,
  sessionsRemaining: 5,
  ...overrides,
});

describe('ClientComplianceDashboard truth handling', () => {
  beforeEach(() => {
    mockAuthAxios.get.mockReset();
    mockAuthState.user = { id: 'actor-1' };
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

    render(<MemoryRouter><ClientComplianceDashboard /></MemoryRouter>);

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

    render(<MemoryRouter><ClientComplianceDashboard /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText('Free Tracking')).toBeInTheDocument());
    expect(screen.getByText('No workouts in 12 days')).toBeInTheDocument();
    expect(screen.queryByText(/\bleft\b/i)).not.toBeInTheDocument();
  });

  it('shows unavailable state instead of demo clients when the API fails', async () => {
    mockAuthAxios.get.mockRejectedValueOnce(new Error('network down'));

    render(<MemoryRouter><ClientComplianceDashboard /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText('Compliance data could not be loaded.')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByText(/Marcus Johnson|Alicia Chen|Priya Patel/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/All clients are on track!/i)).not.toBeInTheDocument();
  });

  it('treats malformed success rows as unavailable instead of rendering unsafe data', async () => {
    mockAuthAxios.get.mockResolvedValueOnce({
      data: { clients: [{ ...client(), complianceRate30d: Number.NaN }] },
    });

    render(<MemoryRouter><ClientComplianceDashboard /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText('Compliance data could not be loaded.')).toBeInTheDocument());
    expect(screen.queryByText('Live Client')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('treats a malformed success body as unavailable while accepting a valid empty result', async () => {
    mockAuthAxios.get.mockResolvedValueOnce({ data: { clients: { unexpected: true } } });

    const { unmount } = render(<MemoryRouter><ClientComplianceDashboard /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Compliance data could not be loaded.')).toBeInTheDocument());
    unmount();

    mockAuthAxios.get.mockResolvedValueOnce({ data: { clients: [] } });
    render(<MemoryRouter><ClientComplianceDashboard /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('No current interventions')).toBeInTheDocument());
    expect(screen.queryByText(/All clients are on track!/i)).not.toBeInTheDocument();
  });

  it('does not announce global all-clear when a selected filter has no matches', async () => {
    mockAuthAxios.get.mockResolvedValueOnce({ data: { clients: [client()] } });

    render(<MemoryRouter><ClientComplianceDashboard /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Live Client')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /^Critical/ }));
    expect(screen.getByText('No critical clients in this result')).toBeInTheDocument();
    expect(screen.queryByText(/All clients are on track!/i)).not.toBeInTheDocument();
  });

  it('ignores an older request when the authenticated actor changes', async () => {
    let resolveFirst!: (value: { data: { clients: unknown[] } }) => void;
    let resolveSecond!: (value: { data: { clients: unknown[] } }) => void;
    const first = new Promise<{ data: { clients: unknown[] } }>(resolve => { resolveFirst = resolve; });
    const second = new Promise<{ data: { clients: unknown[] } }>(resolve => { resolveSecond = resolve; });
    mockAuthAxios.get.mockReturnValueOnce(first).mockReturnValueOnce(second);

    const { rerender } = render(<MemoryRouter><ClientComplianceDashboard /></MemoryRouter>);
    await waitFor(() => expect(mockAuthAxios.get).toHaveBeenCalledTimes(1));

    mockAuthState.user = { id: 'actor-2' };
    rerender(<MemoryRouter><ClientComplianceDashboard /></MemoryRouter>);
    await waitFor(() => expect(mockAuthAxios.get).toHaveBeenCalledTimes(2));

    await act(async () => {
      resolveSecond({ data: { clients: [client({ id: 2, firstName: 'New', lastName: 'Actor' })] } });
    });
    await waitFor(() => expect(screen.getByText('New Actor')).toBeInTheDocument());

    await act(async () => {
      resolveFirst({ data: { clients: [client({ id: 1, firstName: 'Old', lastName: 'Actor' })] } });
    });
    expect(screen.queryByText('Old Actor')).not.toBeInTheDocument();
    expect(screen.getByText('New Actor')).toBeInTheDocument();
  });

  it('ignores completion after unmount', async () => {
    let resolveRequest!: (value: { data: { clients: unknown[] } }) => void;
    const pending = new Promise<{ data: { clients: unknown[] } }>(resolve => { resolveRequest = resolve; });
    mockAuthAxios.get.mockReturnValueOnce(pending);

    const { unmount } = render(<MemoryRouter><ClientComplianceDashboard /></MemoryRouter>);
    await waitFor(() => expect(mockAuthAxios.get).toHaveBeenCalledTimes(1));
    unmount();

    await act(async () => {
      resolveRequest({ data: { clients: [client({ firstName: 'Unmounted', lastName: 'Client' })] } });
    });
    expect(screen.queryByText('Unmounted Client')).not.toBeInTheDocument();
  });

  it('keeps the sitemap canonical, public, unique, and free of invented dates', () => {
    const sitemap = readFileSync(resolve(process.cwd(), 'public/sitemap.xml'), 'utf8');
    const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
    const expected = [
      '/', '/about', '/contact', '/gallery', '/video-library', '/waiver',
      '/privacy', '/terms', '/ascension', '/store', '/food-scanner',
    ].map(path => `https://sswanstudios.com${path}`);

    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(new Set(locations)).toEqual(new Set(expected));
    expect(locations).toHaveLength(expected.length);
    expect(sitemap).not.toContain('<lastmod>');
    expect(sitemap).not.toContain('https://sswanstudios.com/support');
    expect(sitemap).not.toMatch(/\/(?:login|signup|forgot-password|reset-password|claim)(?:[/?<]|$)/);
    expect(sitemap).not.toMatch(/\/(?:gallery|watch|collections)\/:[^<]+/);
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
