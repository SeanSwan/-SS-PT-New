/**
 * ┌─── SUB-COMPONENT: PostReportsWidget ───────────────────────┐
 * │ PARENT: AdminOverviewPanel                                  │
 * │ PURPOSE: Displays pending user-submitted post reports with  │
 * │          priority badges & quick resolve/dismiss actions.    │
 * │ WIREFRAME:                                                  │
 * │ ┌────────────────────────────────────────────────────────┐  │
 * │ │ 🚩 Post Reports (3)                        [↻]        │  │
 * │ │ ─────────────────────────────────────────────────────  │  │
 * │ │ [●] Harassment — by John D. ▪ 2h ago         [HIGH]   │  │
 * │ │     "Reported: offensive comment..."                   │  │
 * │ │     [Resolve]  [Dismiss]                               │  │
 * │ │ ─────────────────────────────────────────────────────  │  │
 * │ │ View all (12) →                                        │  │
 * │ └────────────────────────────────────────────────────────┘  │
 * │ Props: none (fetches own data from admin API)               │
 * │ CLICK-OUTCOMES (SWA-138 S2 — now REAL, wired end-to-end):   │
 * │ [Resolve] -> PATCH /api/admin/content/reports/:id/resolve   │
 * │              (actionTaken: 'content-flagged' — the widget's │
 * │              quick action; heavier verdicts live on the     │
 * │              View All page) -> removes from list            │
 * │ [Dismiss] -> PATCH /api/admin/content/reports/:id/dismiss   │
 * │              -> removes from list                           │
 * │ [View All] -> navigates to /dashboard/admin/content         │
 * │ Shell: WidgetShell (S1) — loading/error/empty distinct,     │
 * │        60s poll, stale-after-failure, freshness, refresh.   │
 * │ GAMIFICATION: None                                          │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { Flag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../../context/AuthContext';
import { usePolledFetch, WidgetShell } from '../shell';

// ─────────────────────────────────────────────────────────────

interface PostReport {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  priority: string;
  createdAt: string;
  reporterName?: string;
  contentPreview?: string;
}

interface ReportsPayload {
  reports: PostReport[];
  totalPending: number;
}

type ReportPriorityStyle = { color: string; background: string; border: string };
const REPORT_ERROR = 'var(--error, #EF4444)';
const REPORT_WARNING = 'var(--warning, #F59E0B)';
const REPORT_PRIMARY = 'var(--accent-primary, #60C0F0)';
const REPORT_TEXT_PRIMARY = 'var(--text-primary, #E0ECF4)';
const REPORT_TEXT_MUTED = 'var(--text-muted, rgba(224, 236, 244, 0.55))';
const REPORT_SUCCESS = 'var(--success, #22C55E)';
const reportWash = (color: string, amount: number) => `color-mix(in srgb, ${color} ${amount}%, transparent)`;
const REPORT_PRIORITY_STYLES: Record<string, ReportPriorityStyle> = {
  urgent: { color: REPORT_ERROR, background: reportWash(REPORT_ERROR, 18), border: reportWash(REPORT_ERROR, 30) },
  high: { color: REPORT_WARNING, background: reportWash(REPORT_WARNING, 18), border: reportWash(REPORT_WARNING, 30) },
  medium: { color: REPORT_PRIMARY, background: reportWash(REPORT_PRIMARY, 14), border: reportWash(REPORT_PRIMARY, 24) },
  low: { color: REPORT_TEXT_MUTED, background: 'var(--surface-muted, rgba(255, 255, 255, 0.08))', border: 'var(--border-soft, rgba(255, 255, 255, 0.12))' },
};
const getPriorityStyle = (level: string) => REPORT_PRIORITY_STYLES[level] || REPORT_PRIORITY_STYLES.low;

const normalizeReport = (report: any): PostReport => ({
  id: String(report.id),
  reason: report.reason || 'other',
  description: report.description || null,
  status: report.status || 'pending',
  priority: report.priority || 'low',
  createdAt: report.createdAt || new Date().toISOString(),
  reporterName: report.reporterName
    ?? (report.reporter ? `${report.reporter.firstName ?? ''} ${report.reporter.lastName ?? ''}`.trim() : ''),
  contentPreview: report.contentPreview || report.contentSnippet || '',
});

const ReportItem = styled.div`
  padding: 12px 0;
  border-bottom: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.08));
  &:last-child { border-bottom: none; }
`;

const ReportHeader = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
`;

const ReasonLabel = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${REPORT_TEXT_PRIMARY};
  text-transform: capitalize;
`;

const ReporterInfo = styled.span`
  font-size: 0.8rem;
  color: ${REPORT_TEXT_MUTED};
`;

const PriorityBadge = styled.span<{ $level: string }>`
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${({ $level }) => getPriorityStyle($level).background};
  border: 1px solid ${({ $level }) => getPriorityStyle($level).border};
  color: ${({ $level }) => getPriorityStyle($level).color};
`;

const Snippet = styled.p`
  margin: 4px 0 8px;
  font-size: 0.8rem;
  color: ${REPORT_TEXT_MUTED};
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
`;

const ReportActionButton = styled.button<{ $tone: 'resolve' | 'dismiss' }>`
  min-height: 44px;
  padding: 0 16px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  color: ${({ $tone }) => ($tone === 'resolve' ? REPORT_SUCCESS : REPORT_TEXT_MUTED)};
  background: ${({ $tone }) => ($tone === 'resolve' ? reportWash(REPORT_SUCCESS, 12) : 'var(--surface-muted, rgba(255, 255, 255, 0.08))')};
  border: 1px solid ${({ $tone }) => ($tone === 'resolve' ? reportWash(REPORT_SUCCESS, 35) : 'var(--border-soft, rgba(255, 255, 255, 0.12))')};
  &:hover:not(:disabled) { filter: brightness(1.15); }
  &:focus-visible { outline: 2px solid var(--accent-secondary, #8B5CF6); outline-offset: 2px; }
  &:disabled { opacity: 0.55; cursor: default; }
`;

const RowError = styled.div`
  color: ${REPORT_ERROR};
  font-size: 0.75rem;
  margin-top: 6px;
`;

const ViewAllBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: ${REPORT_PRIMARY};
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
  min-height: 44px;
  margin-top: 8px;
  &:hover { background: ${reportWash(REPORT_PRIMARY, 8)}; }
  &:focus-visible { outline: 2px solid ${REPORT_PRIMARY}; outline-offset: 2px; }
`;

// ─────────────────────────────────────────────────────────────

const PostReportsWidget: React.FC = () => {
  const { authAxios } = useAuth();
  const navigate = useNavigate();
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [actingId, setActingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  const fetchReports = useCallback(async (): Promise<ReportsPayload> => {
    const res = await authAxios.get('/api/admin/content/reports', {
      params: { status: 'pending', limit: 5 },
    });
    const data = res.data?.data?.reports || res.data?.reports || [];
    const pendingReports = Array.isArray(data) ? data : [];
    return {
      reports: pendingReports.slice(0, 5).map(normalizeReport),
      totalPending:
        res.data?.data?.pagination?.total
        ?? res.data?.data?.summary?.pending
        ?? res.data?.total
        ?? res.data?.count
        ?? pendingReports.length,
    };
  }, [authAxios]);

  const { data, loading, refreshing, error, lastUpdated, refresh } =
    usePolledFetch<ReportsPayload>(fetchReports);

  const visibleReports = (data?.reports ?? []).filter(r => !removedIds.has(r.id));
  const totalPending = Math.max(0, (data?.totalPending ?? 0) - removedIds.size);

  const actOnReport = async (id: string, verb: 'resolve' | 'dismiss') => {
    setActingId(id);
    setRowError(null);
    try {
      const body = verb === 'resolve' ? { actionTaken: 'content-flagged' } : {};
      await authAxios.patch(`/api/admin/content/reports/${id}/${verb}`, body);
      setRemovedIds(prev => new Set(prev).add(id));
    } catch (err: any) {
      if (err?.response?.status === 409) {
        // Another admin already finalized it — drop the row, truth wins.
        setRemovedIds(prev => new Set(prev).add(id));
      } else {
        setRowError({ id, message: `Could not ${verb} the report — try again.` });
      }
    } finally {
      setActingId(null);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <WidgetShell
      title={totalPending > 0 ? `Post Reports (${totalPending})` : 'Post Reports'}
      icon={<Flag size={20} color={REPORT_ERROR} />}
      loading={loading}
      error={error ? 'Reports data unavailable' : null}
      empty={visibleReports.length === 0}
      emptyMessage="No pending reports"
      hasData={data !== null && visibleReports.length > 0}
      lastUpdated={lastUpdated}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {visibleReports.map(report => (
        <ReportItem key={report.id}>
          <ReportHeader>
            <div>
              <ReasonLabel>{report.reason.replace(/-/g, ' ')}</ReasonLabel>
              <ReporterInfo>
                {report.reporterName ? ` — by ${report.reporterName}` : ''}
                {' '}· {formatTimeAgo(report.createdAt)}
              </ReporterInfo>
            </div>
            <PriorityBadge $level={report.priority || 'low'}>
              {report.priority || 'low'}
            </PriorityBadge>
          </ReportHeader>

          {report.description && <Snippet>&quot;{report.description}&quot;</Snippet>}
          {report.contentPreview && <Snippet>{report.contentPreview}</Snippet>}

          <ActionRow>
            <ReportActionButton
              type="button"
              $tone="resolve"
              disabled={actingId === report.id}
              aria-label={`Resolve report: flags the reported content for follow-up`}
              onClick={() => actOnReport(report.id, 'resolve')}
            >
              Resolve
            </ReportActionButton>
            <ReportActionButton
              type="button"
              $tone="dismiss"
              disabled={actingId === report.id}
              aria-label="Dismiss report: no action needed"
              onClick={() => actOnReport(report.id, 'dismiss')}
            >
              Dismiss
            </ReportActionButton>
          </ActionRow>
          {rowError?.id === report.id && <RowError role="alert">{rowError.message}</RowError>}
        </ReportItem>
      ))}
      <ViewAllBtn onClick={() => navigate('/dashboard/admin/content')}>
        View all{totalPending > 0 ? ` (${totalPending})` : ''} →
      </ViewAllBtn>
    </WidgetShell>
  );
};

export default PostReportsWidget;
