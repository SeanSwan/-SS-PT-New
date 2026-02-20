import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DollarSign, Users, Dumbbell, Monitor, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import RealTimeSignupMonitoring from '../components/RealTimeSignupMonitoring';
import ContactNotifications from '../components/ContactNotifications';
import CancelledSessionsWidget from '../components/CancelledSessionsWidget';
import AdminOverviewMetrics from './AdminOverviewMetrics';
import AdminSystemHealthPanel from './AdminSystemHealthPanel';
import AdminQuickActions from './AdminQuickActions';
import { AdminDashboardMetric, AdminQuickAction, SystemHealthMetric } from './AdminOverview.types';

const AdminOverviewPanel: React.FC = () => {
  const { authAxios } = useAuth();
  const [timeRange, setTimeRange] = useState('24h');
  const [metrics, setMetrics] = useState<AdminDashboardMetric[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealthMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quickActions: AdminQuickAction[] = useMemo(
    () => [
      {
        id: 'view-revenue',
        title: 'Revenue Analytics',
        description: 'Detailed revenue analysis',
        icon: <DollarSign size={20} />,
        action: () => {},
      },
      {
        id: 'view-users',
        title: 'User Management',
        description: 'Manage platform users',
        icon: <Users size={20} />,
        action: () => {},
      },
      {
        id: 'view-security',
        title: 'Security Dashboard',
        description: 'Security monitoring',
        icon: <ShieldCheck size={20} />,
        action: () => {},
      },
      {
        id: 'view-system',
        title: 'System Health',
        description: 'Infrastructure monitoring',
        icon: <Monitor size={20} />,
        action: () => {},
      },
    ],
    []
  );

  const mapChangeType = (value: number): AdminDashboardMetric['changeType'] => {
    if (value > 0) return 'increase';
    if (value < 0) return 'decrease';
    return 'neutral';
  };

  const fetchAdminOverview = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [revenueRes, usersRes, workoutsRes, healthRes] = await Promise.all([
        authAxios.get('/api/admin/analytics/statistics/revenue', { params: { timeRange } }),
        authAxios.get('/api/admin/analytics/statistics/users'),
        authAxios.get('/api/admin/analytics/statistics/workouts'),
        authAxios.get('/api/admin/analytics/statistics/system-health'),
      ]);

      const revenueData = revenueRes.data?.data || {};
      const usersData = usersRes.data?.data || {};
      const workoutsData = workoutsRes.data?.data || {};
      const healthData = healthRes.data?.data || {};

      const nextMetrics: AdminDashboardMetric[] = [
        {
          id: 'total-revenue',
          title: 'Total Revenue',
          value: revenueData.totalRevenue || 0,
          change: Number(revenueData.changePercent || 0),
          changeType: mapChangeType(Number(revenueData.changePercent || 0)),
          icon: <DollarSign size={24} />,
          color: '#10b981',
          description: 'Monthly recurring revenue',
          trend: revenueData.trend || [],
          target: revenueData.target || undefined,
          format: 'currency',
        },
        {
          id: 'active-users',
          title: 'Active Users',
          value: usersData.activeUsers || usersData.totalUsers || 0,
          change: Number(usersData.changePercent || 0),
          changeType: mapChangeType(Number(usersData.changePercent || 0)),
          icon: <Users size={24} />,
          color: '#3b82f6',
          description: 'Daily active users',
          trend: usersData.trend || [],
          target: usersData.target || undefined,
          format: 'number',
        },
        {
          id: 'completion-rate',
          title: 'Workout Completion',
          value: Number(workoutsData.completionRate || 0).toFixed(1),
          change: Number(workoutsData.changePercent || 0),
          changeType: mapChangeType(Number(workoutsData.changePercent || 0)),
          icon: <Dumbbell size={24} />,
          color: '#f59e0b',
          description: 'Average workout completion rate',
          trend: workoutsData.trend || [],
          target: workoutsData.target || undefined,
          format: 'percentage',
        },
        {
          id: 'system-health',
          title: 'System Health',
          value: Number(healthData.uptime || 0).toFixed(2),
          change: Number(healthData.changePercent || 0),
          changeType: mapChangeType(Number(healthData.changePercent || 0)),
          icon: <Monitor size={24} />,
          color: '#10b981',
          description: 'Overall system uptime',
          trend: healthData.trend || [],
          target: 99.9,
          format: 'percentage',
        },
      ];

      const nextSystemHealth: SystemHealthMetric[] = (healthData.services || []).map((service: any) => ({
        service: service.name || 'Service',
        status:
          service.status === 'online'
            ? 'healthy'
            : service.status === 'degraded'
              ? 'warning'
              : 'error',
        uptime: Number(service.uptime || 0),
        responseTime: Number(service.responseTime || 0),
        errorRate: Number(healthData.systemMetrics?.errorRate || 0),
        throughput: Number(service.requestsPerMin || healthData.systemMetrics?.throughput || 0),
        details: service.status === 'online' ? 'All endpoints responding normally' : 'Performance degraded',
      }));

      setMetrics(nextMetrics);
      setSystemHealth(nextSystemHealth);
    } catch (err) {
      setError('Failed to load admin overview metrics');
    } finally {
      setIsLoading(false);
    }
  }, [authAxios, timeRange]);

  useEffect(() => {
    fetchAdminOverview();
  }, [fetchAdminOverview]);

  return (
    <div>
      <RealTimeSignupMonitoring authAxios={authAxios} autoRefresh={true} refreshInterval={30000} />
      <ContactNotifications autoRefresh={true} showActions={true} />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          padding: '1rem',
          background: 'rgba(30, 58, 138, 0.2)',
          borderRadius: '12px',
          border: '1px solid rgba(59, 130, 246, 0.3)',
        }}
      >
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              color: '#ffffff',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
            }}
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          {isLoading && <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Loading...</span>}
          {error && <span style={{ color: '#ef4444' }}>{error}</span>}
        </div>
      </div>

      <AdminOverviewMetrics metrics={metrics} />

      {/* Cancelled Sessions Widget - Shows late cancellations with charge options */}
      <CancelledSessionsWidget maxItems={10} showChargeButtons={true} />

      <AdminSystemHealthPanel systemHealth={systemHealth} onRefresh={fetchAdminOverview} />
      <AdminQuickActions actions={quickActions} />
    </div>
  );
};

export default AdminOverviewPanel;
