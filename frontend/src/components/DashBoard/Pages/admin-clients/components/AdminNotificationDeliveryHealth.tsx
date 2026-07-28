/**
 * FILE: AdminNotificationDeliveryHealth.tsx
 * PURPOSE: Admin-facing broadcast delivery health panel for CommunicationCenter analytics.
 * MOUNT: CommunicationCenter Analytics tab, itself mounted by EnhancedAdminClientManagementView.
 * DATA: Reads /api/admin/notifications/delivery-health through authenticated authAxios.
 * UX: Shows delivery rate, delivered/failed counts, recent broadcast rows, and a 44px refresh control.
 * SAFETY: Displays aggregate delivery metadata only; no recipient PII or message body expansion.
 */
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { AlertTriangle, CheckCircle2, RefreshCw, Send } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';

type DeliveryStatus = 'empty' | 'healthy' | 'degraded' | 'failed';

interface DeliverySummary {
  broadcasts: number;
  attempted: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
  failureRate: number;
  status: DeliveryStatus;
}

interface BroadcastDeliveryRow {
  id: string;
  title: string;
  createdAt?: string;
  status: DeliveryStatus;
  audience?: { type?: string; count?: number };
  channels?: string[];
  delivery: {
    attempted: number;
    created: number;
    failed: number;
  };
}

const EMPTY_SUMMARY: DeliverySummary = {
  broadcasts: 0,
  attempted: 0,
  delivered: 0,
  failed: 0,
  deliveryRate: 0,
  failureRate: 0,
  status: 'empty',
};

const statusLabel = (status: DeliveryStatus): string => {
  if (status === 'healthy') return 'Healthy';
  if (status === 'failed') return 'Failed';
  if (status === 'degraded') return 'Degraded';
  return 'No broadcasts';
};

const formatAudience = (row: BroadcastDeliveryRow): string => {
  const type = row.audience?.type || 'all';
  const count = row.audience?.count ?? row.delivery.attempted;
  return `${type} audience, ${count} recipients`;
};

const formatCreatedAt = (value?: string): string => {
  if (!value) return 'No send time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No send time';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const Panel = styled.section`
  border: 1px solid var(--border-glow, rgba(96, 192, 240, 0.24));
  border-radius: 8px;
  background:
    linear-gradient(135deg, var(--swan-panel, rgba(8, 20, 42, 0.94)), var(--swan-panel-deep, rgba(3, 8, 23, 0.96)));
  box-shadow: 0 18px 44px var(--shadow-deep, rgba(0, 0, 0, 0.28));
  padding: 1rem;
  margin-bottom: 1rem;
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
`;

const TitleGroup = styled.div`
  display: grid;
  gap: 0.35rem;
`;

const Title = styled.h3`
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0;
  color: var(--text-primary, #e0ecf4);
  font-size: 1rem;
  line-height: 1.25;
`;

const Subtitle = styled.p`
  margin: 0;
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-size: 0.875rem;
`;

const RefreshButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.24));
  border-radius: 8px;
  background: var(--button-surface, rgba(12, 28, 56, 0.82));
  color: var(--text-primary, #e0ecf4);
  padding: 0.65rem 0.9rem;
  font-weight: 700;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8b5cf6);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.7;
  }
`;

const Metrics = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Metric = styled.div`
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
  border-radius: 8px;
  background: var(--surface-raised, rgba(9, 18, 38, 0.72));
  padding: 0.85rem;
`;

const MetricValue = styled.div`
  color: var(--accent-primary, #60c0f0);
  font-size: 1.45rem;
  font-weight: 800;
  line-height: 1;
`;

const MetricLabel = styled.div`
  margin-top: 0.35rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-size: 0.78rem;
`;

const RecentList = styled.div`
  display: grid;
  gap: 0.65rem;
  margin-top: 1rem;
`;

const BroadcastRow = styled.div<{ $status: DeliveryStatus }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
  border-left: 3px solid ${({ $status }) => (
    $status === 'healthy'
      ? 'var(--success, #4ade80)'
      : $status === 'failed'
        ? 'var(--danger, #f87171)'
        : $status === 'degraded'
          ? 'var(--warning, #facc15)'
          : 'var(--border-glow, #60c0f0)'
  )};
  border-radius: 8px;
  background: var(--surface-raised, rgba(9, 18, 38, 0.6));
  padding: 0.8rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const RowTitle = styled.div`
  color: var(--text-primary, #e0ecf4);
  font-weight: 800;
`;

const RowMeta = styled.div`
  margin-top: 0.25rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-size: 0.78rem;
`;

const StatusPill = styled.span`
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border-radius: 999px;
  background: var(--pill-surface, rgba(96, 192, 240, 0.12));
  color: var(--text-primary, #e0ecf4);
  padding: 0.35rem 0.65rem;
  font-size: 0.78rem;
  font-weight: 800;
`;

const InlineState = styled.div`
  margin-top: 1rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-size: 0.875rem;
`;

const AdminNotificationDeliveryHealth: React.FC = () => {
  const { authAxios } = useAuth();
  const [summary, setSummary] = useState<DeliverySummary>(EMPTY_SUMMARY);
  const [recentBroadcasts, setRecentBroadcasts] = useState<BroadcastDeliveryRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDeliveryHealth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authAxios.get('/api/admin/notifications/delivery-health');
      const data = response.data || {};
      if (data.success === false) throw new Error('Delivery health request failed');
      setSummary({ ...EMPTY_SUMMARY, ...(data.summary || {}) });
      setRecentBroadcasts(Array.isArray(data.recentBroadcasts) ? data.recentBroadcasts : []);
    } catch {
      setSummary(EMPTY_SUMMARY);
      setRecentBroadcasts([]);
      setError('Delivery health unavailable');
    } finally {
      setIsLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    void loadDeliveryHealth();
  }, [loadDeliveryHealth]);

  return (
    <Panel role="region" aria-label="Broadcast delivery health" aria-busy={isLoading}>
      <Header>
        <TitleGroup>
          <Title>
            <Send size={20} />
            Delivery Health
          </Title>
          <Subtitle>Admin broadcast attempts, delivered records, and failed recipient writes.</Subtitle>
        </TitleGroup>
        <RefreshButton type="button" onClick={loadDeliveryHealth} disabled={isLoading} aria-label="Refresh delivery health">
          <RefreshCw size={16} />
          Refresh
        </RefreshButton>
      </Header>

      {error && <InlineState role="alert">{error}</InlineState>}

      <Metrics>
        <Metric>
          <MetricValue>{summary.deliveryRate}%</MetricValue>
          <MetricLabel>Delivery rate</MetricLabel>
        </Metric>
        <Metric>
          <MetricValue>{summary.delivered}</MetricValue>
          <MetricLabel>{summary.delivered} delivered</MetricLabel>
        </Metric>
        <Metric>
          <MetricValue>{summary.failed}</MetricValue>
          <MetricLabel>{summary.failed} failed</MetricLabel>
        </Metric>
        <Metric>
          <MetricValue>{summary.broadcasts}</MetricValue>
          <MetricLabel>{statusLabel(summary.status)}</MetricLabel>
        </Metric>
      </Metrics>

      <RecentList>
        {recentBroadcasts.length > 0 ? recentBroadcasts.map((row) => (
          <BroadcastRow key={row.id} $status={row.status}>
            <div>
              <RowTitle>{row.title}</RowTitle>
              <RowMeta>{formatAudience(row)} - {formatCreatedAt(row.createdAt)}</RowMeta>
              <RowMeta>{row.delivery.created} delivered, {row.delivery.failed} failed, {row.delivery.attempted} attempted</RowMeta>
            </div>
            <StatusPill>
              {row.status === 'healthy' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              {statusLabel(row.status)}
            </StatusPill>
          </BroadcastRow>
        )) : (
          <InlineState>No admin broadcasts with delivery metadata yet.</InlineState>
        )}
      </RecentList>
    </Panel>
  );
};

export default AdminNotificationDeliveryHealth;
