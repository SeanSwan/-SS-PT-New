import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { DollarSign, Users, Dumbbell, Monitor } from 'lucide-react';
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
import AdminSignalBar from './AdminSignalBar';
import AdminOverviewSection from './AdminOverviewSection';
import VisitorGeoWidget from '../components/VisitorGeoWidget';
import PendingPaymentsWidget from '../components/PendingPaymentsWidget';
import OracleInsightsWidget from '../components/OracleInsightsWidget';
import WaiverSummaryWidget from '../components/WaiverSummaryWidget';
import WidgetErrorBoundary from '../shell/WidgetErrorBoundary';
import AITerminalPanel from '../../../../Shared/AITerminalPanel';
import { AdminDashboardMetric, AdminQuickAction, SystemHealthMetric } from './AdminOverview.types';
import { mapChangeType, metricUnavailable, readSettledData, safeTrend } from './AdminOverviewData';
import { ADMIN_OVERVIEW_ASSISTANT_PROMPTS } from './AdminOverviewAssistantPrompts.config';
import { buildAdminOverviewQuickActions } from './AdminOverviewQuickActions.config';
import {
  BentoFull,
  BentoHalf,
  BentoThird,
  BentoWrapper,
  ControlsHeader,
  ControlsInner,
  CosmicSelect,
  ErrorText,
  StatusText,
} from './AdminOverviewPanel.styles';
import { StyledBox } from '@/components/ui/StyledBox';
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
    () => buildAdminOverviewQuickActions(navigate),
    [navigate]
  );
  const fetchAdminOverview = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [revenueRes, usersRes, workoutsRes, healthRes] = await Promise.allSettled([
        authAxios.get('/api/admin/analytics/statistics/revenue', { params: { timeRange } }),
        authAxios.get('/api/admin/analytics/statistics/users'),
        authAxios.get('/api/admin/analytics/statistics/workouts'),
        authAxios.get('/api/admin/analytics/statistics/system-health'),
      ]);
      const revenueData = readSettledData(revenueRes);
      const usersData = readSettledData(usersRes);
      const workoutsData = readSettledData(workoutsRes);
      const healthData = readSettledData(healthRes);
      if ([revenueRes, usersRes, workoutsRes, healthRes].some(result => result.status === 'rejected')) {
        setError('Some admin overview metrics could not be loaded.');
      }
      const nextMetrics: AdminDashboardMetric[] = [
        revenueData ? {
            id: 'total-revenue',
            title: 'Total Revenue',
            value: revenueData.totalRevenue ?? 0,
            change: Number(revenueData.changePercent ?? 0),
            changeType: mapChangeType(Number(revenueData.changePercent ?? 0)),
            icon: <DollarSign size={24} />,
            color: 'var(--accent-gold, #C6A84B)',
            description: 'Monthly recurring revenue',
            trend: safeTrend(revenueData.trend),
            target: revenueData.target ?? undefined,
            format: 'currency',
          } : metricUnavailable({
            id: 'total-revenue',
            title: 'Total Revenue',
            icon: <DollarSign size={24} />,
            color: 'var(--accent-gold, #C6A84B)',
            description: 'Revenue endpoint unavailable',
          }),
        usersData ? {
            id: 'active-users',
            title: 'Active Users',
            value: (usersData.activeUsers ?? usersData.totalUsers) ?? 0,
            change: Number(usersData.changePercent ?? 0),
            changeType: mapChangeType(Number(usersData.changePercent ?? 0)),
            icon: <Users size={24} />,
            color: 'var(--accent-primary, #60C0F0)',
            description: 'Daily active users',
            trend: safeTrend(usersData.trend),
            target: usersData.target ?? undefined,
            format: 'number',
          } : metricUnavailable({
            id: 'active-users',
            title: 'Active Users',
            icon: <Users size={24} />,
            color: 'var(--accent-primary, #60C0F0)',
            description: 'User statistics endpoint unavailable',
          }),
        workoutsData ? {
            id: 'completion-rate',
            title: 'Workout Completion',
            value: Number(workoutsData.completionRate ?? 0).toFixed(1),
            change: Number(workoutsData.changePercent ?? 0),
            changeType: mapChangeType(Number(workoutsData.changePercent ?? 0)),
            icon: <Dumbbell size={24} />,
            color: 'var(--accent-secondary, #8B5CF6)',
            description: 'Average workout completion rate',
            trend: safeTrend(workoutsData.trend),
            target: workoutsData.target ?? undefined,
            format: 'percentage',
          } : metricUnavailable({
            id: 'completion-rate',
            title: 'Workout Completion',
            icon: <Dumbbell size={24} />,
            color: 'var(--accent-secondary, #8B5CF6)',
            description: 'Workout statistics endpoint unavailable',
          }),
        healthData ? {
            id: 'system-health',
            title: 'System Health',
            value: Number(healthData.uptime ?? 0).toFixed(2),
            change: Number(healthData.changePercent ?? 0),
            changeType: mapChangeType(Number(healthData.changePercent ?? 0)),
            icon: <Monitor size={24} />,
            color: 'var(--swan-lavender, #4070C0)',
            description: 'Overall system uptime',
            trend: safeTrend(healthData.trend),
            target: 99.9,
            format: 'percentage',
          } : metricUnavailable({
            id: 'system-health',
            title: 'System Health',
            icon: <Monitor size={24} />,
            color: 'var(--swan-lavender, #4070C0)',
            description: 'System health endpoint unavailable',
          }),
      ];
      const nextSystemHealth: SystemHealthMetric[] = healthData
        ? (healthData.services ?? []).map((service: any) => ({
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
          }))
        : [{
            service: 'System health API',
            status: 'error',
            uptime: 0,
            responseTime: 0,
            errorRate: 0,
            throughput: 0,
            details: 'System health endpoint unavailable',
          }];
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
      <BentoFull><WidgetErrorBoundary name="Signal bar"><AdminSignalBar /></WidgetErrorBoundary></BentoFull>
      <BentoFull><WidgetErrorBoundary name="Quick actions"><AdminQuickActions actions={quickActions} /></WidgetErrorBoundary></BentoFull>
      <BentoFull>
        <WidgetErrorBoundary name="Admin Assistant">
          <AITerminalPanel
            context="data_management"
            label="Admin Assistant"
            emptyHint="I'm your Admin Assistant. Ask about client analytics, revenue insights, system health, or any business operations."
            quickPrompts={ADMIN_OVERVIEW_ASSISTANT_PROMPTS}
            defaultOpen={false}
          />
        </WidgetErrorBoundary>
      </BentoFull>
      <AdminOverviewSection
        id="admin-mission-critical"
        eyebrow="Mission Critical Queues"
        title="Action required before analytics"
        lead="Intakes, waivers, payments, leads, cancellations, and measurement checks stay above passive charts so urgent work is not buried."
      >
        <BentoThird><WidgetErrorBoundary name="Orientation intake"><OrientationIntakeWidget /></WidgetErrorBoundary></BentoThird>
        <BentoThird><WidgetErrorBoundary name="Waiver summary"><WaiverSummaryWidget /></WidgetErrorBoundary></BentoThird>
        <BentoThird><WidgetErrorBoundary name="Business Intelligence alerts"><ContactNotifications autoRefresh={true} showActions={true} /></WidgetErrorBoundary></BentoThird>
        <BentoHalf><WidgetErrorBoundary name="Pending payments"><PendingPaymentsWidget /></WidgetErrorBoundary></BentoHalf>
        <BentoHalf><WidgetErrorBoundary name="Cancelled sessions"><CancelledSessionsWidget maxItems={10} showChargeButtons={true} /></WidgetErrorBoundary></BentoHalf>
        <BentoHalf><WidgetErrorBoundary name="Upcoming check-ins"><UpcomingChecksWidget /></WidgetErrorBoundary></BentoHalf>
      </AdminOverviewSection>
      <AdminOverviewSection
        id="admin-platform-pulse"
        eyebrow="Platform Pulse"
        title="Live system trust and overview metrics"
        lead="Signup flow, health services, and top-line metrics are visible early without pushing the action queues below finance."
      >
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
        <BentoFull><WidgetErrorBoundary name="Overview metrics"><AdminOverviewMetrics metrics={metrics} /></WidgetErrorBoundary></BentoFull>
        <BentoFull><WidgetErrorBoundary name="Signup monitoring"><RealTimeSignupMonitoring authAxios={authAxios} autoRefresh={true} refreshInterval={30000} /></WidgetErrorBoundary></BentoFull>
        <BentoHalf><WidgetErrorBoundary name="System health"><AdminSystemHealthPanel systemHealth={systemHealth} onRefresh={fetchAdminOverview} /></WidgetErrorBoundary></BentoHalf>
        <BentoThird><WidgetErrorBoundary name="Recent activity"><RecentActivityFeed /></WidgetErrorBoundary></BentoThird>
      </AdminOverviewSection>
      <AdminOverviewSection
        id="admin-operations"
        eyebrow="Client and Trainer Operations"
        title="Coaching workflow health"
        lead="Compliance, automated check-ins, and session tracking sit together so admin can detect stale client or trainer workflows quickly."
      >
        <BentoHalf><WidgetErrorBoundary name="Client compliance"><ClientComplianceDashboard /></WidgetErrorBoundary></BentoHalf>
        <BentoHalf><WidgetErrorBoundary name="Automated check-ins"><AutomatedCheckInsWidget /></WidgetErrorBoundary></BentoHalf>
        <BentoHalf><WidgetErrorBoundary name="Session tracking"><SessionTrackingWidget /></WidgetErrorBoundary></BentoHalf>
        <BentoHalf><WidgetErrorBoundary name="Visitor geography"><VisitorGeoWidget /></WidgetErrorBoundary></BentoHalf>
      </AdminOverviewSection>
      <AdminOverviewSection
        id="admin-community-safety"
        eyebrow="Community and Content Safety"
        title="Social, moderation, and challenge signals"
        lead="Community status is no longer hidden in a bottom accordion; moderation reports and gamification sit in the active scan path."
      >
        <BentoThird><WidgetErrorBoundary name="Social overview"><SocialOverviewWidget /></WidgetErrorBoundary></BentoThird>
        <BentoThird><WidgetErrorBoundary name="Moderation"><ModerationWidget /></WidgetErrorBoundary></BentoThird>
        <BentoThird><WidgetErrorBoundary name="Post reports"><PostReportsWidget /></WidgetErrorBoundary></BentoThird>
        <BentoThird><WidgetErrorBoundary name="Gamification summary"><GamificationSummaryWidget /></WidgetErrorBoundary></BentoThird>
      </AdminOverviewSection>
      <AdminOverviewSection
        id="admin-business-lens"
        eyebrow="Business Lens"
        title="Growth and revenue after the action queues"
        lead="Finance remains visible, but it no longer outranks people waiting on admin decisions."
      >
        <BentoHalf><WidgetErrorBoundary name="Revenue chart"><RevenueChart /></WidgetErrorBoundary></BentoHalf>
        <BentoHalf><WidgetErrorBoundary name="User growth chart"><UserGrowthChart /></WidgetErrorBoundary></BentoHalf>
        <BentoHalf><WidgetErrorBoundary name="Business KPIs"><BusinessKPIDashboard /></WidgetErrorBoundary></BentoHalf>
      </AdminOverviewSection>
      <AdminOverviewSection
        id="admin-deep-telemetry"
        eyebrow="Research and Deep Telemetry"
        title="Oracle and geographic intelligence"
        lead="Long-form telemetry is promoted to a visible section instead of a mystery details button at the bottom of the page."
      >
        <BentoHalf>
          <WidgetErrorBoundary name="Visitor world map">
            <Suspense fallback={<StyledBox as="div" $style={{ minHeight: 400 }} />}>
              <VisitorWorldMap />
            </Suspense>
          </WidgetErrorBoundary>
        </BentoHalf>
        <BentoFull><WidgetErrorBoundary name="Oracle insights"><OracleInsightsWidget defaultTab="news" defaultQuery="personal training fitness industry trends" /></WidgetErrorBoundary></BentoFull>
      </AdminOverviewSection>
    </BentoWrapper>
  );
};
export default AdminOverviewPanel;
