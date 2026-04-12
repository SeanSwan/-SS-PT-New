import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { DollarSign, Users, Dumbbell, Monitor, UserPlus, ClipboardList, Mail, BarChart3 } from 'lucide-react';
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
import RevenueChart from '../components/RevenueChart';
import UserGrowthChart from '../components/UserGrowthChart';
import SessionTrackingWidget from '../components/SessionTrackingWidget';
import RecentActivityFeed from '../components/RecentActivityFeed';
import GamificationSummaryWidget from '../components/GamificationSummaryWidget';
import AdminOverviewMetrics from './AdminOverviewMetrics';
import AdminSystemHealthPanel from './AdminSystemHealthPanel';
import AdminQuickActions from './AdminQuickActions';
import VisitorGeoWidget from '../components/VisitorGeoWidget';
import PendingPaymentsWidget from '../components/PendingPaymentsWidget';
import OracleInsightsWidget from '../components/OracleInsightsWidget';
import WaiverSummaryWidget from '../components/WaiverSummaryWidget';
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
        id: 'add-client',
        title: 'Add Client',
        description: 'Onboard a new client',
        icon: <UserPlus size={20} />,
        action: () => navigate('/dashboard/admin/client-onboarding'),
      },
      {
        id: 'log-workout',
        title: 'Log Workout',
        description: 'Quick session logging',
        icon: <Dumbbell size={20} />,
        action: () => navigate('/dashboard/admin/admin-sessions'),
      },
      {
        id: 'view-reports',
        title: 'Analytics',
        description: 'Analytics & insights',
        icon: <BarChart3 size={20} />,
        action: () => navigate('/dashboard/admin/revenue'),
      },
      {
        id: 'manage-users',
        title: 'User Management',
        description: 'Manage platform users',
        icon: <Users size={20} />,
        action: () => navigate('/dashboard/admin/user-management'),
      },
      {
        id: 'session-packages',
        title: 'Packages',
        description: 'Manage session packages',
        icon: <ClipboardList size={20} />,
        action: () => navigate('/dashboard/admin/admin-packages'),
      },
      {
        id: 'notifications',
        title: 'Messages',
        description: 'Client & trainer messages',
        icon: <Mail size={20} />,
        action: () => navigate('/dashboard/admin/messages'),
      },
    ],
    [navigate]
  );

  const mapChangeType = (value: number): AdminDashboardMetric['changeType'] => {
    if (value > 0) return 'increase';
    if (value < 0) return 'decrease';
    return 'neutral';
  };

  const safeTrend = (raw: unknown): number[] => {
    if (!Array.isArray(raw)) return [];
    return raw.map(v => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    });
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
          color: '#C6A84B',
          description: 'Monthly recurring revenue',
          trend: safeTrend(revenueData.trend),
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
          color: '#60C0F0',
          description: 'Daily active users',
          trend: safeTrend(usersData.trend),
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
          color: '#8B5CF6',
          description: 'Average workout completion rate',
          trend: safeTrend(workoutsData.trend),
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
          color: '#4A90D9',
          description: 'Overall system uptime',
          trend: safeTrend(healthData.trend),
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

      {/* ── Row 1: KPI Metrics + Time Range Control ── */}
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
            {error && <ErrorText role="alert" aria-live="polite">{error}</ErrorText>}
          </ControlsInner>
        </ControlsHeader>
      </BentoFull>
      <BentoFull><AdminOverviewMetrics metrics={metrics} /></BentoFull>

      {/* ── Row 2: Intake Triptych — Orientation + Waivers + Visitor Map (PROMOTED from Row 7) ── */}
      <BentoThird><OrientationIntakeWidget /></BentoThird>
      <BentoThird><WaiverSummaryWidget /></BentoThird>
      <BentoThird>
        <Suspense fallback={<div style={{ minHeight: 400 }} />}>
          <VisitorWorldMap />
        </Suspense>
      </BentoThird>

      {/* ── Row 3: Real-time Signups (full width) ── */}
      <BentoFull>
        <RealTimeSignupMonitoring authAxios={authAxios} autoRefresh={true} refreshInterval={30000} />
      </BentoFull>

      {/* ── Row 4: Revenue + User Growth Charts (2-col) ── */}
      <BentoHalf><RevenueChart /></BentoHalf>
      <BentoHalf><UserGrowthChart /></BentoHalf>

      {/* ── Row 5: Business KPI + Session Tracking (2-col) ── */}
      <BentoHalf><BusinessKPIDashboard /></BentoHalf>
      <BentoHalf><SessionTrackingWidget /></BentoHalf>

      {/* ── Row 6: Quick Actions + Activity Feed + Gamification (3-col) ── */}
      <BentoThird><AdminQuickActions actions={quickActions} /></BentoThird>
      <BentoThird><RecentActivityFeed /></BentoThird>
      <BentoThird><GamificationSummaryWidget /></BentoThird>

      {/* ── Row 7: System Health + Pending Payments (2-col) ── */}
      <BentoHalf><AdminSystemHealthPanel systemHealth={systemHealth} onRefresh={fetchAdminOverview} /></BentoHalf>
      <BentoHalf><PendingPaymentsWidget /></BentoHalf>

      {/* ── Row 8: Critical Alerts (2-col) ── */}
      <BentoHalf><VisitorGeoWidget /></BentoHalf>
      <BentoHalf><ContactNotifications autoRefresh={true} showActions={true} /></BentoHalf>

      {/* ── Rows 8-11: Deep Telemetry Accordion (collapsed by default for scannability) ── */}
      <TelemetryDetails>
        <summary>Access Deep Telemetry — Social · Compliance · Operations · Oracle</summary>
        <TelemetryGrid>
          {/* Row 8: Social triptych */}
          <BentoThird><SocialOverviewWidget /></BentoThird>
          <BentoThird><ModerationWidget /></BentoThird>
          <BentoThird><PostReportsWidget /></BentoThird>

          {/* Row 9: Client Intelligence */}
          <BentoHalf><ClientComplianceDashboard /></BentoHalf>
          <BentoHalf><AutomatedCheckInsWidget /></BentoHalf>

          {/* Row 10: Operations */}
          <BentoHalf><UpcomingChecksWidget /></BentoHalf>
          <BentoHalf><CancelledSessionsWidget maxItems={10} showChargeButtons={true} /></BentoHalf>

          {/* Row 11: Swan Oracle */}
          <BentoFull><OracleInsightsWidget defaultTab="news" defaultQuery="personal training fitness industry trends" /></BentoFull>
        </TelemetryGrid>
      </TelemetryDetails>
    </BentoWrapper>
  );
};

// === Styled Components — Bento Grid Layout ===

const atmosphericPulse = keyframes`
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.8; }
`;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const bentoItemAnimation = css`
  animation: ${fadeInUp} 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;

  &:nth-child(1)  { animation-delay: 0ms; }
  &:nth-child(2)  { animation-delay: 50ms; }
  &:nth-child(3)  { animation-delay: 100ms; }
  &:nth-child(4)  { animation-delay: 150ms; }
  &:nth-child(5)  { animation-delay: 200ms; }
  &:nth-child(6)  { animation-delay: 250ms; }
  &:nth-child(7)  { animation-delay: 300ms; }
  &:nth-child(8)  { animation-delay: 350ms; }
  &:nth-child(9)  { animation-delay: 400ms; }
  &:nth-child(10) { animation-delay: 450ms; }
  &:nth-child(11) { animation-delay: 500ms; }
  &:nth-child(n+12) { animation-delay: 550ms; }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
  }
`;

const BentoWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  position: relative;
  isolation: isolate;

  /* Kirin Atmospheric Engine Glow — Wing Purple radial from top center */
  &::before {
    content: '';
    position: absolute;
    top: -20vh;
    left: 50%;
    transform: translateX(-50%);
    width: 80vw;
    height: 60vh;
    background: radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.08) 0%, transparent 70%);
    pointer-events: none;
    z-index: -1;
    animation: ${atmosphericPulse} 10s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    &::before { animation: none; }
  }

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
  ${bentoItemAnimation}
`;

// Half width (1 of 2 columns, or 3 of 6 on wide screens)
const BentoHalf = styled.div`
  grid-column: span 1;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  ${bentoItemAnimation}

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
  ${bentoItemAnimation}

  @media (min-width: 1280px) {
    grid-column: span 2;
  }

  @media (max-width: 768px) {
    grid-column: 1 / -1;
  }
`;

// Deep Telemetry Accordion (Rows 8-11: Social, Compliance, Operations, Oracle)
const TelemetryDetails = styled.details`
  grid-column: 1 / -1;
  margin-top: 8px;
  ${bentoItemAnimation}

  &[open] > summary {
    margin-bottom: 20px;
  }

  & > summary {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-family: 'Sora', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    color: #8B5CF6;
    cursor: pointer;
    padding: 12px 24px;
    min-height: 44px;
    background: rgba(139, 92, 246, 0.05);
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 44px;
    transition: all 300ms cubic-bezier(0.16, 1, 0.3, 1);
    list-style: none;
    user-select: none;

    &::-webkit-details-marker { display: none; }
    &::marker { display: none; }

    &:hover {
      background: rgba(139, 92, 246, 0.1);
      border-color: rgba(139, 92, 246, 0.4);
    }

    &:focus-visible {
      outline: 2px solid #8B5CF6;
      outline-offset: 4px;
    }
  }
`;

const TelemetryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (min-width: 1280px) {
    grid-template-columns: repeat(6, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 12px;
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

const ErrorText = styled.div`
  display: inline-flex;
  align-items: center;
  color: #E5C76B;
  font-family: 'Fira Code', monospace;
  font-size: 0.825rem;
  background: rgba(198, 168, 75, 0.08);
  padding: 6px 12px;
  border-radius: 0 6px 6px 0;
  border-left: 3px solid #C6A84B;
  box-shadow: inset 0 0 12px rgba(198, 168, 75, 0.02);
`;

export default AdminOverviewPanel;
