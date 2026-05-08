/**
 * FILE: LeadPipelinePanel.tsx
 * BLUEPRINT: Revenue-focused lead queue for the Marketing command center.
 * DATA: Uses /api/leads and /api/leads/stats with existing admin/trainer RBAC.
 */

import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { RefreshCw, Target, Users } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import {
  MarketingCard, CardHeader, HeaderLeft, IconWrap, CardTitle, CardSubtitle,
  DataTable, EmptyState, ActionButton,
} from './marketing.styles';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'scheduled' | 'converted' | 'lost';

interface LeadRecord {
  id: number | string;
  firstName?: string;
  lastName?: string;
  email?: string;
  source?: string;
  status?: LeadStatus;
  score?: number;
  goals?: string;
  nextFollowUpAt?: string | null;
  createdAt?: string;
}

interface LeadStats {
  total: number;
  new: number;
  hotLeads: number;
  needsFollowUp: number;
  conversionRate: number;
}

const DEFAULT_STATS: LeadStats = {
  total: 0, new: 0, hotLeads: 0, needsFollowUp: 0, conversionRate: 0,
};

const Stack = styled.div`
  display: grid;
  gap: 20px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 860px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const StatValue = styled.div<{ $tone?: 'gold' | 'purple' }>`
  font-family: 'Fira Code', monospace;
  font-size: 28px;
  font-weight: 800;
  color: ${({ $tone }) =>
    $tone === 'gold'
      ? 'var(--accent-gold, #C6A84B)'
      : $tone === 'purple'
        ? 'var(--accent-secondary, #8B5CF6)'
        : 'var(--accent-primary, #60C0F0)'};
`;

const StatLabel = styled.div`
  margin-top: 4px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
`;

const TableScroll = styled.div`
  overflow-x: auto;
`;

const ContactBlock = styled.div`
  display: grid;
  gap: 3px;
`;

const ContactName = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

const ContactMeta = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.74));
`;

const StatusBadge = styled.span<{ $status: LeadStatus }>`
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 10px;
  border-radius: 6px;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  background: color-mix(
    in srgb,
    ${({ $status }) =>
      $status === 'converted'
        ? 'var(--success, #10B981)'
        : $status === 'lost'
          ? 'var(--danger, #EF4444)'
          : $status === 'scheduled'
            ? 'var(--accent-secondary, #8B5CF6)'
            : $status === 'qualified'
              ? 'var(--accent-gold, #C6A84B)'
              : 'var(--accent-primary, #60C0F0)'} 14%,
    transparent
  );
  color: ${({ $status }) =>
    $status === 'converted'
      ? 'var(--success, #10B981)'
      : $status === 'lost'
        ? 'var(--danger, #EF4444)'
        : $status === 'scheduled'
          ? 'var(--accent-secondary, #8B5CF6)'
          : $status === 'qualified'
            ? 'var(--accent-gold, #C6A84B)'
            : 'var(--accent-primary, #60C0F0)'};
`;

const ScoreText = styled.span<{ $hot: boolean }>`
  font-family: 'Fira Code', monospace;
  font-weight: 800;
  color: ${({ $hot }) => $hot ? 'var(--accent-gold, #C6A84B)' : 'var(--accent-primary, #60C0F0)'};
`;

const ErrorText = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--accent-gold, #C6A84B);
`;

const formatSource = (source?: string) =>
  source ? source.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()) : 'Unknown';

const getLeadName = (lead: LeadRecord) => {
  const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ').trim();
  return name || `Lead #${lead.id}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return 'No follow-up';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
};

const LeadPipelinePanel: React.FC = () => {
  const { authAxios } = useAuth();
  const [stats, setStats] = useState<LeadStats>(DEFAULT_STATS);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, leadsRes] = await Promise.all([
        authAxios.get('/api/leads/stats'),
        authAxios.get('/api/leads?limit=8&sortBy=createdAt&sortOrder=DESC'),
      ]);
      setStats({ ...DEFAULT_STATS, ...(statsRes.data?.stats || {}) });
      setLeads(Array.isArray(leadsRes.data?.leads) ? leadsRes.data.leads : []);
    } catch {
      setError('Lead pipeline is unavailable from this session.');
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchLeadData();
  }, [fetchLeadData]);

  return (
    <Stack>
      <StatsGrid>
        <MarketingCard>
          <StatValue>{stats.total}</StatValue>
          <StatLabel>Total leads</StatLabel>
        </MarketingCard>
        <MarketingCard>
          <StatValue>{stats.new}</StatValue>
          <StatLabel>New leads</StatLabel>
        </MarketingCard>
        <MarketingCard>
          <StatValue $tone="gold">{stats.hotLeads}</StatValue>
          <StatLabel>Hot leads</StatLabel>
        </MarketingCard>
        <MarketingCard>
          <StatValue $tone="purple">{stats.needsFollowUp}</StatValue>
          <StatLabel>Follow-ups due</StatLabel>
        </MarketingCard>
      </StatsGrid>

      <MarketingCard>
        <CardHeader>
          <HeaderLeft>
            <IconWrap>
              <Target size={18} />
            </IconWrap>
            <div>
              <CardTitle>Lead Pipeline</CardTitle>
              <CardSubtitle>Newest revenue opportunities from website, social, referrals, and gallery flows</CardSubtitle>
            </div>
          </HeaderLeft>
          <ActionButton type="button" $variant="secondary" onClick={fetchLeadData} disabled={loading}>
            <RefreshCw size={14} />
            Refresh
          </ActionButton>
        </CardHeader>

        {error ? (
          <ErrorText>{error}</ErrorText>
        ) : loading && leads.length === 0 ? (
          <EmptyState>
            <RefreshCw size={28} />
            Loading leads...
          </EmptyState>
        ) : leads.length === 0 ? (
          <EmptyState>
            <Users size={28} />
            No leads found for the current filters.
          </EmptyState>
        ) : (
          <TableScroll>
            <DataTable>
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Next follow-up</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const status = lead.status || 'new';
                  const score = lead.score || 0;
                  return (
                    <tr key={lead.id}>
                      <td>
                        <ContactBlock>
                          <ContactName>{getLeadName(lead)}</ContactName>
                          <ContactMeta>{lead.email || 'No email on file'}</ContactMeta>
                        </ContactBlock>
                      </td>
                      <td>{formatSource(lead.source)}</td>
                      <td><StatusBadge $status={status}>{status.replace(/_/g, ' ')}</StatusBadge></td>
                      <td><ScoreText $hot={score >= 70}>{score}</ScoreText></td>
                      <td>{formatDate(lead.nextFollowUpAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          </TableScroll>
        )}
      </MarketingCard>
    </Stack>
  );
};

export default LeadPipelinePanel;
