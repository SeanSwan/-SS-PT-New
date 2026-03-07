import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { DollarSign, Users, Dumbbell, Monitor, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../../context/AuthContext';
import RealTimeSignupMonitoring from '../components/RealTimeSignupMonitoring';
import ContactNotifications from '../components/ContactNotifications';
import OrientationIntakeWidget from '../components/OrientationIntakeWidget';
import SocialOverviewWidget from '../components/SocialOverviewWidget';
import ModerationWidget from '../components/ModerationWidget';
import CancelledSessionsWidget from '../components/CancelledSessionsWidget';
import UpcomingChecksWidget from '../components/UpcomingChecksWidget';
import AdminOverviewMetrics from './AdminOverviewMetrics';
import AdminSystemHealthPanel from './AdminSystemHealthPanel';
import AdminQuickActions from './AdminQuickActions';
import { AdminDashboardMetric, AdminQuickAction, SystemHealthMetric } from './AdminOverview.types';

const AdminOverviewPanel: React.FC = () => {
  const { authAxios } = useAuth();
  const navigate = useNavigate();
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
        action: () => navigate('/dashboard/analytics/revenue'),
      },
      {
        id: 'view-users',
        title: 'User Management',
        description: 'Manage platform users',
        icon: <Users size={20} />,
        action: () => navigate('/dashboard/people'),
      },
      {
        id: 'view-security',
        title: 'Security Dashboard',
        description: 'Security monitoring',
        icon: <ShieldCheck size={20} />,
        action: () => navigate('/dashboard/system/security'),
      },
      {
        id: 'view-system',
        title: 'System Health',
        description: 'Infrastructure monitoring',
        icon: <Monitor size={20} />,
        action: () => navigate('/dashboard/system/health'),
      },
    ],
    [navigate]
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

      const revenueData = revenueRes.data?.data ?? {};
      const usersData = usersRes.data?.data ?? {};
      const workoutsData = workoutsRes.data?.data ?? {};
      const healthData = healthRes.data?.data ?? {};

      const nextMetrics: AdminDashboardMetric[] = [
        {
          id: 'total-revenue',
          title: 'Total Revenue',
          value: revenueData.totalRevenue ?? 0,
          change: Number(revenueData.changePercent ?? 0),
          changeType: mapChangeType(Number(revenueData.changePercent ?? 0)),
          icon: <DollarSign size={24} />,
          color: '#10b981',
          description: 'Monthly recurring revenue',
          trend: revenueData.trend ?? [],
          target: revenueData.target ?? undefined,
          format: 'currency',
        },
        {
          id: 'active-users',
          title: 'Active Users',
          value: (usersData.activeUsers ?? usersData.totalUsers) ?? 0,
          change: Number(usersData.changePercent ?? 0),
          changeType: mapChangeType(Number(usersData.changePercent ?? 0)),
          icon: <Users size={24} />,
          color: '#3b82f6',
          description: 'Daily active users',
          trend: usersData.trend ?? [],
          target: usersData.target ?? undefined,
          format: 'number',
        },
        {
          id: 'completion-rate',
          title: 'Workout Completion',
          value: Number(workoutsData.completionRate ?? 0).toFixed(1),
          change: Number(workoutsData.changePercent ?? 0),
          changeType: mapChangeType(Number(workoutsData.changePercent ?? 0)),
          icon: <Dumbbell size={24} />,
          color: '#f59e0b',
          description: 'Average workout completion rate',
          trend: workoutsData.trend ?? [],
          target: workoutsData.target ?? undefined,
          format: 'percentage',
        },
        {
          id: 'system-health',
          title: 'System Health',
          value: Number(healthData.uptime ?? 0).toFixed(2),
          change: Number(healthData.changePercent ?? 0),
          changeType: mapChangeType(Number(healthData.changePercent ?? 0)),
          icon: <Monitor size={24} />,
          color: '#10b981',
          description: 'Overall system uptime',
          trend: healthData.trend ?? [],
          target: 99.9,
          format: 'percentage',
        },
      ];

      const nextSystemHealth: SystemHealthMetric[] = (healthData.services ?? []).map((service: any) => ({
        service: service.name ?? 'Service',
        status:
          service.status === 'online'
            ? 'healthy'
            : service.status === 'degraded'
              ? 'warning'
              : 'error',
        uptime: Number(service.uptime ?? 0),
        responseTime: Number(service.responseTime ?? 0),
        errorRate: Number(healthData.systemMetrics?.errorRate ?? 0),
        throughput: Number((service.requestsPerMin ?? healthData.systemMetrics?.throughput) ?? 0),
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
      <OrientationIntakeWidget />
      <ContactNotifications autoRefresh={true} showActions={true} />
      <SocialOverviewWidget />
      <ModerationWidget />

      <ControlsHeader>
        <ControlsInner>
          <CosmicSelect
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            aria-label="Select time range"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </CosmicSelect>
          {isLoading && <StatusText>Loading...</StatusText>}
          {error && <ErrorText>{error}</ErrorText>}
        </ControlsInner>
      </ControlsHeader>

      <AdminOverviewMetrics metrics={metrics} />

      {/* Upcoming Measurement Check-ins Widget */}
      <UpcomingChecksWidget />

      {/* Cancelled Sessions Widget - Shows late cancellations with charge options */}
      <CancelledSessionsWidget maxItems={10} showChargeButtons={true} />

      <AdminSystemHealthPanel systemHealth={systemHealth} onRefresh={fetchAdminOverview} />
      <AdminQuickActions actions={quickActions} />
    </div>
  );
};

// === Styled Components ===

const ControlsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 16px 24px;
  background: rgba(10, 10, 26, 0.4);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(120, 81, 169, 0.2);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
`;

const ControlsInner = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const CosmicSelect = styled.select`
  appearance: none;
  background: rgba(255, 255, 255, 0.03) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2300FFFF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 12px center;
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 10px;
  color: #ffffff;
  padding: 10px 40px 10px 16px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  min-height: 44px;
  transition: all 0.2s ease;

  &:hover, &:focus {
    background-color: rgba(0, 255, 255, 0.05);
    border-color: #00FFFF;
    box-shadow: 0 0 0 3px rgba(0, 255, 255, 0.1);
  }

  option {
    background: #0a0a1a;
    color: #ffffff;
    padding: 12px;
  }
`;

const StatusText = styled.span`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
`;

const ErrorText = styled.span`
  color: #ef4444;
  font-size: 0.875rem;
`;

export default AdminOverviewPanel;
