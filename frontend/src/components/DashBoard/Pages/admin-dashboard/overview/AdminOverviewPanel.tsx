import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { DollarSign, Users, Dumbbell, Monitor, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../../context/AuthContext';
import RealTimeSignupMonitoring from '../components/RealTimeSignupMonitoring';
import ContactNotifications from '../components/ContactNotifications';
import OrientationIntakeWidget from '../components/OrientationIntakeWidget';
import SocialOverviewWidget from '../components/SocialOverviewWidget';
import ModerationWidget from '../components/ModerationWidget';
import PostReportsWidget from '../components/PostReportsWidget';
import CancelledSessionsWidget from '../components/CancelledSessionsWidget';
import UpcomingChecksWidget from '../components/UpcomingChecksWidget';
import ClientComplianceDashboard from '../components/ClientComplianceDashboard';
import BusinessKPIDashboard from '../components/BusinessKPIDashboard';
import AutomatedCheckInsWidget from '../components/AutomatedCheckInsWidget';
import AdminOverviewMetrics from './AdminOverviewMetrics';
import AdminSystemHealthPanel from './AdminSystemHealthPanel';
import AdminQuickActions from './AdminQuickActions';
import VisitorGeoWidget from '../components/VisitorGeoWidget';
import PendingPaymentsWidget from '../components/PendingPaymentsWidget';
import AITerminalPanel from '../../../../Shared/AITerminalPanel';
import { AdminDashboardMetric, AdminQuickAction, SystemHealthMetric } from './AdminOverview.types';

const VisitorWorldMap = lazy(() => import('../components/VisitorWorldMap'));

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
        action: () => navigate('/dashboard/admin/revenue'),
      },
      {
        id: 'view-users',
        title: 'User Management',
        description: 'Manage platform users',
        icon: <Users size={20} />,
        action: () => navigate('/dashboard/admin/client-management'),
      },
      {
        id: 'view-security',
        title: 'Security Dashboard',
        description: 'Security monitoring',
        icon: <ShieldCheck size={20} />,
        action: () => navigate('/dashboard/admin/style-guide'),
      },
      {
        id: 'view-system',
        title: 'System Health',
        description: 'Infrastructure monitoring',
        icon: <Monitor size={20} />,
        action: () => navigate('/dashboard/admin/style-guide'),
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
    <BentoWrapper>
      {/* ── Row 0: AI Terminal (full width) ── */}
      <BentoFull>
        <AITerminalPanel
          context="data_management"
          label="Admin Assistant"
          emptyHint="I'm your Admin Assistant. Ask about client analytics, revenue insights, system health, or any business operations."
          defaultOpen={false}
        />
      </BentoFull>

      {/* ── Row 1: Critical Alerts (2-col bento) ── */}
      <BentoHalf><VisitorGeoWidget /></BentoHalf>
      <BentoHalf><PendingPaymentsWidget /></BentoHalf>

      {/* ── Row 1b: World Map (full width) ── */}
      <BentoFull>
        <Suspense fallback={<div style={{ minHeight: 400 }} />}>
          <VisitorWorldMap />
        </Suspense>
      </BentoFull>

      {/* ── Row 2: Signups + Orientations + Contacts ── */}
      <BentoFull>
        <RealTimeSignupMonitoring authAxios={authAxios} autoRefresh={true} refreshInterval={30000} />
      </BentoFull>
      <BentoHalf><OrientationIntakeWidget /></BentoHalf>
      <BentoHalf><ContactNotifications autoRefresh={true} showActions={true} /></BentoHalf>

      {/* ── Row 3: Social triptych (3-col on desktop) ── */}
      <BentoThird><SocialOverviewWidget /></BentoThird>
      <BentoThird><ModerationWidget /></BentoThird>
      <BentoThird><PostReportsWidget /></BentoThird>

      {/* ── Row 4: Metrics controls + KPI cards (full width) ── */}
      <BentoFull>
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
      </BentoFull>

      <BentoFull><AdminOverviewMetrics metrics={metrics} /></BentoFull>
      <BentoFull><BusinessKPIDashboard /></BentoFull>

      {/* ── Row 5: Client Intelligence (2-col bento) ── */}
      <BentoHalf><ClientComplianceDashboard /></BentoHalf>
      <BentoHalf><AutomatedCheckInsWidget /></BentoHalf>

      {/* ── Row 6: Operations (2-col bento) ── */}
      <BentoHalf><UpcomingChecksWidget /></BentoHalf>
      <BentoHalf><CancelledSessionsWidget maxItems={10} showChargeButtons={true} /></BentoHalf>

      {/* ── Row 7: System + Actions (2-col bento) ── */}
      <BentoHalf><AdminSystemHealthPanel systemHealth={systemHealth} onRefresh={fetchAdminOverview} /></BentoHalf>
      <BentoHalf><AdminQuickActions actions={quickActions} /></BentoHalf>
    </BentoWrapper>
  );
};

// === Styled Components — Bento Grid Layout ===

const BentoWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;

  @media (min-width: 1280px) {
    grid-template-columns: repeat(6, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

// Full width (spans all columns)
const BentoFull = styled.div`
  grid-column: 1 / -1;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
`;

// Half width (1 of 2 columns, or 3 of 6 on wide screens)
const BentoHalf = styled.div`
  grid-column: span 1;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;

  @media (min-width: 1280px) {
    grid-column: span 3;
  }

  @media (max-width: 768px) {
    grid-column: 1 / -1;
  }
`;

// Third width (1 of 3 on wide screens, stacks on mobile)
const BentoThird = styled.div`
  grid-column: span 1;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;

  @media (min-width: 1280px) {
    grid-column: span 2;
  }

  @media (max-width: 768px) {
    grid-column: 1 / -1;
  }
`;

const ControlsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: color-mix(in srgb, var(--bg-elevated, #141419) 90%, var(--accent-secondary, #8B5CF6) 10%);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
  box-shadow: var(--shadow-elevation, 0 4px 24px rgba(0, 0, 0, 0.2));

  @media (max-width: 430px) {
    padding: 12px 16px;
  }
`;

const ControlsInner = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const CosmicSelect = styled.select`
  appearance: none;
  background: var(--bg-surface, #1A1A24) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2360C0F0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 12px center;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
  border-radius: 10px;
  color: var(--text-primary, #E0ECF4);
  padding: 10px 40px 10px 16px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  min-height: 44px;
  transition: all 0.2s ease;

  &:hover, &:focus {
    background-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 5%, transparent);
    border-color: var(--accent-secondary, #8B5CF6);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent);
  }

  option {
    background: var(--bg-elevated, #141419);
    color: var(--text-primary, #E0ECF4);
    padding: 12px;
  }
`;

const StatusText = styled.span`
  color: var(--text-secondary, rgba(224,236,244,0.6));
  font-size: 0.875rem;
`;

const ErrorText = styled.span`
  color: #C92A54;
  font-size: 0.875rem;
`;

export default AdminOverviewPanel;
