/**
 * ┌─── SUB-COMPONENT: PostReportsWidget ───────────────────────┐
 * │ PARENT: AdminOverviewPanel                                  │
 * │ PURPOSE: Displays pending user-submitted post reports with  │
 * │          priority badges & quick resolve/dismiss actions.    │
 * │ WIREFRAME:                                                  │
 * │ ┌────────────────────────────────────────────────────────┐  │
 * │ │ 🚩 Post Reports                     [View All →]      │  │
 * │ │ ─────────────────────────────────────────────────────  │  │
 * │ │ [●] Harassment — by John D. ▪ 2h ago         [HIGH]   │  │
 * │ │     "Reported: offensive comment..."                   │  │
 * │ │     [Resolve]  [Dismiss]                               │  │
 * │ │ ─────────────────────────────────────────────────────  │  │
 * │ │ [●] Spam — by Jane S. ▪ 5h ago               [MED]    │  │
 * │ │     "Reported: repeated promotional..."                │  │
 * │ │     [Resolve]  [Dismiss]                               │  │
 * │ └────────────────────────────────────────────────────────┘  │
 * │ Props: none (fetches own data from admin API)               │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Resolve] -> PATCH report status -> removes from list       │
 * │ [Dismiss] -> PATCH report status -> removes from list       │
 * │ [View All] -> navigates to /dashboard/content/moderation    │
 * │ GAMIFICATION: None                                          │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Flag, ChevronRight, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../../context/AuthContext';
import { StyledBox } from '@/components/ui/StyledBox';

// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────

interface PostReport {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  priority: string;
  createdAt: string;
  reporter?: { firstName: string; lastName: string };
  reporterName?: string;
  contentPreview?: string;
}

type ReportPriorityStyle = { color: string; background: string; border: string };
const REPORT_ERROR = 'var(--error, #EF4444)';
const REPORT_WARNING = 'var(--warning, #F59E0B)';
const REPORT_PRIMARY = 'var(--accent-primary, #60C0F0)';
const REPORT_TEXT_PRIMARY = 'var(--text-primary, #E0ECF4)';
const REPORT_TEXT_MUTED = 'var(--text-muted, rgba(224, 236, 244, 0.55))';
const reportWash = (color: string, amount: number) => `color-mix(in srgb, ${color} ${amount}%, transparent)`;
const REPORT_PRIORITY_STYLES: Record<string, ReportPriorityStyle> = {
  urgent: { color: REPORT_ERROR, background: reportWash(REPORT_ERROR, 18), border: reportWash(REPORT_ERROR, 30) },
  high: { color: REPORT_WARNING, background: reportWash(REPORT_WARNING, 18), border: reportWash(REPORT_WARNING, 30) },
  medium: { color: REPORT_PRIMARY, background: reportWash(REPORT_PRIMARY, 14), border: reportWash(REPORT_PRIMARY, 24) },
  low: { color: REPORT_TEXT_MUTED, background: 'var(--surface-muted, rgba(255, 255, 255, 0.08))', border: 'var(--border-soft, rgba(255, 255, 255, 0.12))' },
};
const getPriorityStyle = (level: string) => REPORT_PRIORITY_STYLES[level] || REPORT_PRIORITY_STYLES.low;

const normalizeReport = (report: any): PostReport => {
  const reporterName = report.reporterName
    ?? (report.reporter ? `${report.reporter.firstName ?? ''} ${report.reporter.lastName ?? ''}`.trim() : '');

  return {
    id: String(report.id),
    reason: report.reason || 'other',
    description: report.description || null,
    status: report.status || 'pending',
    priority: report.priority || 'low',
    createdAt: report.createdAt || new Date().toISOString(),
    reporter: reporterName ? {
      firstName: reporterName.split(' ')[0] || reporterName,
      lastName: reporterName.split(' ').slice(1).join(' ') || ' ',
    } : undefined,
    reporterName,
    contentPreview: report.contentPreview || report.contentSnippet || '',
  };
};

// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────

const Widget = styled.div`
  background: color-mix(in srgb, var(--royal-depth, #003080) 38%, transparent);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--error, #EF4444) 20%, transparent);
  padding: 20px;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${REPORT_TEXT_PRIMARY};
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

const Badge = styled.span`
  background: ${reportWash(REPORT_ERROR, 18)};
  color: ${REPORT_ERROR};
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
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
  &:hover { background: ${reportWash(REPORT_PRIMARY, 8)}; }
  &:focus-visible { outline: 2px solid ${REPORT_PRIMARY}; outline-offset: 2px; }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 24px 16px;
  color: ${REPORT_TEXT_MUTED};
  font-size: 0.9rem;
`;

const ReportItem = styled.div`
  padding: 12px 0;
  border-bottom: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.08));
  &:last-child { border-bottom: none; }
`;

const ReportHeader = styled.div`
  display: flex;
  align-items: center;
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

// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────

const PostReportsWidget: React.FC = () => {
  const { authAxios } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<PostReport[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoadError(null);
      const res = await authAxios.get('/api/admin/content/reports', {
        params: { status: 'pending', limit: 5 },
      });
      const data = res.data?.data?.reports || res.data?.reports || [];
      const pendingReports = Array.isArray(data) ? data : [];
      setReports(pendingReports.slice(0, 5).map(normalizeReport));
      setTotalPending(
        res.data?.data?.pagination?.total
          ?? res.data?.data?.summary?.pending
          ?? res.data?.total
          ?? res.data?.count
          ?? pendingReports.length
      );
    } catch (error) {
      console.error('Failed to load post reports:', error);
      setReports([]);
      setTotalPending(0);
      setLoadError('Reports data unavailable');
    }
  }, [authAxios]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <Widget>
      <Header>
        <TitleRow>
          <Flag size={20} color={REPORT_ERROR} />
          <Title>Post Reports</Title>
          {totalPending > 0 && <Badge>{totalPending}</Badge>}
        </TitleRow>
        <ViewAllBtn onClick={() => navigate('/dashboard/admin/content')}>
          View All <ChevronRight size={16} />
        </ViewAllBtn>
      </Header>

      {loadError ? (
        <EmptyState role="alert">
          <StyledBox as={AlertTriangle} size={24} $style={{ marginBottom: 8, opacity: 0.4 }} />
          <div>Reports data unavailable</div>
        </EmptyState>
      ) : reports.length === 0 ? (
        <EmptyState>
          <StyledBox as={AlertTriangle} size={24} $style={{ marginBottom: 8, opacity: 0.4 }} />
          <div>No pending reports</div>
        </EmptyState>
      ) : (
        reports.map(report => (
          <ReportItem key={report.id}>
            <ReportHeader>
              <div>
                <ReasonLabel>{report.reason.replace(/-/g, ' ')}</ReasonLabel>
                <ReporterInfo>
                  {report.reporterName
                    ? ` — by ${report.reporterName}`
                    : ''}
                  {' '}· {formatTimeAgo(report.createdAt)}
                </ReporterInfo>
              </div>
              <PriorityBadge $level={report.priority || 'low'}>
                {report.priority || 'low'}
              </PriorityBadge>
            </ReportHeader>

            {report.description && (
              <Snippet>&quot;{report.description}&quot;</Snippet>
            )}

            {report.contentPreview && (
              <Snippet>{report.contentPreview}</Snippet>
            )}
          </ReportItem>
        ))
      )}
    </Widget>
  );
};

export default PostReportsWidget;
