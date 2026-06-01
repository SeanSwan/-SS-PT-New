/**
 * Dashboard command registry contracts
 * ====================================
 * Locks Swan Coach dashboard commands to mounted admin dashboard routes and
 * preserves the small read filters needed for command-center scans.
 */
import { describe, expect, it } from 'vitest';
import dashboardCommands from '../../services/ai/commandRegistry/dashboardCommands.mjs';

const byType = (type) => dashboardCommands.find((command) => command.type === type);

describe('dashboard command registry contracts', () => {
  it('targets mounted dashboard and analytics routes only', () => {
    expect(byType('scan_command_center')).toMatchObject({
      method: 'GET',
      endpoint: '/api/admin/ai-bff/command-center',
      destructive: false,
      requiresConfirmation: false,
    });
    expect(byType('view_revenue')).toMatchObject({
      method: 'GET',
      endpoint: '/api/admin/analytics/revenue',
      destructive: false,
      requiresConfirmation: false,
    });
    expect(byType('view_business_kpis')).toMatchObject({
      method: 'GET',
      endpoint: '/api/admin/analytics/business-kpis',
      destructive: false,
      requiresConfirmation: false,
    });
    expect(byType('view_recent_signups')).toMatchObject({
      method: 'GET',
      endpoint: '/api/admin/recent-signups',
      destructive: false,
      requiresConfirmation: false,
    });
    expect(byType('view_system_health')).toMatchObject({
      method: 'GET',
      endpoint: '/health',
      destructive: false,
      requiresConfirmation: false,
    });
    expect(byType('view_active_user_count')).toMatchObject({
      method: 'GET',
      endpoint: '/api/admin/dashboard-stats',
      destructive: false,
      requiresConfirmation: false,
    });
  });

  it('does not point engagement or visitor commands at unmounted retired paths', () => {
    expect(byType('view_user_engagement')).toMatchObject({
      method: 'GET',
      endpoint: '/api/admin/analytics/users',
      destructive: false,
      requiresConfirmation: false,
    });
    expect(byType('view_visitor_intelligence')).toMatchObject({
      method: 'GET',
      endpoint: '/api/admin/dashboard/anonymous-visitors',
      destructive: false,
      requiresConfirmation: false,
    });
  });

  it('preserves command-center read filters instead of stripping them', () => {
    expect(byType('view_revenue').inputSchema.parse({ period: 'quarter' })).toEqual({
      period: 'quarter',
    });
    expect(byType('view_business_kpis').inputSchema.parse({ period: '90d' })).toEqual({
      period: '90d',
    });
    expect(byType('view_recent_signups').inputSchema.parse({ hours: '12', limit: '25' })).toEqual({
      hours: 12,
      limit: 25,
    });
    expect(byType('view_user_engagement').inputSchema.parse({ timeRange: '7d' })).toEqual({
      timeRange: '7d',
    });
    expect(byType('view_visitor_intelligence').inputSchema.parse({
      source: 'history',
      limit: '75',
    })).toEqual({
      source: 'history',
      limit: 75,
    });
  });
});
