/**
 * FILE: AdminMessageReportQueue.tsx
 * PURPOSE: Admin moderation queue for reported client/trainer messages.
 * MOUNT: CommunicationCenter Moderation tab, itself mounted by EnhancedAdminClientManagementView.
 * DATA: Reads and resolves /api/messaging/admin/reports through authenticated authAxios.
 * UX: Shows open reports, reporter/sender context, message excerpt, and 44px action controls.
 * SAFETY: Admin-only API path; no email/private infrastructure fields are rendered.
 */
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';

type ModerationStatus = 'dismissed' | 'resolved';

interface ReportPerson {
  id?: number | string;
  firstName?: string;
  lastName?: string;
  username?: string;
  role?: string;
}

interface MessageReport {
  id: number | string;
  messageId?: number | string;
  conversationId?: number | string;
  reason?: string;
  details?: string;
  status?: string;
  createdAt?: string;
  messageExcerpt?: string;
  reporter?: ReportPerson | null;
  sender?: ReportPerson | null;
}

const personName = (person?: ReportPerson | null): string => {
  if (!person) return 'Unknown user';
  const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
  return fullName || person.username || `User ${person.id || 'unknown'}`;
};

const formatReason = (reason?: string): string => (
  reason
    ? reason.split(/[_\s-]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ')
    : 'General'
);

const formatCreatedAt = (value?: string): string => {
  if (!value) return 'No report time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No report time';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const moderationNote = (status: ModerationStatus): string => (
  status === 'resolved' ? 'Resolved in admin Communications Center' : 'Dismissed in admin Communications Center'
);

const Panel = styled.section`
  display: grid; gap: 1rem; padding: 1rem; border-radius: 8px;
  border: 1px solid var(--border-glow, rgba(96, 192, 240, 0.24));
  background: linear-gradient(135deg, var(--swan-panel, rgba(8, 20, 42, 0.94)), var(--swan-panel-deep, rgba(3, 8, 23, 0.96)));
  box-shadow: 0 18px 44px var(--shadow-deep, rgba(0, 0, 0, 0.28));
`;

const Header = styled.div`
  display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;
`;

const TitleGroup = styled.div`
  display: grid; gap: 0.35rem;
`;

const Title = styled.h3`
  display: inline-flex; align-items: center; gap: 0.55rem; margin: 0;
  color: var(--text-primary, #e0ecf4); font-size: 1rem; line-height: 1.25;
`;

const Subtitle = styled.p`
  margin: 0; color: var(--text-muted, rgba(224, 236, 244, 0.72)); font-size: 0.875rem;
`;

const RefreshButton = styled.button`
  min-height: 44px; display: inline-flex; align-items: center; gap: 0.45rem; cursor: pointer;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.24)); border-radius: 8px;
  background: var(--button-surface, rgba(12, 28, 56, 0.82)); color: var(--text-primary, #e0ecf4);
  padding: 0.65rem 0.9rem; font-weight: 800;
  &:focus-visible { outline: 2px solid var(--focus-ring, #8b5cf6); outline-offset: 2px; }
  &:disabled { cursor: wait; opacity: 0.7; }
`;

const ReportList = styled.div`
  display: grid; gap: 0.75rem;
`;

const ReportCard = styled.article`
  display: grid; gap: 0.8rem; padding: 0.9rem; border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.18)); border-left: 3px solid var(--warning, #facc15);
  background: var(--surface-raised, rgba(9, 18, 38, 0.68));
`;

const ReportHeader = styled.div`
  display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; flex-wrap: wrap;
`;

const Pill = styled.span`
  min-height: 32px; display: inline-flex; align-items: center; justify-content: center;
  border-radius: 999px; background: var(--warning-surface, rgba(250, 204, 21, 0.14));
  color: var(--warning-text, #fde68a); padding: 0.35rem 0.65rem; font-size: 0.78rem; font-weight: 900;
`;

const Meta = styled.div`
  color: var(--text-muted, rgba(224, 236, 244, 0.72)); font-size: 0.8rem;
`;

const Excerpt = styled.p`
  margin: 0; color: var(--text-primary, #e0ecf4); font-size: 0.95rem; line-height: 1.5;
`;

const DetailText = styled.p`
  margin: 0; color: var(--text-secondary, rgba(224, 236, 244, 0.8)); font-size: 0.85rem; line-height: 1.45;
`;

const ActionRow = styled.div`
  display: flex; gap: 0.65rem; flex-wrap: wrap;
`;

const ActionButton = styled.button<{ $tone: 'resolve' | 'dismiss' }>`
  min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem;
  border: 1px solid ${({ $tone }) => ($tone === 'resolve' ? 'var(--success-border, rgba(34, 197, 94, 0.45))' : 'var(--danger-border, rgba(248, 113, 113, 0.45))')};
  border-radius: 999px; background: ${({ $tone }) => ($tone === 'resolve' ? 'var(--success-surface, rgba(22, 101, 52, 0.18))' : 'var(--danger-surface, rgba(127, 29, 29, 0.18))')};
  color: ${({ $tone }) => ($tone === 'resolve' ? 'var(--success-text, #bbf7d0)' : 'var(--danger-text, #fecaca)')};
  padding: 0.6rem 0.9rem; font-weight: 900; cursor: pointer;
  &:focus-visible { outline: 2px solid var(--focus-ring, #8b5cf6); outline-offset: 2px; }
  &:disabled { cursor: wait; opacity: 0.6; }
`;

const InlineState = styled.div`
  min-height: 44px; display: flex; align-items: center; gap: 0.5rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.72)); font-size: 0.875rem;
`;

const AdminMessageReportQueue: React.FC = () => {
  const { authAxios } = useAuth();
  const [reports, setReports] = useState<MessageReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionReportId, setActionReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authAxios.get('/api/messaging/admin/reports?status=open&limit=25');
      if (response.data?.success === false) throw new Error('Message report request failed');
      setReports(Array.isArray(response.data?.reports) ? response.data.reports : []);
    } catch {
      setReports([]);
      setError('Message reports unavailable');
    } finally {
      setIsLoading(false);
    }
  }, [authAxios]);

  useEffect(() => { void loadReports(); }, [loadReports]);

  const moderateReport = async (report: MessageReport, status: ModerationStatus) => {
    setActionReportId(String(report.id));
    setError(null);
    try {
      await authAxios.patch(`/api/messaging/admin/reports/${report.id}`, {
        status,
        resolutionNote: moderationNote(status),
      });
      await loadReports();
    } catch {
      setError('Message report update failed');
    } finally {
      setActionReportId(null);
    }
  };

  return (
    <Panel role="region" aria-label="Message report queue" aria-busy={isLoading}>
      <Header>
        <TitleGroup>
          <Title><ShieldAlert size={20} aria-hidden="true" />Message Report Queue</Title>
          <Subtitle>Open safety and conduct reports from client-trainer conversations.</Subtitle>
        </TitleGroup>
        <RefreshButton type="button" onClick={loadReports} disabled={isLoading} aria-label="Refresh message reports">
          <RefreshCw size={16} aria-hidden="true" />Refresh
        </RefreshButton>
      </Header>
      {error && <InlineState role="alert"><AlertTriangle size={16} aria-hidden="true" />{error}</InlineState>}
      <ReportList>
        {reports.length > 0 ? reports.map((report) => (
          <ReportCard key={report.id}>
            <ReportHeader>
              <div>
                <Pill>{formatReason(report.reason)}</Pill>
                <Meta>Reported {formatCreatedAt(report.createdAt)} - Conversation {report.conversationId || 'unknown'}</Meta>
              </div>
              <Meta>Message {report.messageId || 'unknown'}</Meta>
            </ReportHeader>
            <Excerpt>{report.messageExcerpt || 'No message excerpt available.'}</Excerpt>
            {report.details && <DetailText>{report.details}</DetailText>}
            <Meta>Reporter: {personName(report.reporter)}{report.reporter?.role ? ` (${report.reporter.role})` : ''}</Meta>
            <Meta>Sender: {personName(report.sender)}{report.sender?.role ? ` (${report.sender.role})` : ''}</Meta>
            <ActionRow>
              <ActionButton type="button" $tone="resolve" disabled={actionReportId === String(report.id)} aria-label={`Resolve report ${report.id}`} onClick={() => void moderateReport(report, 'resolved')}>
                <CheckCircle2 size={16} aria-hidden="true" />Resolve
              </ActionButton>
              <ActionButton type="button" $tone="dismiss" disabled={actionReportId === String(report.id)} aria-label={`Dismiss report ${report.id}`} onClick={() => void moderateReport(report, 'dismissed')}>
                <XCircle size={16} aria-hidden="true" />Dismiss
              </ActionButton>
            </ActionRow>
          </ReportCard>
        )) : <InlineState>{isLoading ? 'Loading message reports' : 'No open message reports.'}</InlineState>}
      </ReportList>
    </Panel>
  );
};

export default AdminMessageReportQueue;