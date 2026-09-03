import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { ADMIN_MOTION_POLICY } from './adminOverviewMotion';
import AdminOverviewControls from './AdminOverviewControls';
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
import AdminQuickActions from './AdminQuickActions';
import AdminSignalBar from './AdminSignalBar';
import AdminOverviewSection from './AdminOverviewSection';
import AdminTelemetrySection from './AdminTelemetrySection';
import PendingPaymentsWidget from '../components/PendingPaymentsWidget';
import RenewalRiskWidget from '../components/RenewalRiskWidget';
import LeadSpeedWidget from '../components/LeadSpeedWidget';
import SessionReconciliationWidget from '../components/SessionReconciliationWidget';
import SessionLiabilityWidget from '../components/SessionLiabilityWidget';
import AiSpendWidget from '../components/AiSpendWidget';
import {
  ActivationFunnelWidget, CancellationImpactWidget, TrainerUtilizationWidget,
} from '../components/OpsAggregateWidgets';
import { BootcampOpsWidget, PlaudHealthWidget } from '../components/OpsPipelineWidgets';
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
} from './AdminOverviewPanel.styles';
import { StyledBox } from '@/components/ui/StyledBox';
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
            description: 'Gross revenue for the selected window (refunds not deducted)',
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
    <MotionConfig reducedMotion={ADMIN_MOTION_POLICY}>
    <BentoWrapper>
      <BentoFull><WidgetErrorBoundary name="Signal bar"><AdminSignalBar /></WidgetErrorBoundary></BentoFull>
      <BentoFull><WidgetErrorBoundary name="Quick actions"><AdminQuickActions actions={quickActions} /></WidgetErrorBoundary></BentoFull>
      <AdminOverviewSection
        id="admin-queues"
        eyebrow="Work Queues"
        title="Action required — every card is a task"
        lead="Intakes, waivers, payments, cancellations, and measurement checks. These are not dismissible: they clear by being DONE."
      >
        <BentoThird><WidgetErrorBoundary name="Orientation intake"><OrientationIntakeWidget /></WidgetErrorBoundary></BentoThird>
        <BentoThird><WidgetErrorBoundary name="Waiver summary"><WaiverSummaryWidget /></WidgetErrorBoundary></BentoThird>
        <BentoThird><WidgetErrorBoundary name="Pending payments"><PendingPaymentsWidget /></WidgetErrorBoundary></BentoThird>
        <BentoHalf><WidgetErrorBoundary name="Cancelled sessions"><CancelledSessionsWidget maxItems={10} showChargeButtons={true} /></WidgetErrorBoundary></BentoHalf>
        <BentoHalf><WidgetErrorBoundary name="Upcoming check-ins"><UpcomingChecksWidget /></WidgetErrorBoundary></BentoHalf>
        <BentoHalf><WidgetErrorBoundary name="Renewal risk"><RenewalRiskWidget /></WidgetErrorBoundary></BentoHalf>
      </AdminOverviewSection>
      <AdminOverviewSection
        id="admin-operations"
        eyebrow="Client and Trainer Operations"
        title="Coaching workflow health"
        lead="Compliance, automated check-ins, session tracking, live signups, and the activity pulse — who needs intervention now."
      >
        <BentoHalf><WidgetErrorBoundary name="Client compliance"><ClientComplianceDashboard /></WidgetErrorBoundary></BentoHalf>
        <BentoHalf><WidgetErrorBoundary name="Automated check-ins"><AutomatedCheckInsWidget /></WidgetErrorBoundary></BentoHalf>
        <BentoHalf><WidgetErrorBoundary name="Session tracking"><SessionTrackingWidget /></WidgetErrorBoundary></BentoHalf>
        <BentoHalf><WidgetErrorBoundary name="Signup monitoring"><RealTimeSignupMonitoring authAxios={authAxios} autoRefresh={true} refreshInterval={30000} /></WidgetErrorBoundary></BentoHalf>
        <BentoThird><WidgetErrorBoundary name="Recent activity"><RecentActivityFeed /></WidgetErrorBoundary></BentoThird>
      </AdminOverviewSection>
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
        id="admin-alerts"
        eyebrow="Alerts"
        title="Dismissible intelligence, severity first"
        lead="Business Intelligence Alerts carry persisted read-state: ack, clear, and archive stick per admin. Work queues live below — alerts inform, queues demand."
      >
        <BentoFull><WidgetErrorBoundary name="Business Intelligence alerts"><ContactNotifications autoRefresh={true} showActions={true} /></WidgetErrorBoundary></BentoFull>
      </AdminOverviewSection>
      <AdminOverviewSection
        id="admin-business-lens"
        eyebrow="Business Lens"
        title="Money truth"
        lead="Server-aggregated revenue and growth. Labels disclose gross vs net; no synthetic targets."
      >
        <BentoFull>
          <AdminOverviewControls timeRange={timeRange} onTimeRangeChange={setTimeRange} isLoading={isLoading} error={error} />
        </BentoFull>
        <BentoFull><WidgetErrorBoundary name="Overview metrics"><AdminOverviewMetrics metrics={metrics} /></WidgetErrorBoundary></BentoFull>
        <BentoHalf><WidgetErrorBoundary name="Revenue chart"><RevenueChart /></WidgetErrorBoundary></BentoHalf>
        <BentoHalf><WidgetErrorBoundary name="User growth chart"><UserGrowthChart /></WidgetErrorBoundary></BentoHalf>
        <BentoHalf><WidgetErrorBoundary name="Business KPIs"><BusinessKPIDashboard /></WidgetErrorBoundary></BentoHalf>
      </AdminOverviewSection>
      <AdminOverviewSection
        id="admin-revenue-integrity"
        eyebrow="Revenue Integrity"
        title="Money in motion — speed in, obligations out"
        lead="Business Lens reports what revenue WAS. This band watches what it is DOING: how fast new leads get answered, whether every paid purchase delivered its sessions, what training is still owed, and what the AI is costing."
      >
        <BentoHalf><WidgetErrorBoundary name="Speed to lead"><LeadSpeedWidget /></WidgetErrorBoundary></BentoHalf>
        <BentoHalf><WidgetErrorBoundary name="Session reconciliation"><SessionReconciliationWidget /></WidgetErrorBoundary></BentoHalf>
        <BentoHalf><WidgetErrorBoundary name="Session liability"><SessionLiabilityWidget /></WidgetErrorBoundary></BentoHalf>
        <BentoHalf><WidgetErrorBoundary name="AI spend"><AiSpendWidget /></WidgetErrorBoundary></BentoHalf>
      </AdminOverviewSection>
      <AdminOverviewSection
        id="admin-ops-intelligence"
        eyebrow="Ops Intelligence"
        title="Rollups behind the live queues"
        lead="Operations shows what is happening now; this band shows what it adds up to — trainer capacity, what cancellation policy costs, whether new clients actually start training, and whether the coaching record is being captured at all."
      >
        <BentoThird><WidgetErrorBoundary name="Trainer utilization"><TrainerUtilizationWidget /></WidgetErrorBoundary></BentoThird>
        <BentoThird><WidgetErrorBoundary name="Cancellation impact"><CancellationImpactWidget /></WidgetErrorBoundary></BentoThird>
        <BentoThird><WidgetErrorBoundary name="Activation funnel"><ActivationFunnelWidget /></WidgetErrorBoundary></BentoThird>
        <BentoHalf><WidgetErrorBoundary name="Voice ingestion"><PlaudHealthWidget /></WidgetErrorBoundary></BentoHalf>
        <BentoHalf><WidgetErrorBoundary name="Bootcamp ops"><BootcampOpsWidget /></WidgetErrorBoundary></BentoHalf>
      </AdminOverviewSection>
      <AdminOverviewSection
        id="admin-community-safety"
        eyebrow="Community and Content Safety"
        title="Social, moderation, and challenge signals"
        lead="Moderation queues act (approve, reject, resolve, dismiss); community summaries inform."
      >
        <BentoThird><WidgetErrorBoundary name="Social overview"><SocialOverviewWidget /></WidgetErrorBoundary></BentoThird>
        <BentoThird><WidgetErrorBoundary name="Moderation"><ModerationWidget /></WidgetErrorBoundary></BentoThird>
        <BentoThird><WidgetErrorBoundary name="Post reports"><PostReportsWidget /></WidgetErrorBoundary></BentoThird>
        <BentoThird><WidgetErrorBoundary name="Gamification summary"><GamificationSummaryWidget /></WidgetErrorBoundary></BentoThird>
      </AdminOverviewSection>
      <AdminTelemetrySection systemHealth={systemHealth} onRefresh={fetchAdminOverview} />
    </BentoWrapper>
    </MotionConfig>
  );
};
export default AdminOverviewPanel;
