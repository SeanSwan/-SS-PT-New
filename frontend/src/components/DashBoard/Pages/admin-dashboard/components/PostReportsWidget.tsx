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
import { Flag, ChevronRight, Check, XCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

interface PostReport {
  id: number;
  reason: string;
  description: string | null;
  status: string;
  priority: string;
  createdAt: string;
  reporter?: { firstName: string; lastName: string };
  contentSnippet?: string;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const Widget = styled.div`
  background: rgba(0, 32, 96, 0.4);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(201, 42, 84, 0.2);
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
  color: #E0ECF4;
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

const Badge = styled.span`
  background: rgba(201, 42, 84, 0.2);
  color: #ef4444;
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
  color: #60C0F0;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
  min-height: 44px;
  &:hover { background: rgba(96, 192, 240, 0.08); }
  &:focus-visible { outline: 2px solid #60C0F0; outline-offset: 2px; }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 24px 16px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
`;

const ReportItem = styled.div`
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
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
  color: #E0ECF4;
  text-transform: capitalize;
`;

const ReporterInfo = styled.span`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
`;

const PriorityBadge = styled.span<{ $level: string }>`
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${props =>
    props.$level === 'urgent' ? 'rgba(239, 68, 68, 0.2)' :
    props.$level === 'high' ? 'rgba(245, 158, 11, 0.2)' :
    props.$level === 'medium' ? 'rgba(96, 192, 240, 0.15)' :
    'rgba(255, 255, 255, 0.08)'
  };
  color: ${props =>
    props.$level === 'urgent' ? '#ef4444' :
    props.$level === 'high' ? '#f59e0b' :
    props.$level === 'medium' ? '#60C0F0' :
    'rgba(255, 255, 255, 0.6)'
  };
`;

const Snippet = styled.p`
  margin: 4px 0 8px;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ActionRow = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionBtn = styled.button<{ $variant?: 'resolve' | 'dismiss' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 36px;
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s ease;
  border: 1px solid ${props => props.$variant === 'resolve' ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'};
  background: ${props => props.$variant === 'resolve' ? 'rgba(16,185,129,0.1)' : 'transparent'};
  color: ${props => props.$variant === 'resolve' ? '#10b981' : 'rgba(255,255,255,0.6)'};
  &:hover {
    background: ${props => props.$variant === 'resolve' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'};
  }
  &:focus-visible { outline: 2px solid #60C0F0; outline-offset: 2px; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const PostReportsWidget: React.FC = () => {
  const { authAxios } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<PostReport[]>([]);
  const [totalPending, setTotalPending] = useState(0);

  const fetchReports = useCallback(async () => {
    try {
      const res = await authAxios.get('/api/admin/content/reports', {
        params: { status: 'pending', limit: 5 },
      });
      const data = res.data?.reports || res.data?.data || [];
      setReports(Array.isArray(data) ? data.slice(0, 5) : []);
      setTotalPending(res.data?.total || res.data?.count || data.length || 0);
    } catch {
      // Admin endpoint may not exist yet — fail silently
      setReports([]);
      setTotalPending(0);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleAction = useCallback(async (reportId: number, action: 'resolved' | 'dismissed') => {
    try {
      await authAxios.post('/api/admin/content/moderate', {
        reportId,
        action: action === 'resolved' ? 'resolve' : 'dismiss',
      });
      setReports(prev => prev.filter(r => r.id !== reportId));
      setTotalPending(prev => Math.max(0, prev - 1));
    } catch {
      // Fallback: remove from UI anyway
      setReports(prev => prev.filter(r => r.id !== reportId));
    }
  }, [authAxios]);

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
          <Flag size={20} color="#ef4444" />
          <Title>Post Reports</Title>
          {totalPending > 0 && <Badge>{totalPending}</Badge>}
        </TitleRow>
        <ViewAllBtn onClick={() => navigate('/dashboard/content/moderation')}>
          View All <ChevronRight size={16} />
        </ViewAllBtn>
      </Header>

      {reports.length === 0 ? (
        <EmptyState>
          <AlertTriangle size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
          <div>No pending reports</div>
        </EmptyState>
      ) : (
        reports.map(report => (
          <ReportItem key={report.id}>
            <ReportHeader>
              <div>
                <ReasonLabel>{report.reason.replace(/-/g, ' ')}</ReasonLabel>
                <ReporterInfo>
                  {report.reporter
                    ? ` — by ${report.reporter.firstName} ${report.reporter.lastName[0]}.`
                    : ''}
                  {' '}· {formatTimeAgo(report.createdAt)}
                </ReporterInfo>
              </div>
              <PriorityBadge $level={report.priority || 'low'}>
                {report.priority || 'low'}
              </PriorityBadge>
            </ReportHeader>

            {report.description && (
              <Snippet>"{report.description}"</Snippet>
            )}

            <ActionRow>
              <ActionBtn
                $variant="resolve"
                onClick={() => handleAction(report.id, 'resolved')}
              >
                <Check size={14} /> Resolve
              </ActionBtn>
              <ActionBtn
                $variant="dismiss"
                onClick={() => handleAction(report.id, 'dismissed')}
              >
                <XCircle size={14} /> Dismiss
              </ActionBtn>
            </ActionRow>
          </ReportItem>
        ))
      )}
    </Widget>
  );
};

export default PostReportsWidget;
