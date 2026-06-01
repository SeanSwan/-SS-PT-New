import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RealTimeSignupMonitoring from './RealTimeSignupMonitoring';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '../../../../../../..');
const source = readFileSync(resolve(__dirname, './RealTimeSignupMonitoring.tsx'), 'utf8');
const parentSource = readFileSync(resolve(__dirname, '../overview/AdminOverviewPanel.tsx'), 'utf8');
const coreRoutes = readFileSync(resolve(repoRoot, 'backend/core/routes.mjs'), 'utf8');
const adminRoutes = readFileSync(resolve(repoRoot, 'backend/routes/adminRoutes.mjs'), 'utf8');

const dashboardStats = {
  overview: {
    totalUsers: 12,
    activeUsers: 9,
    recentSignups: 2,
    weeklySignups: 5,
    monthlySignups: 8,
  },
  growth: {
    daily: 1,
    weekly: 3,
    monthly: 6,
    averageDailySignups: '1.7',
  },
  distribution: {
    byRole: [{ role: 'client', count: 12 }],
    activePercentage: '75',
  },
  latestSignups: [],
  timestamp: '2026-05-23T12:00:00.000Z',
  databaseStatus: 'healthy',
};

const databaseHealth = {
  status: 'healthy',
  database: 'postgres',
  version: '16',
  connectivity: 'connected',
  userTableAccessible: true,
  totalUsers: 12,
  lastUserCreated: '2026-05-23T12:00:00.000Z',
  timestamp: '2026-05-23T12:00:00.000Z',
};

const ok = (data: unknown) => Promise.resolve({ data: { success: true, data } });

describe('RealTimeSignupMonitoring truth handling', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is mounted by admin overview and backed by mounted admin dashboard routes', () => {
    expect(parentSource).toContain('<RealTimeSignupMonitoring authAxios={authAxios} autoRefresh={true} refreshInterval={30000} />');
    expect(coreRoutes).toContain("app.use('/api/admin', adminRoutes)");
    expect(adminRoutes).toContain("router.get('/dashboard-stats'");
    expect(adminRoutes).toContain("router.get('/signups-list'");
    expect(adminRoutes).toContain("router.get('/database-health'");
    expect(source).toContain("authAxios.get<DashboardStats>('/api/admin/dashboard-stats')");
    expect(source).toContain('authAxios.get<SignupsListData>(`/api/admin/signups-list?${params}`)');
    expect(source).toContain("authAxios.get<DatabaseHealth>('/api/admin/database-health')");
  });

  it('keeps the active component split into tokenized, touch-safe building blocks', () => {
    const sourceLines = source.trimEnd().split(/\r?\n/).length;
    const stylesSource = readFileSync(resolve(__dirname, './RealTimeSignupMonitoring.styles.ts'), 'utf8');

    expect(sourceLines).toBeLessThanOrEqual(300);
    expect(source).toContain("from './RealTimeSignupMonitoring.styles'");
    expect(source).toContain("from './RealTimeSignupMonitoring.types'");
    expect(source).not.toContain("import styled from 'styled-components'");
    expect(`${source}\n${stylesSource}`).not.toMatch(/rgba\(/);
    expect(stylesSource).toContain('min-height: 44px');
    expect(stylesSource).toContain('focus-visible');
  });

  it('shows unavailable state instead of a clean empty signup list when signups fail', async () => {
    const authAxios = {
      get: vi.fn((url: string) => {
        if (url === '/api/admin/dashboard-stats') return ok(dashboardStats);
        if (url.startsWith('/api/admin/signups-list')) return Promise.reject(new Error('signups down'));
        if (url === '/api/admin/database-health') return ok(databaseHealth);
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      }),
    };

    render(<RealTimeSignupMonitoring authAxios={authAxios} autoRefresh={false} />);

    expect(await screen.findByText('Recent signups unavailable.')).toBeInTheDocument();
    expect(screen.queryByText('No recent signups to display')).not.toBeInTheDocument();
  });

  it('does not skip a failed signups page when Load More is retried', async () => {
    const signupsUrls: string[] = [];
    let offset20Attempts = 0;
    const authAxios = {
      get: vi.fn((url: string) => {
        if (url === '/api/admin/dashboard-stats') return ok(dashboardStats);
        if (url === '/api/admin/database-health') return ok(databaseHealth);
        if (url.startsWith('/api/admin/signups-list')) {
          signupsUrls.push(url);
          if (url.includes('offset=0')) return ok({ signups: [], pagination: { hasMore: true } });
          if (url.includes('offset=20')) {
            offset20Attempts += 1;
            if (offset20Attempts === 1) return Promise.reject(new Error('page down'));
            return ok({
              signups: [{
                id: '101',
                firstName: 'Retry',
                lastName: 'Person',
                email: 'retry@example.com',
                role: 'client',
                createdAt: new Date().toISOString(),
              }],
              pagination: { hasMore: false },
            });
          }
          if (url.includes('offset=40')) return ok({ signups: [], pagination: { hasMore: false } });
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      }),
    };

    render(<RealTimeSignupMonitoring authAxios={authAxios} autoRefresh={false} />);

    await screen.findByText('No recent signups to display');
    fireEvent.click(screen.getByRole('button', { name: /load more signups/i }));
    expect(await screen.findByText('Recent signups unavailable.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /load more signups/i }));

    await waitFor(() => expect(screen.getByText('Retry Person')).toBeInTheDocument());
    expect(signupsUrls.filter(url => url.includes('offset=20'))).toHaveLength(2);
    expect(signupsUrls.some(url => url.includes('offset=40'))).toBe(false);
  });

  it('keeps the signups error and pagination guards in source', () => {
    expect(source).toContain('const [signupsError, setSignupsError]');
    expect(source).toContain('const [loadingMoreSignups, setLoadingMoreSignups]');
    expect(source).toContain("setSignupsError('Recent signups unavailable.')");
    expect(source).toContain('if (signupsLoaded) {');
  });
});
